;;; Driven by run-events.ps1 in an isolated output/native drawing.
;;; Do not LOAD a report between a native edit and its Undo/Redo checks.
(vl-load-com)

(defun ast:event-assert (condition label / stream)
  (setq stream (open ast:event-report "a"))
  (write-line (strcat (if condition "PASS " "FAIL ") label) stream)
  (close stream)
  condition)

(defun ast:event-record (entity key / dictionary)
  (if (setq dictionary (cdr (assoc 360 (entget entity)))) (dictsearch dictionary key)))

(defun ast:event-definition (reference / entity records)
  (setq entity (tblobjname "BLOCK" (cdr (assoc 2 (entget reference)))))
  (while entity
    (setq records (cons (entget entity) records))
    (if (= "ENDBLK" (cdr (assoc 0 (entget entity)))) (setq entity nil)
      (setq entity (entnext entity))))
  (reverse records))

(defun ast:event-block-names (/ record names)
  (setq record (tblnext "BLOCK" T))
  (while record
    (setq names (cons (cdr (assoc 2 record)) names) record (tblnext "BLOCK")))
  (acad_strlsort names))

(defun ast:event-snapshot (/ guide helper result)
  (foreach guide ast:event-guides
    (setq helper (ast:markers-reference guide))
    (setq result (cons (list
      (ast:event-record guide "AUTOSTITCH_V1")
      (ast:event-record guide "AUTOSTITCH_UI_V1")
      (entget helper)
      (ast:event-record helper "AUTOSTITCH_UI_V1")
      (ast:event-definition helper)) result)))
  (list (reverse result) (ast:event-block-names)))

