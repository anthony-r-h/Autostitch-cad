;;; Compact OpenDCL palette. All drawing edits run in command-context events.
(vl-load-com)

(defun ast:ui-put (name property value)
  (dcl-Control-SetProperty "AUTOSTITCH" "Palette" name property value))

(defun ast:ui-status (message)
  (ast:ui-put "Status" "Caption" message)
  (princ (strcat "\nAutostitch: " message)))

(defun ast:ui-result (result)
  (if (cdr (assoc 'ok result)) T
    (progn
      (ast:ui-status (if (cdr (assoc 'error result))
        (cdr (assoc 'error result)) "The operation could not be completed."))
      nil)))

(defun ast:ui-limits-message ()
  (if (cdr (assoc 'closed astui:*route*))
    "The loop changed. Set its starting point again."
    "Set start or Set end again; choose WholeLine to reset both."))

(defun ast:ui-document-key (/ document)
  (setq document (vla-get-ActiveDocument (vlax-get-acad-object)))
  (strcat (vla-get-FullName document) "|" (vla-get-Name document)))

(defun ast:ui-sync-owner ()
  (if (or (not (equal (vl-bb-ref 'ASTUI-PALETTE-OWNER) (ast:ui-document-key)))
          (not (equal astui:*document* (vla-get-ActiveDocument (vlax-get-acad-object)))))
    (progn
      (setq astui:*guide* nil ast:*unit-factor* nil)
      (c:ASTUIINIT)
      (ast:ui-status "Select a stitch line in this drawing.")
      T)))

(defun ast:ui-run (action / result)
  (ast:ui-sync-owner)
  (setq result (vl-catch-all-apply
    '(lambda ()
      (if (or (not (member 'ast:load-events (atoms-family 0)))
              (ast:load-events (ast:home)))
        (apply action nil))) nil))
  (if (vl-catch-all-error-p result)
    (progn
      (setq astui:*last-error* (vl-catch-all-error-message result))
      (ast:ui-status (if (wcmatch (strcase astui:*last-error*) "*CANCEL*,*QUIT*")
        "Action cancelled."
        "Could not complete the action. Reselect the stitch line and try again."))))
  (princ))

(defun ast:ui-clear ()
  (if (and astui:*guide* (entget astui:*guide*)) (redraw astui:*guide* 4))
  (redraw)
  (setq astui:*state* nil astui:*guide* nil astui:*settings* nil astui:*landmarks* nil astui:*route* nil
        astui:*factor* nil astui:*placement-conflict* nil astui:*index* -1))

(defun ast:ui-ready (/ result draft dirty selected index astui:*defer-markers*)
  ;; Input writers update helpers in their own transaction; picks refresh explicitly.
  (setq astui:*defer-markers* T)
  (cond
    ((ast:ui-sync-owner) nil)
    ((or (not astui:*guide*) (not (entget astui:*guide*)))
      (ast:ui-status "Select a stitch line first.") nil)
    (T
      (setq result (ast:cad-read astui:*guide*))
      (if (ast:ui-result result)
        (progn
          (setq draft (dcl-Control-GetProperty "AUTOSTITCH" "Palette" "Pitch" "Text")
                dirty (not (equal draft astui:*pitch-text*))
                selected (if (>= astui:*index* 0) (nth astui:*index* astui:*landmarks*)))
          ;; Undo and external edits own persisted inputs; only an actual text draft survives.
          (ast:ui-adopt result)
          (if dirty (ast:ui-put "Pitch" "Text" draft))
          (if selected
            (progn
              (setq index (vl-position selected astui:*landmarks*)
                    astui:*index* (if index index -1))
              (dcl-ComboBox-SetCurSel "AUTOSTITCH" "Palette" "Landmarks" astui:*index*)
              (if (null index)
                (progn
                  (ast:ui-put "Delete" "Enabled" nil)
                  (ast:ui-status "Selected landmark changed. Select a landmark again.")))))
          T)))))

(defun ast:ui-native-refresh (/ active astui:*busy*)
  ;; Native edit notifications must never open or transfer the shared palette.
  (if (and (equal (vl-bb-ref 'ASTUI-PALETTE-OWNER) (ast:ui-document-key))
           (equal astui:*document* (vla-get-ActiveDocument (vlax-get-acad-object)))
           (member 'dcl-Form-IsActive (atoms-family 0)))
    (progn
      (setq active (vl-catch-all-apply 'dcl-Form-IsActive (list "AUTOSTITCH" "Palette")))
      (if (and (not (vl-catch-all-error-p active)) active)
        (progn
          (if astui:*guide*
            (if (not (entget astui:*guide*))
              (progn
                (ast:ui-clear) (ast:ui-fill)
                (ast:ui-status "Selected stitch line was erased. Select a stitch line."))
              (if (ast:ui-ready)
                (cond
                  ((cdr (assoc 'connection-conflict astui:*state*))
                    (ast:ui-status (cdr (assoc 'connection-conflict astui:*state*))))
                  ((cdr (assoc 'range-conflict astui:*state*))
                    (ast:ui-status (ast:ui-limits-message)))
                  (astui:*placement-conflict*
                    (ast:ui-status "Generate stitches to return them to the guide."))
                  ((null (cdr (assoc 'output astui:*state*)))
                    (ast:ui-status "Ready to generate stitches."))
                  ((cdr (assoc 'stale astui:*state*))
                    (ast:ui-status "Generate stitches to apply your changes."))
                  ((not (equal (distof (dcl-Control-GetProperty "AUTOSTITCH" "Palette" "Pitch" "Text") 2)
                               (cdr (assoc 'pitch astui:*settings*)) 1e-12))
                    (ast:ui-status "Generate stitches to apply the new pitch."))
                  (T (ast:ui-status "Stitches are up to date."))))))))))
  T)

(vl-acad-defun 'ast:ui-native-refresh)

(defun ast:ui-markers ()
  (if (and astui:*guide* (entget astui:*guide*))
    (progn
      (redraw astui:*guide* 3)
      (if astui:*defer-markers* T
        (ast:ui-result (ast:markers-ensure astui:*guide* astui:*settings*
          astui:*landmarks* astui:*factor* astui:*route*))))))

(defun ast:ui-fill (/ labels index attachment total start finish closed control)
  (setq astui:*busy* T labels nil index 0)
  (foreach attachment astui:*landmarks*
    (setq index (1+ index)
          labels (cons (strcat "Landmark " (itoa index)) labels)))
  (dcl-ComboBox-Clear "AUTOSTITCH" "Palette" "Landmarks")
  (if labels
    (progn
      (dcl-ComboBox-AddList "AUTOSTITCH" "Palette" "Landmarks" (reverse labels))
      (setq astui:*index* (max 0 (min astui:*index* (1- (length labels)))))
      (dcl-ComboBox-SetCurSel "AUTOSTITCH" "Palette" "Landmarks" astui:*index*))
    (progn
      (dcl-ComboBox-AddList "AUTOSTITCH" "Palette" "Landmarks" '("No landmarks"))
      (dcl-ComboBox-SetCurSel "AUTOSTITCH" "Palette" "Landmarks" 0)
      (setq astui:*index* -1)))
  (ast:ui-put "Landmarks" "Enabled" (if labels T nil))
  (ast:ui-put "Delete" "Enabled" (if labels T nil))
  (setq closed (cdr (assoc 'closed astui:*route*)))
  (ast:ui-put "Identity" "Caption" (if astui:*guide*
    (strcat "Stitch ID: " (ast:cad-stitch-id astui:*guide*)) ""))
  (ast:ui-put "Start" "Enabled" (if astui:*guide* T nil))
  (ast:ui-put "End" "Enabled" (if (and astui:*guide* (not closed)) T nil))
  (foreach control '("Add" "Generate" "Pitch" "Reverse" "Connect")
    (ast:ui-put control "Enabled" (if astui:*guide* T nil)))
  (ast:ui-put "Disconnect" "Enabled" (and astui:*guide*
    (or (cdr (assoc 'missing-members astui:*state*)) (> (length (cdr (assoc 'members astui:*state*))) 1))))
  (ast:ui-put "Disconnect" "Caption" (if (cdr (assoc 'missing-members astui:*state*))
    "Remove missing lines" "Disconnect line"))
  (if astui:*guide*
    (progn
      (setq total (* astui:*factor* (vlax-curve-getDistAtParam astui:*guide* (vlax-curve-getEndParam astui:*guide*)))
            start (if (assoc 'start astui:*settings*) (cdr (assoc 'start astui:*settings*)) 0.0)
            finish (if (assoc 'end astui:*settings*) (cdr (assoc 'end astui:*settings*)) total))
      (ast:ui-put "Seam" "Caption"
        (if (cdr (assoc 'range-conflict astui:*state*)) "Saved stitch limits need updating"
          (strcat "Stitch length: " (rtos (if closed total (- finish start)) 2 2) " mm"
            (if (and (not closed) (or (> start 1e-8) (< finish (- total 1e-8)))) " (part of line)" "")))))
    (ast:ui-put "Seam" "Caption" "No stitch line selected"))
  (setq astui:*busy* nil))

(defun ast:ui-adopt (result / markers-ready)
  (setq astui:*state* result astui:*guide* (cdr (assoc 'guide result))
        astui:*settings* (cdr (assoc 'settings result))
        astui:*route* (cdr (assoc 'route result))
        astui:*factor* (cdr (assoc 'factor result))
        astui:*placement-conflict* (cdr (assoc 'placement-conflict result))
        astui:*landmarks* (cdr (assoc 'landmarks result))
        astui:*index* -1)
  (if (= (getvar "INSUNITS") 0) (setq ast:*unit-factor* astui:*factor*))
  (setq astui:*pitch-text* (rtos (cdr (assoc 'pitch astui:*settings*)) 2 3))
  (ast:ui-put "Pitch" "Text" astui:*pitch-text*)
  (setq markers-ready (ast:ui-markers))
  (ast:ui-fill)
  markers-ready)

(defun ast:ui-pitch (/ value text)
  (setq text (dcl-Control-GetProperty "AUTOSTITCH" "Palette" "Pitch" "Text")
        value (if (equal text astui:*pitch-text*) (cdr (assoc 'pitch astui:*settings*)) (distof text 2)))
  (if (and value (> value 0.0)) value
    (progn (ast:ui-status "Pitch must be a positive number in mm.") nil)))

(defun ast:ui-save (settings landmarks / result text)
  (setq result (ast:cad-save-inputs astui:*guide* settings landmarks))
  (if (ast:ui-result result)
    (progn
      (setq astui:*settings* settings astui:*landmarks* landmarks
            astui:*last-pitch* (cdr (assoc 'pitch settings)))
      (setq text (dcl-Control-GetProperty "AUTOSTITCH" "Palette" "Pitch" "Text")
            astui:*pitch-text* (if (equal (distof text 2) (cdr (assoc 'pitch settings)) 1e-12)
              text (rtos (cdr (assoc 'pitch settings)) 2 3)))
      (ast:ui-fill) (ast:ui-markers)
      (ast:ui-status "Generate stitches to apply your changes.") T)))

(defun ast:ui-pick-point (prompt-text keywords / previous point)
  ;; Pattern endpoints/intersections are valid inputs, alongside our CEN/NODE markers.
  (setq previous (getvar "OSMODE"))
  (setvar "OSMODE" (logior (logand previous 16383) 47))
  (if keywords (initget keywords))
  (setq point (vl-catch-all-apply 'getpoint (list prompt-text)))
  (setvar "OSMODE" previous)
  (if (vl-catch-all-error-p point)
    (progn
      (setq astui:*last-error* (vl-catch-all-error-message point))
      (ast:ui-status (if (wcmatch (strcase astui:*last-error*) "*CANCEL*,*QUIT*")
        "Point selection cancelled." "Could not pick that point. Try again.")) nil)
    point))

(defun ast:ui-pick-landmark (/ point result)
  (if (ast:ui-markers)
    (progn
      (ast:ui-status "Pick a landmark on the pattern. Snap to an endpoint or intersection.")
      (setq point (ast:ui-pick-point "\nPick a point to add a landmark: " nil))
      (if point
        (progn
          (setq result (ast:cad-project astui:*guide* (trans point 1 0)))
          (if (assoc 'error result) (progn (ast:ui-result result) nil) result))
        (progn (ast:ui-status "No landmark added.") nil)))))

(defun ast:ui-global-station (attachment / index station primitive)
  (setq index 0 station (cdr (assoc 'station attachment)))
  (foreach primitive (cdr (assoc 'primitives astui:*route*))
    (if (< index (cdr (assoc 'primitive attachment)))
      (setq station (+ station (ast:g-length primitive))))
    (setq index (1+ index)))
  station)

(defun ast:ui-select-action (/ selected result choice phase helper-guide markers-ready)
  (setq selected (entsel "\nSelect a stitch line or its generated stitches: "))
  (if selected
    (progn
      (setq helper-guide (ast:markers-guide (car selected)))
      (if helper-guide (setq selected (cons helper-guide (cdr selected))))
      (setq result (ast:cad-read (car selected)))
      (if (and (= (getvar "INSUNITS") 0) (not ast:*unit-factor*)
               (equal (cdr (assoc 'error result)) "Set the drawing units to millimetres or inches, then select the line again."))
        (progn
          (initget 1 "Millimetres Inches")
          (setq choice (getkword "\nUnitless drawing: one drawing unit is [Millimetres/Inches]: ")
                ast:*unit-factor* (if (= choice "Inches") 25.4 1.0))
          (setq result (ast:cad-read (car selected)))))
      (if (ast:ui-result result)
        (progn
          (ast:ui-clear)
          (setq markers-ready (ast:ui-adopt result))
          (if (and (not (cdr (assoc 'settings (cdr (assoc 'record result))))) (numberp astui:*last-pitch*))
            (ast:ui-put "Pitch" "Text" (rtos astui:*last-pitch* 2 3)))
          (if markers-ready
          (if (and (cdr (assoc 'closed astui:*route*))
                   (not (assoc 'phase astui:*settings*)))
            (progn
              (setq phase (ast:cad-project astui:*guide* (trans (cadr selected) 1 0)))
              (if (ast:ui-save (ast:cad-put 'phase-anchor
                    (append phase (list (cons 'source-route astui:*route*)))
                    (ast:cad-put 'phase (ast:ui-global-station phase) astui:*settings*)) astui:*landmarks*)
                (ast:ui-status "Loop starts at your selected point. Generate stitches to apply it.")))
            (ast:ui-status (cond
              ((cdr (assoc 'connection-conflict result)) (cdr (assoc 'connection-conflict result)))
              ((cdr (assoc 'range-conflict result)) (ast:ui-limits-message))
              ((and (cdr (assoc 'output result)) (cdr (assoc 'stale result)))
                "Generate stitches to apply your changes.")
              (T "Ready to generate stitches."))))))))
    (ast:ui-status "Selection unchanged.")))

(defun c:ASTUISELECT () (ast:ui-run 'ast:ui-select-action))

(defun c:ASTUIADD ()
  (ast:ui-run '(lambda (/ pitch attachment)
    (if (and (ast:ui-ready) (setq pitch (ast:ui-pitch)) (setq attachment (ast:ui-pick-landmark)))
      (progn
        (setq astui:*index* (length astui:*landmarks*))
        (ast:ui-save (ast:cad-put 'pitch pitch astui:*settings*)
          (append astui:*landmarks* (list attachment))))))))

(defun c:ASTUILANDMARK (index value)
  (if (not astui:*busy*)
    (progn
      (setq astui:*index* index)
      (ast:ui-put "Delete" "Enabled" (>= index 0))))
  (princ))

(defun c:ASTUIDELETE ()
  (ast:ui-run '(lambda (/ index kept attachment)
    (if (and (ast:ui-ready) (>= astui:*index* 0))
      (if (not (ast:cad-attachments-valid-p astui:*state* astui:*landmarks*))
        (progn
          (initget "ClearAll Cancel")
          (if (equal (getkword "\nThe line changed. Remove all landmarks and add them again [ClearAll/Cancel] <Cancel>: ") "ClearAll")
            (ast:ui-save astui:*settings* nil)
            (ast:ui-status "Landmarks kept. Remove them before adding replacements.")))
        (progn
          (setq index 0 kept nil)
          (foreach attachment astui:*landmarks*
            (if (/= index astui:*index*) (setq kept (cons attachment kept)))
            (setq index (1+ index)))
          (ast:ui-save astui:*settings* (reverse kept))))))))

(defun c:ASTUIREVERSE ()
  (ast:ui-run '(lambda ()
    (if (ast:ui-ready)
      (ast:ui-save (ast:cad-put 'reverse (not (cdr (assoc 'reverse astui:*settings*)))
        astui:*settings*) astui:*landmarks*)))))

(defun ast:ui-range-save (key point pitch / anchor-key settings attachment station total lower upper)
  (if (and (cdr (assoc 'closed astui:*route*)) (= key 'end))
    (progn (ast:ui-status "A closed loop has a start, but no end.") nil)
    (progn
      (if (cdr (assoc 'closed astui:*route*))
        (setq key 'phase)
        (if (cdr (assoc 'reverse astui:*settings*))
          (setq key (if (= key 'start) 'end 'start))))
      (setq anchor-key (read (strcat (vl-symbol-name key) "-ANCHOR"))
            settings (ast:cad-put 'pitch pitch astui:*settings*))
      ;; A former open guide may retain obsolete endpoint limits after closure.
      (if (= key 'phase)
        (setq settings (vl-remove-if '(lambda (item)
          (member (car item) '(start end start-anchor end-anchor))) settings)))
      (cond
        ((equal point "WholeLine")
          (setq settings (vl-remove-if '(lambda (item)
            (member (car item) '(start end start-anchor end-anchor))) settings))
          (ast:ui-save settings astui:*landmarks*))
        ((equal point "Default")
          (setq settings (vl-remove-if '(lambda (item) (member (car item) (list key anchor-key))) settings))
          (if (= key 'phase) (setq settings (ast:cad-put 'phase 0.0 settings)))
          (ast:ui-save settings astui:*landmarks*))
        ((and (listp point) point)
          (setq attachment (ast:cad-project astui:*guide* (trans point 1 0)))
          (if (assoc 'error attachment) (ast:ui-result attachment)
            (progn
              (setq station (ast:ui-global-station attachment)
                    settings (ast:cad-put anchor-key
                      (append attachment (list (cons 'source-route astui:*route*)))
                      (ast:cad-put key station settings))
                    total (* astui:*factor*
                      (vlax-curve-getDistAtParam astui:*guide* (vlax-curve-getEndParam astui:*guide*)))
                    lower (if (assoc 'start settings) (cdr (assoc 'start settings)) 0.0)
                    upper (if (assoc 'end settings) (cdr (assoc 'end settings)) total))
              (if (and (/= key 'phase) (>= lower upper))
                (progn (ast:ui-status "Start and end cannot cross. Pick within the remaining line.") nil)
                (ast:ui-save settings astui:*landmarks*)))))
        (T (ast:ui-status "Stitch limits unchanged.") nil)))))

(defun ast:ui-range-pick (key / pitch label options point)
  (if (and (ast:ui-ready) (setq pitch (ast:ui-pitch))
           (or (= key 'start) (not (cdr (assoc 'closed astui:*route*))))
           (ast:ui-markers))
    (progn
      (setq label (if (= key 'start) "start" "end")
            options (if (cdr (assoc 'closed astui:*route*)) "Default" "Default WholeLine"))
      (ast:ui-status (strcat "Pick where stitching should " (if (= key 'start) "begin." "end.")))
      (setq point (ast:ui-pick-point (strcat "\nPick " label " on the guide ["
        (if (cdr (assoc 'closed astui:*route*)) "Default" "Default/WholeLine") "]: ") options))
      (ast:ui-range-save key point pitch))))

(defun c:ASTUISTART ()
  (ast:ui-run '(lambda () (ast:ui-range-pick 'start))))

(defun c:ASTUIEND ()
  (ast:ui-run '(lambda () (ast:ui-range-pick 'end))))

(defun c:ASTUICONNECT ()
  (ast:ui-run '(lambda (/ selected other pitch preview count choice result)
    (if (and (ast:ui-ready) (setq pitch (ast:ui-pitch)))
      (progn
        (ast:ui-status "Select another stitch line to coordinate their stitching.")
        (setq selected (entsel "\nSelect the other stitch line or its generated stitches: "))
        (if selected
          (progn
            (setq other (if (ast:markers-guide (car selected))
              (ast:markers-guide (car selected)) (car selected))
                  preview (ast:cad-connect-preview astui:*guide* other))
            (if (ast:ui-result preview)
              (progn
                (setq count (cdr (assoc 'count preview)) choice nil)
                (cond
                  ((= count 0) (ast:ui-status "These stitch lines have no new intersections to connect."))
                  ((= count 1) (setq choice "ConnectAll"))
                  (T
                    (ast:ui-status (strcat (itoa count) " intersections found. Connect all to coordinate them."))
                    (initget "ConnectAll Cancel")
                    (setq choice (getkword (strcat "\nConnect all " (itoa count)
                      " intersections? [ConnectAll/Cancel] <Cancel>: ")))))
                (if (equal choice "ConnectAll")
                  (progn
                    (setq result (ast:cad-connect astui:*guide* other nil
                      (ast:cad-put 'pitch pitch astui:*settings*) astui:*landmarks*))
                    (if (ast:ui-result result)
                      (progn
                        (ast:ui-adopt (ast:cad-read astui:*guide*))
                        (ast:ui-status "Stitch lines connected. Stitches updated."))))
                  (if (> count 0) (ast:ui-status "Connection cancelled. Stitch lines retained."))))))
          (ast:ui-status "Connection cancelled. Stitch lines retained.")))))))

(defun c:ASTUIDISCONNECT ()
  (ast:ui-run '(lambda (/ result repairing)
    (if (ast:ui-ready)
      (progn
        (setq repairing (cdr (assoc 'missing-members astui:*state*)))
        (setq result (ast:cad-disconnect astui:*guide*))
        (if (ast:ui-result result)
          (progn
            (ast:ui-adopt (ast:cad-read astui:*guide*))
            (ast:ui-status (if repairing "Missing stitch lines removed. Stitches updated."
              "Selected stitch line disconnected. Stitches updated.")))))))))

(defun ast:ui-generate (/ pitch settings result state)
  (if (and (ast:ui-ready) (setq pitch (ast:ui-pitch)))
    (progn
      (setq settings (ast:cad-put 'pitch pitch astui:*settings*)
            result (if astui:*placement-conflict*
              (ast:cad-restore astui:*guide* settings astui:*landmarks*)
              (ast:cad-generate astui:*guide* settings astui:*landmarks*)))
      (if (ast:ui-result result)
        (progn
          (setq state (ast:cad-read astui:*guide*))
          (if (ast:ui-result state)
            (progn
              (ast:ui-adopt state)
              (setq astui:*last-pitch* pitch)
              (ast:ui-status "Stitches generated."))))))))

(defun c:ASTUIGENERATE ()
  (ast:ui-run 'ast:ui-generate))

(defun c:ASTUIINIT ()
  (setq astui:*document* (vla-get-ActiveDocument (vlax-get-acad-object)))
  (ast:ui-clear) (ast:ui-fill)
  (setq astui:*pitch-text* "3")
  (ast:ui-put "Pitch" "Text" astui:*pitch-text*)
  (vl-bb-set 'ASTUI-PALETTE-OWNER (ast:ui-document-key))
  (ast:ui-status "Select a stitch line or its generated stitches.")
  (princ))

(defun c:ASTUICLOSE (reason)
  (ast:ui-clear)
  nil)

(defun ast:ui-open (/ path loaded document state)
  (vl-catch-all-apply 'vl-cmdf (list "_OPENDCL"))
  ;; Loading an existing project without ForceReload preserves its palette.
  ;; Querying an unloaded form first raises an OpenDCL modal runtime error.
  (setq path (findfile (strcat ast:*home* "/AUTOSTITCH.odcl")))
  (if path
    (progn
      (setq loaded (vl-catch-all-apply 'dcl-Project-Load (list path nil "AUTOSTITCH")))
      (if (or (vl-catch-all-error-p loaded) (not loaded))
        (progn
          (setq loaded nil)
          (princ "\nAutostitch: Could not load the OpenDCL palette."))))
    (princ "\nAutostitch: AUTOSTITCH.odcl is missing beside AUTOSTITCH.lsp."))
  (if loaded
    (progn
      (setq document (vla-get-ActiveDocument (vlax-get-acad-object)))
      (if (not (equal astui:*document* document))
        (setq astui:*guide* nil ast:*unit-factor* nil))
      (dcl-Form-Show "AUTOSTITCH" "Palette")
      ;; OpenDCL shares displayed controls while each document owns its LISP state.
      (if (and astui:*guide* (entget astui:*guide*))
        (progn
          (setq state (ast:cad-read astui:*guide*))
          (if (cdr (assoc 'ok state))
            (if (ast:ui-adopt state)
              (ast:ui-status (cond
                ((cdr (assoc 'connection-conflict state)) (cdr (assoc 'connection-conflict state)))
                ((cdr (assoc 'range-conflict state)) (ast:ui-limits-message))
                ((cdr (assoc 'stale state)) "Generate stitches to apply your changes.")
                (T "Stitch line loaded."))))
            (progn (c:ASTUIINIT) (ast:ui-result state))))
        (c:ASTUIINIT))
      (vl-bb-set 'ASTUI-PALETTE-OWNER (ast:ui-document-key))))
  (if loaded T nil))

(princ)
