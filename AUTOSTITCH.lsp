;;; Autostitch for BricsCAD V22. APPLOAD this file, then run AUTOSTITCH.
(vl-load-com)
(setq ast:*components-loaded* nil)

(defun ast:home (/ path found)
  (cond
    ((and ast:*home* (findfile (strcat ast:*home* "/AUTOSTITCH.lsp"))) ast:*home*)
    ((setq path (findfile "AUTOSTITCH.lsp")) (vl-filename-directory path))
    (T
      (foreach path (vl-list-loaded-lisp)
        (if (= (strcase (vl-filename-base path)) "AUTOSTITCH")
          (setq found (vl-filename-directory path))))
      found)))

(defun ast:load-components (/ folder file)
  (if (setq folder (ast:home))
    (progn
      (setq ast:*home* folder)
      (foreach file '("autostitch-geometry.lsp" "autostitch-cad.lsp" "autostitch-ui.lsp")
        (load (strcat folder "/source/" file)))
      (setq ast:*components-loaded* T))
    (progn
      (princ "\nAUTOSTITCH: Cannot locate the application folder. APPLOAD AUTOSTITCH.lsp again.")
      nil)))

(defun c:AUTOSTITCH (/ result)
  (setq result
    (vl-catch-all-apply
      '(lambda ()
         (if (or ast:*components-loaded* (ast:load-components))
           (ast:ui-open))) nil))
  (if (vl-catch-all-error-p result)
    (princ (strcat "\nAUTOSTITCH: " (vl-catch-all-error-message result))))
  (princ))

(princ "\nAutostitch loaded. Run AUTOSTITCH to open the stitch tool.")
(princ)
