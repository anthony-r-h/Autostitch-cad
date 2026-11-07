;;; Autostitch for BricsCAD V22. APPLOAD this file, then run AUTOSTITCH.
(vl-load-com)
(setq ast:*components-loaded* nil)

(defun ast:home (/ path found)
  (cond
    ((and ast:*home* (findfile (strcat ast:*home* "/AUTOSTITCH.lsp"))) ast:*home*)
    ((and (setq path (vl-bb-ref 'AST-SESSION-FOLDER))
          (findfile (strcat path "/AUTOSTITCH.lsp"))) path)
    ((setq path (findfile "AUTOSTITCH.lsp")) (vl-filename-directory path))
    (T
      (foreach path (vl-list-loaded-lisp)
        (if (= (strcase (vl-filename-base path)) "AUTOSTITCH")
          (setq found (vl-filename-directory path))))
      found)))

(defun ast:events-ready (document-name / expected)
  (setq expected (if (= 0 (getvar "DWGTITLED")) (getvar "DWGNAME")
    (strcat (getvar "DWGPREFIX") (getvar "DWGNAME"))))
  (if (equal (strcase document-name) (strcase expected))
    (progn
      (setq ast:*events-enabled* T)
      (vl-bb-set 'AST-EVENTS-V1 T)
      T)))

(defun ast:load-events (folder / path)
  (if (not ast:*events-enabled*)
    (progn
      (if (not (vl-bb-ref 'AST-EVENTS-V1))
        (if (setq path (findfile (strcat folder "/Autostitch.Events.dll")))
          (vl-cmdf "_.NETLOAD" path)))
      (if (or path (vl-bb-ref 'AST-EVENTS-V1)) (vl-cmdf "ASTENABLEEVENTSV1"))))
  (if ast:*events-enabled* T
    (progn
      (if (not ast:*autoloading*)
        (princ "\nAUTOSTITCH: Could not load editing notifications. Keep Autostitch.Events.dll beside AUTOSTITCH.lsp; BricsCAD V22 with .NET support is required."))
      nil)))

(defun ast:load-components (/ folder file)
  (if (setq folder (ast:home))
    (progn
      (setq ast:*home* folder)
      (foreach file '("autostitch-geometry.lsp" "autostitch-network.lsp" "autostitch-cad.lsp" "autostitch-markers.lsp" "autostitch-ui.lsp")
        (load (strcat folder "/source/" file)))
      (setq ast:*components-loaded* (ast:load-events folder)))
    (progn
      (princ "\nAUTOSTITCH: Cannot locate the application folder. APPLOAD AUTOSTITCH.lsp again.")
      nil)))

(defun ast:register-documents (/ folder file result)
  (setq folder (ast:home) file (strcat folder "/AUTOSTITCH.lsp"))
  (if (not (equal file (vl-bb-ref 'AST-AUTOLOAD-FILE)))
    (progn
      ;; Set session state before vl-load-all reloads this file in every document.
      (vl-bb-set 'AST-SESSION-FOLDER folder)
      (vl-bb-set 'AST-AUTOLOAD-FILE file)
      (setq result (vl-catch-all-apply 'vl-load-all (list file)))
      (if (vl-catch-all-error-p result)
        (progn
          (vl-bb-set 'AST-AUTOLOAD-FILE nil)
          (setq ast:*load-error* (vl-catch-all-error-message result))
          (princ "\nAUTOSTITCH: Could not enable other drawings. APPLOAD AUTOSTITCH.lsp in the drawing you want to edit.")))))
  (princ))

(defun ast:autoload-document (/ result ast:*autoloading*)
  (setq ast:*autoloading* T)
  (if (vl-bb-ref 'AST-SESSION-FOLDER)
    (progn
      (setq result (vl-catch-all-apply 'ast:load-components nil))
      (if (vl-catch-all-error-p result)
        (progn
          (setq ast:*load-error* (vl-catch-all-error-message result))
          (princ "\nAUTOSTITCH: Could not load the tool in this drawing. Keep the installation folder intact, then APPLOAD AUTOSTITCH.lsp again."))))))

(defun c:AUTOSTITCH (/ result)
  (setq result
    (vl-catch-all-apply
      '(lambda ()
         (if (or ast:*components-loaded* (ast:load-components))
           (if (ast:ui-open) (ast:register-documents)))) nil))
  (if (vl-catch-all-error-p result)
    (progn
      (setq ast:*load-error* (vl-catch-all-error-message result))
      (princ "\nAUTOSTITCH: Could not open the stitch tool. Check that OpenDCL is installed, keep the installation folder intact, then APPLOAD AUTOSTITCH.lsp again.")))
  (princ))

(vl-acad-defun 'ast:events-ready)
(ast:autoload-document)
(princ "\nAutostitch loaded. Run AUTOSTITCH to open the stitch tool.")
(princ)
