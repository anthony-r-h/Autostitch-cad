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

(defun ast:event-check-rollback ()
  (ast:event-assert (= ast:event-injections 2) "Failure reached metadata writes for both helpers")
  (ast:event-assert (equal ast:event-before (ast:event-snapshot))
    "Failed callback restored exact source/helper Xrecords, helper entities, definitions and block-name set"))

(defun ast:event-cleanup ()
  (if (boundp 'ast:event-original-inject) (setq ast:cad-inject ast:event-original-inject))
  (setq ast:event-armed nil)
  (if (numberp ast:event-old-osmode) (setvar "OSMODE" ast:event-old-osmode))
  (if (numberp ast:event-old-units) (setvar "INSUNITS" ast:event-old-units))
  (princ))

(princ)
