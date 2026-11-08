;;; Native demo entry point. Load AUTOSTITCH.lsp, then this file.
(vl-load-com)
(if (not (member 'ast:load-components (atoms-family 0)))
  (if (findfile "AUTOSTITCH.lsp") (load "AUTOSTITCH.lsp")
    (progn (princ "\nAPPLOAD AUTOSTITCH.lsp before loading examples/demo.lsp.") (exit))))
(if (not ast:*components-loaded*) (ast:load-components))

(defun ast:demo-load-module (name / path)
  (setq path (strcat ast:*home* "/examples/" name))
  (if (findfile path) (load path)
    (princ (strcat "\nDemo module is not available: " name))))

(foreach ast:demo-module '("emblem.lsp" "fills.lsp" "banner.lsp" "demo-export.lsp") (ast:demo-load-module ast:demo-module))
(princ "\nDemos: ASTFILLDEMOS, ASTBANNERDEMO, ASTEMBLEMDEMO, ASTDEMOEXPORT.")
(princ)