(defun ast:event-setup (/ guide state helper stream yy)
  (setq ast:event-old-osmode (getvar "OSMODE") ast:event-old-units (getvar "INSUNITS")
        ast:event-guides nil ast:event-original-inject ast:cad-inject ast:event-armed nil)
  (ast:cad-require (= 1 (getvar "TILEMODE")) "Event tests require the Model tab in the isolated drawing.")
  (setvar "OSMODE" 0)
  (setvar "INSUNITS" 4)
  (ast:cad-require (entmake (list '(0 . "LAYER") '(100 . "AcDbSymbolTableRecord")
    '(100 . "AcDbLayerTableRecord") (cons 2 ast:event-layer) '(70 . 0) '(62 . 7)))
    "Could not create the isolated event fixture layer.")
  (setq stream (open ast:event-handles "w"))
  (foreach yy '(1000.0 1020.0)
    (ast:cad-require (entmake (list '(0 . "LINE") (cons 8 ast:event-layer)
      (cons 10 (list 1000.0 yy 0.0)) (cons 11 (list 1060.0 yy 0.0)))) "Could not create event fixture.")
    (setq guide (entlast) state (ast:cad-read guide))
    (ast:cad-require (cdr (assoc 'ok state)) (cdr (assoc 'error state)))
    (ast:cad-require (cdr (assoc 'ok (ast:markers-ensure guide
      (cdr (assoc 'settings state)) nil (cdr (assoc 'factor state)) (cdr (assoc 'route state)))))
      "Could not create event fixture markers.")
    (setq helper (ast:markers-reference guide) ast:event-guides (append ast:event-guides (list guide)))
    (write-line (strcat (cdr (assoc 5 (entget guide))) "|" (cdr (assoc 5 (entget helper)))) stream))
  (close stream)
  (vla-ZoomCenter (vlax-get-acad-object) (vlax-3d-point '(1035.0 1010.0 0.0)) 120.0)
  (ast:event-assert (= 2 (length ast:event-guides)) "Created two isolated source/helper fixtures"))

(defun ast:event-arm-failure ()
  (setq ast:event-before (ast:event-snapshot) ast:event-injections 0 ast:event-armed T)
  (defun ast:cad-inject (stage)
    (if (= stage "marker-metadata")
      (progn
        (setq ast:event-injections (1+ ast:event-injections))
        (if (= ast:event-injections 2)
          (ast:cad-require nil "Injected event failure after the second helper write.")))))
  (ast:event-assert T "Captured exact metadata/definitions and armed second-helper failure"))

(defun ast:event-ui-save (/ guide state settings)
  ;; Internal UNDO Begin/End must not re-enter the running palette save via .NET.
  (c:AUTOSTITCH)
  (setq guide (car ast:event-guides) state (ast:cad-read guide)
        settings (ast:cad-put 'pitch 3.2 (cdr (assoc 'settings state))))
  (ast:ui-adopt state)
  (ast:cad-require (ast:ui-save settings nil) "Palette input save did not complete.")
  (ast:event-assert (equal 3.2 (cdr (assoc 'pitch (cdr (assoc 'settings (ast:cad-read guide))))))
    "Palette input save returns through internal Undo commands with the interpreter alive"))

(defun ast:event-check-rollback ()
  (ast:event-assert (= ast:event-injections 2) "Failure reached metadata writes for both helpers")
  (ast:event-assert (equal ast:event-before (ast:event-snapshot))
    "Failed callback restored exact source/helper Xrecords, helper entities, definitions and block-name set"))

(defun ast:event-cleanup ()
  (if (boundp 'ast:event-original-inject) (setq ast:cad-inject ast:event-original-inject))
  (if ast:event-track-original-read
    (setq ast:cad-read-base-inner ast:event-track-original-read
          ast:cad-output-signature ast:event-track-original-signature
          ast:markers-update-one ast:event-track-original-marker
          ast:markers-connections-inner ast:event-track-original-connections
          ast:event-track-original-read nil))
  (setq ast:event-armed nil)
  (if (numberp ast:event-old-osmode) (setvar "OSMODE" ast:event-old-osmode))
  (if (numberp ast:event-old-units) (setvar "INSUNITS" ast:event-old-units))
  (princ))

(defun ast:event-track-reset ()
  (setq ast:event-track-reads nil ast:event-track-signatures nil ast:event-track-markers nil
        ast:event-track-connections nil))

(defun ast:event-track-setup (/ first second third result settings index stream)
  (setq ast:cad-inject ast:event-original-inject settings (ast:cad-default-settings))
  (setq first (entmakex (list '(0 . "LINE") (cons 8 ast:event-layer) '(10 0.0 3000.0 0.0) '(11 60.0 3000.0 0.0)))
        second (entmakex (list '(0 . "LINE") (cons 8 ast:event-layer) '(10 60.0 3000.0 0.0) '(11 60.0 3060.0 0.0)))
        third (entmakex (list '(0 . "LINE") (cons 8 ast:event-layer) '(10 0.0 3100.0 0.0) '(11 60.0 3100.0 0.0))))
  (setq result (ast:cad-connect-guides first second nil settings nil))
  (ast:cad-require (ast:cad-get 'ok result) (ast:cad-get 'error result))
  (setq result (ast:cad-generate first settings nil) ast:event-track-output (ast:cad-get 'output result))
  (ast:cad-require (ast:cad-get 'ok result) (ast:cad-get 'error result))
  (setq result (ast:cad-generate third settings nil))
  (ast:cad-require (ast:cad-get 'ok result) (ast:cad-get 'error result))
  (setq ast:event-track-guides (list first second third) index 0)
  ;; Ordinary entities deliberately share the guides' layer.
  (repeat 1000
    (setq ast:event-track-plain (entmakex (list '(0 . "LINE") (cons 8 ast:event-layer)
      (cons 10 (list (+ 100.0 index) 3200.0 0.0)) (cons 11 (list (+ 100.0 index) 3201.0 0.0))))
      index (1+ index)))
  (ast:ui-adopt (ast:cad-read first))
  (setq stream (open ast:event-handles "w"))
  (write-line (strcat (cdr (assoc 5 (entget first))) "|" (cdr (assoc 5 (entget second))) "|"
    (cdr (assoc 5 (entget third)))) stream)
  (close stream)
  (setq ast:event-track-original-read ast:cad-read-base-inner
        ast:event-track-original-signature ast:cad-output-signature
        ast:event-track-original-marker ast:markers-update-one
        ast:event-track-original-connections ast:markers-connections-inner)
  (defun ast:cad-read-base-inner (entity)
    (setq ast:event-track-reads (cons entity ast:event-track-reads))
    (apply ast:event-track-original-read (list entity)))
  (defun ast:cad-output-signature (output)
    (setq ast:event-track-signatures (cons output ast:event-track-signatures))
    (apply ast:event-track-original-signature (list output)))
  (defun ast:markers-update-one (guide settings landmarks factor route)
    (setq ast:event-track-markers (cons guide ast:event-track-markers))
    (apply ast:event-track-original-marker (list guide settings landmarks factor route)))
  (defun ast:markers-connections-inner (guide)
    (setq ast:event-track-connections (cons guide ast:event-track-connections))
    (apply ast:event-track-original-connections (list guide)))
  (ast:event-track-reset))

(defun ast:event-track-unrelated ()
  (ast:event-assert (and (null ast:event-track-reads) (null ast:event-track-signatures)
    (null ast:event-track-markers) (null ast:event-track-connections))
    "Unrelated MOVE performs zero guide reads, marker updates and stitch-content scans")
  (ast:event-track-reset))

(defun ast:event-track-connected ()
  (ast:event-assert (and (= 2 (length ast:event-track-reads))
    (member (car ast:event-track-guides) ast:event-track-reads)
    (member (cadr ast:event-track-guides) ast:event-track-reads)
    (= 2 (length ast:event-track-markers)) (= 1 (length ast:event-track-connections))
    (null ast:event-track-signatures))
    "Connected MOVE refreshes each member once, resolves junctions once and reuses unchanged cut content")
  (ast:event-track-reset))

(defun ast:event-track-single ()
  (ast:event-assert (and (equal ast:event-track-reads (list (caddr ast:event-track-guides)))
    (equal ast:event-track-markers (list (caddr ast:event-track-guides)))
    (null ast:event-track-signatures))
    "Editing another stitch line leaves the selected connected set untouched")
  (ast:event-track-reset))

(defun ast:event-edit-content (/ entity data)
  ;; Invoked inside the harness's managed command so V22 sends command events.
  (setq entity (entnext (tblobjname "BLOCK" (cdr (assoc 2 (entget ast:event-track-output)))))
        data (entget entity))
  (entmod (ast:cad-put 62 1 data))
  (princ))

(defun ast:event-track-content ()
  (ast:event-assert (equal (list ast:event-track-output) ast:event-track-signatures)
    "Editing generated block content fingerprints its shared output exactly once")
  (ast:event-track-reset))

(vl-acad-defun 'ast:event-edit-content)

(defun ast:event-track-layer-check (/ state)
  (setq state (ast:cad-read (car ast:event-track-guides)))
  (ast:event-assert (and (ast:cad-get 'ok state) (= 2 (length (ast:cad-get 'members state)))
    (equal ast:event-track-output (ast:cad-get 'output state))
    (= "AUTOSTITCH_GUIDES" (cdr (assoc 8 (entget (car ast:event-track-guides)))))
    (= "AUTOSTITCH_GUIDES" (cdr (assoc 8 (entget (cadr ast:event-track-guides))))))
    "Optional guide layer preserves connected membership and generated output ownership")
  (ast:event-track-reset))

(princ)
