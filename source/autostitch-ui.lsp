;;; Compact OpenDCL palette. All drawing edits run in command-context events.
(vl-load-com)

(defun ast:ui-put (name property value)
  (dcl-Control-SetProperty "AUTOSTITCH" "Palette" name property value))

(defun ast:ui-status (message)
  (ast:ui-put "Status" "Caption" message)
  (princ (strcat "\nAutostitch: " message)))

(defun ast:ui-set (key value values / pair)
  (if (setq pair (assoc key values))
    (subst (cons key value) pair values)
    (cons (cons key value) values)))

(defun ast:ui-result (result)
  (if (cdr (assoc 'ok result)) T
    (progn
      (ast:ui-status (if (cdr (assoc 'error result))
        (cdr (assoc 'error result)) "The operation could not be completed."))
      nil)))

(defun ast:ui-document-key (/ document)
  (setq document (vla-get-ActiveDocument (vlax-get-acad-object)))
  (strcat (vla-get-FullName document) "|" (vla-get-Name document)))

(defun ast:ui-sync-owner ()
  (if (or (not (equal (vl-bb-ref 'ASTUI-PALETTE-OWNER) (ast:ui-document-key)))
          (not (equal astui:*document* (vla-get-ActiveDocument (vlax-get-acad-object)))))
    (progn
      (setq astui:*guide* nil ast:*unit-factor* nil)
      (c:ASTUIINIT)
      (ast:ui-status "Drawing changed. Select a guide in this drawing.")
      T)))

(defun ast:ui-run (action / result)
  (ast:ui-sync-owner)
  (setq result (vl-catch-all-apply action nil))
  (if (vl-catch-all-error-p result)
    (ast:ui-status (vl-catch-all-error-message result)))
  (princ))

(defun ast:ui-clear ()
  (if (and astui:*guide* (entget astui:*guide*)) (redraw astui:*guide* 4))
  (redraw)
  (setq astui:*guide* nil astui:*settings* nil astui:*landmarks* nil astui:*route* nil
        astui:*factor* nil astui:*placement-conflict* nil astui:*index* -1))

(defun ast:ui-ready (/ result draft dirty selected index)
  (cond
    ((ast:ui-sync-owner) nil)
    ((or (not astui:*guide*) (not (entget astui:*guide*)))
      (ast:ui-status "Select a guide first.") nil)
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
                  (ast:ui-put "Move" "Enabled" nil)
                  (ast:ui-put "Delete" "Enabled" nil)
                  (ast:ui-status "Selected landmark changed. Select a landmark again.")))))
          T)))))

(defun ast:ui-mark (point color / size centre)
  ;; Screen-sized transient crosses, never cut entities.
  (setq size (/ (getvar "VIEWSIZE") 90.0) centre (trans point 0 1))
  (grdraw (mapcar '+ centre (list (- size) 0.0 0.0))
    (mapcar '+ centre (list size 0.0 0.0)) color 1)
  (grdraw (mapcar '+ centre (list 0.0 (- size) 0.0))
    (mapcar '+ centre (list 0.0 size 0.0)) color 1))

(defun ast:ui-landmark-point (attachment / primitive parameter station maximum boundary)
  (setq primitive (cdr (assoc 'primitive attachment))
        parameter (if (= (cdr (assoc 0 (entget astui:*guide*))) "LWPOLYLINE")
          primitive (vlax-curve-getStartParam astui:*guide*))
        maximum (vlax-curve-getEndParam astui:*guide*))
  (if (and (>= parameter (vlax-curve-getStartParam astui:*guide*)) (< parameter maximum))
    (progn
      (setq boundary (if (= (cdr (assoc 0 (entget astui:*guide*))) "LWPOLYLINE")
                       (min maximum (1+ parameter)) maximum)
            station (+ (vlax-curve-getDistAtParam astui:*guide* parameter)
        (/ (cdr (assoc 'station attachment)) astui:*factor*)))
      (if (and (>= (cdr (assoc 'station attachment)) 0.0)
               (<= station (vlax-curve-getDistAtParam astui:*guide* boundary)))
        (vlax-curve-getPointAtDist astui:*guide* station)))))

(defun ast:ui-junctions (/ range normalized primitives index incoming outgoing point centre size corners color corner)
  (setq range (ast:g-range (cdr (assoc 'primitives astui:*route*)) nil astui:*settings*
    (cdr (assoc 'closed astui:*route*))))
  (if (cdr (assoc 'ok range))
    (progn
      (setq normalized (ast:g-normalize (cdr (assoc 'primitives range)) nil
              (cdr (assoc 'reverse astui:*settings*)))
            primitives (cdr (assoc 'primitives normalized)) index 0
            size (/ (getvar "VIEWSIZE") 160.0))
      (repeat (if (and (cdr (assoc 'closed astui:*route*)) (> (length primitives) 1))
        (length primitives) (max 0 (1- (length primitives))))
        (setq incoming (nth index primitives)
              outgoing (nth (rem (1+ index) (length primitives)) primitives)
              point (ast:g-point incoming (ast:g-length incoming))
              centre (trans (list (/ (car point) astui:*factor*) (/ (cadr point) astui:*factor*) 0.0) 0 1)
              color 8)
        (if (not (and (> (ast:g-dot (ast:g-tangent incoming (ast:g-length incoming)) (ast:g-tangent outgoing 0.0)) 0.0)
                      (< (abs (ast:g-cross (ast:g-tangent incoming (ast:g-length incoming)) (ast:g-tangent outgoing 0.0))) 1e-10)))
          (progn
            (setq corner (ast:g-corner incoming outgoing astui:*settings*))
            (setq color (if (cdr (assoc 'ok corner)) 6 1))))
        (setq corners (list (polar centre 0.0 size) (polar centre (/ pi 2) size)
          (polar centre pi size) (polar centre (* pi 1.5) size) (polar centre 0.0 size)))
        (while (cdr corners)
          (grdraw (car corners) (cadr corners) color 1)
          (setq corners (cdr corners)))
        (setq index (1+ index))))))

(defun ast:ui-markers (/ first last total middle direction tip left right size point attachment start finish phase factor closed reverse-direction)
  (redraw)
  (if (and astui:*guide* (entget astui:*guide*))
    (progn
      (redraw astui:*guide* 3)
      (setq total (vlax-curve-getDistAtParam astui:*guide* (vlax-curve-getEndParam astui:*guide*))
            factor astui:*factor*
            closed (cdr (assoc 'closed astui:*route*))
            reverse-direction (cdr (assoc 'reverse astui:*settings*))
            start (if (assoc 'start astui:*settings*) (/ (cdr (assoc 'start astui:*settings*)) factor) 0.0)
            finish (if (assoc 'end astui:*settings*) (/ (cdr (assoc 'end astui:*settings*)) factor) total)
            phase (if (assoc 'phase astui:*settings*) (/ (cdr (assoc 'phase astui:*settings*)) factor) 0.0))
      (if closed (setq start phase finish phase))
      (setq first (vlax-curve-getPointAtDist astui:*guide* start)
            last (vlax-curve-getPointAtDist astui:*guide* finish))
      (if first (ast:ui-mark first (if reverse-direction 1 3)))
      (if (and last (not closed)) (ast:ui-mark last (if reverse-direction 3 1)))
      (if (and (> total 0.0) (>= start 0.0) (<= finish total) (<= start finish))
        (progn
          (setq middle (vlax-curve-getPointAtDist astui:*guide*
                  (if closed (rem (+ phase (* total 0.08)) total) (/ (+ start finish) 2.0)))
                direction (vlax-curve-getFirstDeriv astui:*guide*
                  (vlax-curve-getParamAtPoint astui:*guide* middle))
                direction (angle '(0.0 0.0 0.0) (trans direction 0 1 T))
                middle (trans middle 0 1)
                size (/ (getvar "VIEWSIZE") 45.0))
          (if reverse-direction (setq direction (+ direction pi)))
          (setq tip (polar middle direction size)
                left (polar tip (+ direction 2.65) (* size 0.45))
                right (polar tip (- direction 2.65) (* size 0.45)))
          (grdraw middle tip 2 1) (grdraw tip left 2 1) (grdraw tip right 2 1)))
      (foreach attachment astui:*landmarks*
        (if (setq point (ast:ui-landmark-point attachment)) (ast:ui-mark point 4)))
      (ast:ui-junctions))))

(defun ast:ui-fill (/ labels index attachment)
  (setq astui:*busy* T labels nil index 0)
  (foreach attachment astui:*landmarks*
    (setq index (1+ index)
          labels (cons (strcat (itoa index) ": segment "
            (itoa (1+ (cdr (assoc 'primitive attachment)))) " + "
            (rtos (cdr (assoc 'station attachment)) 2 2) " mm") labels)))
  (dcl-ComboBox-Clear "AUTOSTITCH" "Palette" "Landmarks")
  (if labels
    (progn
      (dcl-ComboBox-AddList "AUTOSTITCH" "Palette" "Landmarks" (reverse labels))
      (setq astui:*index* (max 0 (min astui:*index* (1- (length labels)))))
      (dcl-ComboBox-SetCurSel "AUTOSTITCH" "Palette" "Landmarks" astui:*index*))
    (setq astui:*index* -1))
  (ast:ui-put "Move" "Enabled" (if labels T nil))
  (ast:ui-put "Delete" "Enabled" (if labels T nil))
  (ast:ui-put "Restore" "Enabled" (if astui:*placement-conflict* T nil))
  (ast:ui-put "Seam" "Caption" (if astui:*guide*
    (strcat "Guide " (cdr (assoc 5 (entget astui:*guide*))) "  |  "
      (itoa (length astui:*landmarks*)) " landmarks") "No guide selected"))
  (ast:ui-put "Reverse" "Caption" (if (cdr (assoc 'reverse astui:*settings*)) "Reversed" "Reverse"))
  (ast:ui-put "Start" "Caption" (if (cdr (assoc 'closed astui:*route*)) "Phase" "Start"))
  (ast:ui-put "Start" "Enabled" (if astui:*guide* T nil))
  (ast:ui-put "End" "Enabled" (and astui:*guide*
    (not (cdr (assoc 'closed astui:*route*)))))
  (setq astui:*busy* nil))

(defun ast:ui-adopt (result)
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
  (ast:ui-fill)
  (ast:ui-markers))

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
      (ast:ui-status "Inputs saved. Generate to update cuts.") T)))

(defun ast:ui-pick-landmark (/ point result)
  (setq point (getpoint "\nPick landmark on the guide: "))
  (if point
    (progn
      (setq result (ast:cad-project astui:*guide* (trans point 1 0)))
      (if (assoc 'error result) (progn (ast:ui-result result) nil) result))
    (progn (ast:ui-status "Landmark pick cancelled.") nil)))

(defun ast:ui-global-station (attachment / index station primitive)
  (setq index 0 station (cdr (assoc 'station attachment)))
  (foreach primitive (cdr (assoc 'primitives astui:*route*))
    (if (< index (cdr (assoc 'primitive attachment)))
      (setq station (+ station (ast:g-length primitive))))
    (setq index (1+ index)))
  station)

(defun ast:ui-select-action (/ selected result choice phase)
  (setq selected (entsel "\nSelect a guide or generated Autostitch seam: "))
  (if selected
    (progn
      (setq result (ast:cad-read (car selected)))
      (if (and (= (getvar "INSUNITS") 0) (not ast:*unit-factor*)
               (equal (cdr (assoc 'error result)) "Set drawing INSUNITS or explicitly choose millimetres per drawing unit."))
        (progn
          (initget 1 "Millimetres Inches")
          (setq choice (getkword "\nUnitless drawing: one drawing unit is [Millimetres/Inches]: ")
                ast:*unit-factor* (if (= choice "Inches") 25.4 1.0))
          (setq result (ast:cad-read (car selected)))))
      (if (ast:ui-result result)
        (progn
          (ast:ui-clear)
          (ast:ui-adopt result)
          (if (and (not (cdr (assoc 'record result))) (numberp astui:*last-pitch*))
            (ast:ui-put "Pitch" "Text" (rtos astui:*last-pitch* 2 3)))
          (if (and (cdr (assoc 'closed astui:*route*))
                   (not (assoc 'phase astui:*settings*)))
            (progn
              (setq phase (ast:cad-project astui:*guide* (trans (cadr selected) 1 0)))
              (if (ast:ui-save (ast:ui-set 'phase-anchor
                    (append phase (list (cons 'source-route astui:*route*)))
                    (ast:ui-set 'phase (ast:ui-global-station phase) astui:*settings*)) astui:*landmarks*)
                (ast:ui-status "Start phase set at your pick. Generate when ready.")))
            (ast:ui-status (cond
              ((cdr (assoc 'range-conflict result)) (cdr (assoc 'range-conflict result)))
              ((and (cdr (assoc 'output result)) (cdr (assoc 'stale result)))
                "Inputs or guide changed. Generate to update cuts.")
              (T "Guide selected. Add landmarks or Generate.")))))))
    (ast:ui-status "Selection cancelled. Previous guide retained.")))

(defun c:ASTUISELECT () (ast:ui-run 'ast:ui-select-action))

(defun c:ASTUIPITCH ()
  (ast:ui-run '(lambda (/ pitch)
    (if (and (ast:ui-ready) (setq pitch (ast:ui-pitch)))
      (ast:ui-save (ast:ui-set 'pitch pitch astui:*settings*) astui:*landmarks*)))))

(defun c:ASTUIADD ()
  (ast:ui-run '(lambda (/ pitch attachment)
    (if (and (ast:ui-ready) (setq pitch (ast:ui-pitch)) (setq attachment (ast:ui-pick-landmark)))
      (progn
        (setq astui:*index* (length astui:*landmarks*))
        (ast:ui-save (ast:ui-set 'pitch pitch astui:*settings*)
          (append astui:*landmarks* (list attachment))))))))

(defun c:ASTUILANDMARK (index value)
  (if (not astui:*busy*)
    (progn
      (setq astui:*index* index)
      (ast:ui-put "Move" "Enabled" (>= index 0))
      (ast:ui-put "Delete" "Enabled" (>= index 0))))
  (princ))

(defun c:ASTUIMOVE ()
  (ast:ui-run '(lambda (/ attachment)
    (if (and (ast:ui-ready) (>= astui:*index* 0) (setq attachment (ast:ui-pick-landmark)))
      (ast:ui-save astui:*settings*
        (subst attachment (nth astui:*index* astui:*landmarks*) astui:*landmarks*))))))

(defun c:ASTUIDELETE ()
  (ast:ui-run '(lambda (/ index kept attachment)
    (if (and (ast:ui-ready) (>= astui:*index* 0))
      (if (not (ast:cad-attachments-valid-p astui:*state* astui:*landmarks*))
        (progn
          (initget "ClearAll Cancel")
          (if (equal (getkword "\nGuide correspondence changed. Clear all landmarks to re-pick them [ClearAll/Cancel] <Cancel>: ") "ClearAll")
            (ast:ui-save astui:*settings* nil)
            (ast:ui-status "Landmarks retained. Clear them before re-picking.")))
        (progn
          (setq index 0 kept nil)
          (foreach attachment astui:*landmarks*
            (if (/= index astui:*index*) (setq kept (cons attachment kept)))
            (setq index (1+ index)))
          (ast:ui-save astui:*settings* (reverse kept))))))))

(defun c:ASTUIREVERSE ()
  (ast:ui-run '(lambda ()
    (if (ast:ui-ready)
      (ast:ui-save (ast:ui-set 'reverse (not (cdr (assoc 'reverse astui:*settings*)))
        astui:*settings*) astui:*landmarks*)))))

(defun ast:ui-range-pick (key / anchor-key point attachment settings station total lower upper)
  (if (ast:ui-ready)
    (progn
        (if (cdr (assoc 'closed astui:*route*)) (setq key 'phase))
        (setq anchor-key (read (strcat (vl-symbol-name key) "-ANCHOR")))
        (initget "Default")
        (setq point (getpoint (strcat "\nPick " (vl-symbol-name key)
          " on the guide [Default]: ")))
        (cond
          ((equal point "Default")
            (setq settings (vl-remove-if '(lambda (item) (member (car item) (list key anchor-key))) astui:*settings*))
            (if (= key 'phase) (setq settings (ast:ui-set 'phase 0.0 settings)))
            (ast:ui-save settings astui:*landmarks*))
          ((listp point)
            (if point
              (progn
                (setq attachment (ast:cad-project astui:*guide* (trans point 1 0))
                      station (ast:ui-global-station attachment)
                      settings (ast:ui-set anchor-key
                        (append attachment (list (cons 'source-route astui:*route*)))
                        (ast:ui-set key station astui:*settings*))
                      total (* astui:*factor*
                        (vlax-curve-getDistAtParam astui:*guide* (vlax-curve-getEndParam astui:*guide*)))
                      lower (if (assoc 'start settings) (cdr (assoc 'start settings)) 0.0)
                      upper (if (assoc 'end settings) (cdr (assoc 'end settings)) total))
                (if (>= lower upper)
                  (ast:ui-status "Start must precede End along the source guide.")
                  (ast:ui-save settings astui:*landmarks*)))
              (ast:ui-status "Range pick cancelled.")))))))

(defun c:ASTUISTART ()
  (ast:ui-run '(lambda () (ast:ui-range-pick 'start))))

(defun c:ASTUIEND ()
  (ast:ui-run '(lambda () (ast:ui-range-pick 'end))))

(defun ast:ui-generate (restore-output / pitch settings result state message warning individual corrected)
  (if (and (ast:ui-ready) (or (not restore-output) astui:*placement-conflict*)
           (setq pitch (ast:ui-pitch)))
    (progn
      (setq settings (ast:ui-set 'pitch pitch astui:*settings*)
            result (if restore-output
              (ast:cad-restore astui:*guide* settings astui:*landmarks*)
              (ast:cad-generate astui:*guide* settings astui:*landmarks*)))
      (if (ast:ui-result result)
        (progn
          (setq state (ast:cad-read astui:*guide*))
          (if (ast:ui-result state)
            (progn
              (ast:ui-adopt state)
              (setq astui:*last-pitch* pitch corrected (cdr (assoc 'corrected-count result))
                    message (strcat (if restore-output "Restored " "Generated ")
                      (itoa (cdr (assoc 'count result))) " openings"))
              (if (numberp corrected)
                (setq message (strcat message "; " (itoa corrected) " corrected gaps")))
              (foreach warning (cdr (assoc 'warnings result))
                (princ (strcat "\nAutostitch: " warning))
                (if (vl-string-search "individual" warning) (setq individual T)))
              (ast:ui-status (strcat message "." (if individual "\nIndividual placement may be needed." ""))))))))))

(defun c:ASTUIRESTORE ()
  (ast:ui-run '(lambda () (ast:ui-generate T))))

(defun c:ASTUIGENERATE ()
  (ast:ui-run '(lambda () (ast:ui-generate nil))))

(defun c:ASTUIREFRESH ()
  (ast:ui-run '(lambda (/ result)
    (if (ast:ui-ready)
      (progn
        (setq result (ast:cad-read astui:*guide*))
        (if (ast:ui-result result)
          (progn (ast:ui-adopt result)
            (ast:ui-status (cond
              ((cdr (assoc 'range-conflict result)) (cdr (assoc 'range-conflict result)))
              ((cdr (assoc 'stale result)) "Guide changed. Generate to update cuts.")
              (T "Markers refreshed."))))))))))

(defun c:ASTUIINIT ()
  (setq astui:*document* (vla-get-ActiveDocument (vlax-get-acad-object)))
  (ast:ui-clear) (ast:ui-fill)
  (setq astui:*pitch-text* "3")
  (ast:ui-put "Pitch" "Text" astui:*pitch-text*)
  (vl-bb-set 'ASTUI-PALETTE-OWNER (ast:ui-document-key))
  (ast:ui-status "Select a guide or generated seam.")
  (princ))

(defun c:ASTUICLOSE (reason)
  (ast:ui-clear)
  nil)

(defun ast:ui-open (/ path loaded active document state)
  (vl-catch-all-apply 'vl-cmdf (list "_OPENDCL"))
  (setq active (vl-catch-all-apply 'dcl-Form-IsActive (list "AUTOSTITCH" "Palette")))
  (if (and (not (vl-catch-all-error-p active)) active)
    (setq loaded T)
    (progn
      (setq path (findfile (strcat ast:*home* "/AUTOSTITCH.odcl")))
      (if path
        (progn
          (setq loaded (vl-catch-all-apply 'dcl-Project-Load (list path T "AUTOSTITCH")))
          (if (or (vl-catch-all-error-p loaded) (not loaded))
            (progn
              (setq loaded nil)
              (princ "\nAutostitch: Could not load the OpenDCL palette."))))
        (princ "\nAutostitch: AUTOSTITCH.odcl is missing beside AUTOSTITCH.lsp."))))
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
            (progn
              (ast:ui-adopt state)
              (ast:ui-status (cond
                ((cdr (assoc 'range-conflict state)) (cdr (assoc 'range-conflict state)))
                ((cdr (assoc 'stale state)) "Inputs or guide changed. Generate to update cuts.")
                (T "Saved seam inputs refreshed."))))
            (progn (c:ASTUIINIT) (ast:ui-result state))))
        (c:ASTUIINIT))
      (vl-bb-set 'ASTUI-PALETTE-OWNER (ast:ui-document-key))))
  (princ))

(princ)
