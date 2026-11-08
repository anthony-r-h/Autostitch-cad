;;; Banner lettering study. Load examples/demo.lsp, then ASTBANNERDEMO.
;;; Circular-arc letterforms match the emblem; stitch fitting follows artwork review.
(defun ast:banner-script (letter)
  (cond
    ((= letter "c") (ast:show-script "c"))
    ((= letter "a") (list
      (ast:show-stroke '((24 12 1.0) (0 12 1.0)) T)
      (ast:show-stroke '((24 24) (24 6 0.414213562373095)
                        (30 0 0.414213562373095) (36 6)) nil)))
    ((= letter "n") (list
      (ast:show-stroke '((0 0) (0 24)) nil)
      (ast:show-stroke '((0 15 -0.414213562373095) (9 24 -0.414213562373095)
                        (18 15) (18 6 0.414213562373095)
                        (24 0 0.414213562373095) (30 6)) nil)))
    ((= letter "r") (list
      (ast:show-stroke '((0 0) (0 24)) nil)
      (ast:show-stroke '((0 15 -0.414213562373095) (9 24 -0.414213562373095)
                        (18 15)) nil)))
    ((= letter "e") (list
      (ast:show-stroke '((2 12) (18 12 1.0) (0 12 0.414213562373095)
                        (12 0 0.414213562373095) (24 12)) nil)))
    ((= letter "l") (list
      (ast:show-stroke '((-6 0) (12 39)) nil)
      (ast:show-stroke '((12 39 1.0) (0 39) (0 6 0.414213562373095)
                        (6 0 0.414213562373095) (12 6)) nil)))
    ((= letter "y") (list
      (ast:show-stroke '((0 24) (0 9 0.414213562373095)
                        (9 0 0.414213562373095) (18 9)) nil)
      (ast:show-stroke '((18 24) (18 -9 -1.0) (0 -9) (0 -6)) nil)))))

(defun ast:banner-outline-y ()
  (list (ast:show-stroke '((0 57.6) (9 57.6) (16 36) (23 57.6)
    (32 57.6) (20.05 25) (20.05 0) (11.95 0) (11.95 25)) T)))

(setq ast:banner-lettering-layout
  '(("can" 0.84 -12.0 (("c" 0.0) ("a" 32.0) ("n" 72.0)))
    ("YOU" 1.0 0.0 (("Y" 0.0) ("O" 48.0) ("U" 91.6)))
    ("really" 0.84 -12.0
      (("r" 0.0) ("e" 23.0) ("a" 52.0) ("l" 94.0) ("l" 115.0) ("y" 135.0)))))

(defun ast:banner-poly (stroke origin layer / data point)
  (setq data (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 layer) '(370 . 30)
    '(100 . "AcDbPolyline") (cons 90 (length (cadr stroke))) (cons 70 (if (car stroke) 1 0))))
  (foreach point (cadr stroke)
    (setq data (append data (list (cons 10 (ast:g-add origin point))
      (cons 42 (if (caddr point) (caddr point) 0.0))))))
  (entmakex data))
(defun ast:banner-bounds (guides / guide low high minimum maximum)
  (foreach guide guides
    (vla-GetBoundingBox (vlax-ename->vla-object guide) 'low 'high)
    (setq low (vlax-safearray->list low) high (vlax-safearray->list high)
      minimum (if minimum (mapcar 'min minimum low) low)
      maximum (if maximum (mapcar 'max maximum high) high)))
  (list minimum maximum))
(defun ast:banner-move (guides x y / guide)
  (foreach guide guides
    (vla-Move (vlax-ename->vla-object guide) (vlax-3d-point '(0.0 0.0 0.0)) (vlax-3d-point (list x y 0.0)))))
(defun ast:banner-row (entry / letter strokes stroke guide guides bounds shift height)
  (foreach letter (cadddr entry)
    (setq strokes (if (= (car entry) "YOU")
      (if (= (car letter) "Y") (ast:banner-outline-y) (ast:show-outline (car letter)))
      (ast:banner-script (car letter))))
    (foreach stroke strokes
      (setq guide (ast:banner-poly (ast:show-turn stroke (caddr entry) '(0 0)) (list (cadr letter) 0.0) "BANNER_LETTERS"))
      (vla-ScaleEntity (vlax-ename->vla-object guide) (vlax-3d-point '(0.0 0.0 0.0)) (cadr entry))
      (setq guides (append guides (list guide)))))
  (setq bounds (ast:banner-bounds guides)
    shift (- 80.0 (* 0.5 (+ (caar bounds) (caadr bounds))))
    height (- (cadadr bounds) (cadar bounds)))
  (ast:banner-move guides shift (- (cadar bounds)))
  (list (cons 'label (car entry)) (cons 'guides guides) (cons 'height height)))
(defun c:ASTBANNERDEMO (/ entry rows row total cursor guides)
  (ast:cad-require (null (ssget "_X" '((410 . "Model")))) "Build the banner in a new empty drawing.")
  (setvar "INSUNITS" 4)
  (ast:show-layer "BANNER_LETTERS" 7 T)
  (ast:show-layer "BANNER_PAGE" 8 nil)
  (foreach entry ast:banner-lettering-layout
    (setq rows (append rows (list (ast:banner-row entry)))))
  ;; Equal gaps between word extents, with the whole composition centred on the page.
  (setq total (+ 56.0 (apply '+ (mapcar '(lambda (row) (ast:cad-get 'height row)) rows)))
    cursor (+ 128.0 (* 0.5 total)))
  (foreach row rows
    (setq cursor (- cursor (ast:cad-get 'height row)))
    (ast:banner-move (ast:cad-get 'guides row) 0.0 cursor)
    (setq cursor (- cursor 28.0) guides (append guides (ast:cad-get 'guides row))))
  (ast:banner-poly (ast:show-stroke '((0 0) (160 0) (160 256) (0 256)) T) '(0.0 0.0) "BANNER_PAGE")
  (setvar "LWDISPLAY" 1) (setvar "UCSICON" 0)
  (vl-cmdf "_.ZOOM" "_W" '(0.0 0.0) '(160.0 256.0))
  (vl-cmdf "_.-VIEW" "_Save" "BANNER")
  (princ "\nBanner lettering created. Background and stitch fitting remain to be designed.")
  (list '(ok . T) (cons 'guides (length guides)) '(page-width . 160.0) '(page-height . 256.0)
    '(planned-clear-band . 6.0) '(stage . lettering)))
(princ)
