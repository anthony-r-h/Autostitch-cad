;;; Saved, nonplotting editing aids. All writes belong to the caller's Undo group.
(vl-load-com)

(defun ast:markers-record (entity / ast:*cad-key*)
  (setq ast:*cad-key* "AUTOSTITCH_UI_V1")
  (ast:cad-record entity))

(defun ast:markers-write-record (entity data link / ast:*cad-key*)
  (setq ast:*cad-key* "AUTOSTITCH_UI_V1")
  (ast:cad-write-record entity data link))

(defun ast:markers-reference (guide / record reference other)
  (setq record (ast:markers-record guide) reference (cdr (assoc 'link record)))
  (if (and reference (entget reference)
           (eq (cdr (assoc 'role (setq other (ast:markers-record reference)))) 'markers)
           (equal (cdr (assoc 'link other)) guide)) reference))

(defun ast:markers-guide (entity / record guide)
  (setq record (ast:markers-record entity) guide (cdr (assoc 'link record)))
  (if (and (eq (cdr (assoc 'role record)) 'markers) guide (entget guide)
           (equal (ast:markers-reference guide) entity)) guide))

(defun ast:markers-entity (data color)
  (ast:cad-require (entmake (append data (list '(8 . "AUTOSTITCH_UI") (cons 62 color))))
    "Could not create an editing marker."))

(defun ast:markers-normal (guide point)
  (+ (/ pi 2.0) (angle '(0.0 0.0 0.0)
    (vlax-curve-getFirstDeriv guide (vlax-curve-getParamAtPoint guide
      (vlax-curve-getClosestPointTo guide point))))))

(defun ast:markers-label (point label color text-height)
  (ast:markers-entity (list '(0 . "TEXT") (cons 10 point) (cons 11 point)
    (cons 40 text-height) (cons 1 label) '(7 . "Standard") '(50 . 0.0)
    '(72 . 1) '(73 . 2)) color))

(defun ast:markers-point (guide point label color size text-height / offset)
  ;; Nested POINT and CIRCLE provide exact NODE/CEN snaps independent of PDMODE.
  (ast:markers-entity (list '(0 . "POINT") (cons 10 point)) color)
  (ast:markers-entity (list '(0 . "CIRCLE") (cons 10 point) (cons 40 (* size 0.25))) color)
  (setq offset (polar point (ast:markers-normal guide point) size))
  (ast:markers-label offset label color text-height))

(defun ast:markers-landmark (guide point index style / normal half-size text-height first last)
  (setq normal (ast:markers-normal guide point) half-size (cdr (assoc 'landmark-half-size style))
        text-height (cdr (assoc 'text-height style)) first (polar point normal half-size)
        last (polar point (+ normal pi) half-size))
  (ast:markers-entity (list '(0 . "POINT") (cons 10 point)) 4)
  (ast:cad-require (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity")
    '(8 . "AUTOSTITCH_UI") '(62 . 4) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    (cons 43 (cdr (assoc 'landmark-width style))) (cons 10 (list (car first) (cadr first)))
    (cons 10 (list (car last) (cadr last))))) "Could not create landmark bar.")
  (ast:markers-label (polar point normal (+ half-size (* text-height 0.8)))
    (strcat "L" (itoa index)) 4 text-height))

(defun ast:markers-style (guide settings factor / record saved pitch)
  (setq record (ast:markers-record guide) saved (cdr (assoc 'style record))
        pitch (cdr (assoc 'pitch settings)))
  ;; Migrate old labels once, then retain their model-space size through later edits.
  (if (and saved (member (ast:cad-get 'display-version (ast:cad-get 'snapshot record)) '(9 10))) saved
    (list (cons 'size (/ (max 0.65 (min 1.0 (* pitch (/ 0.8 3.0)))) factor))
      (cons 'text-height (/ (max 0.55 (min 0.8 (* pitch 0.22))) factor))
      (cons 'landmark-half-size (/ (max 0.9 (min 1.6 (* pitch 0.4))) factor))
      (cons 'landmark-width (/ 0.12 factor)))))

(defun ast:markers-connections (guide / state connections result ast:*cad-error*)
  (setq result (vl-catch-all-apply
    '(lambda ()
      (setq state (ast:cad-read guide))
      (ast:cad-require (cdr (assoc 'ok state)) (cdr (assoc 'error state)))
      (setq connections (cdr (assoc 'connections state)))
      (if connections
        (ast:g-resolve-connections
          (ast:cad-set-paths (ast:cad-set-states (cdr (assoc 'members state)) nil nil nil))
          connections)
        (list '(ok . T)))) nil))
  (cond
    ((vl-catch-all-error-p result)
      (princ (strcat "\nAutostitch intersection markers: "
        (if ast:*cad-error* ast:*cad-error* (vl-catch-all-error-message result)))) nil)
    ((not (cdr (assoc 'ok result)))
      (princ (strcat "\nAutostitch intersection markers: " (cdr (assoc 'error result)))) nil)
    (T (cdr (assoc 'connections result)))))

(defun ast:markers-shared-point-p (point factor connections)
  (vl-some '(lambda (connection)
    (equal (list (* factor (car point)) (* factor (cadr point)))
      (cdr (assoc 'point connection)) 1e-7)) connections))

(defun ast:markers-attachment-point (guide attachment factor / primitive parameter boundary station maximum)
  (setq primitive (cdr (assoc 'primitive attachment))
        parameter (if (= (cdr (assoc 0 (entget guide))) "LWPOLYLINE")
          primitive (vlax-curve-getStartParam guide))
        maximum (vlax-curve-getEndParam guide))
  (if (and (>= parameter (vlax-curve-getStartParam guide)) (< parameter maximum))
    (progn
      (setq boundary (if (= (cdr (assoc 0 (entget guide))) "LWPOLYLINE")
                       (min maximum (1+ parameter)) maximum)
            station (+ (vlax-curve-getDistAtParam guide parameter)
                       (/ (cdr (assoc 'station attachment)) factor)))
      (if (and (>= (cdr (assoc 'station attachment)) 0.0)
               (<= station (vlax-curve-getDistAtParam guide boundary)))
        (vlax-curve-getPointAtDist guide station)))))

(defun ast:markers-geometry (guide settings landmarks factor route style connections / total start finish phase closed reversed size text-height first last middle direction index attachment point incoming outgoing primitives connection corner-station cue-step cue-station)
  (setq total (vlax-curve-getDistAtParam guide (vlax-curve-getEndParam guide))
        closed (cdr (assoc 'closed route)) reversed (cdr (assoc 'reverse settings))
        start (if (assoc 'start settings) (/ (cdr (assoc 'start settings)) factor) 0.0)
        finish (if (assoc 'end settings) (/ (cdr (assoc 'end settings)) factor) total)
        phase (if (assoc 'phase settings) (/ (cdr (assoc 'phase settings)) factor) 0.0)
        size (cdr (assoc 'size style)) text-height (cdr (assoc 'text-height style)))
  (if closed (setq start phase finish phase))
  (setq first (if (and (>= start 0.0) (<= start total)) (vlax-curve-getPointAtDist guide start))
        last (if (and (>= finish 0.0) (<= finish total)) (vlax-curve-getPointAtDist guide finish)))
  (if (and (>= start 0.0) (<= start total)
           (not (ast:markers-shared-point-p (vlax-curve-getPointAtDist guide start) factor connections)))
    (ast:markers-point guide (vlax-curve-getPointAtDist guide start)
      (if closed "S" (if reversed "E" "S")) (if (and reversed (not closed)) 1 3) size text-height))
  (if (and (not closed) (>= finish 0.0) (<= finish total)
           (not (ast:markers-shared-point-p (vlax-curve-getPointAtDist guide finish) factor connections)))
    (ast:markers-point guide (vlax-curve-getPointAtDist guide finish)
      (if reversed "S" "E") (if reversed 3 1) size text-height))
  (if (and (> total 0.0) (>= start 0.0) (<= finish total) (or closed (< start finish)))
    (progn
      (setq cue-step (min (/ (* 0.5 (cdr (assoc 'pitch settings))) factor)
                          (* 0.25 (if closed total (- finish start))))
            cue-station (if closed
              (rem (+ total phase (* (if reversed -1.0 1.0) cue-step)) total)
              (if reversed (- finish cue-step) (+ start cue-step)))
            middle (vlax-curve-getPointAtDist guide cue-station)
            direction (angle '(0.0 0.0 0.0)
              (vlax-curve-getFirstDeriv guide (vlax-curve-getParamAtPoint guide middle))))
      (if reversed (setq direction (+ direction pi)))
      ;; Text marks traversal near S without introducing false endpoint snaps.
      (ast:markers-entity (list '(0 . "TEXT") (cons 10 middle) (cons 11 middle)
        (cons 40 text-height) '(1 . ">") '(7 . "Standard") (cons 50 direction)
        '(72 . 1) '(73 . 2)) 2)))
  (setq index 0)
  (foreach attachment landmarks
    (setq index (1+ index))
    (if (setq point (ast:markers-attachment-point guide attachment factor))
      (ast:markers-landmark guide point index style)))
  (setq primitives (cdr (assoc 'primitives route)) index 0 corner-station 0.0)
  (repeat (if closed (length primitives) (max 0 (1- (length primitives))))
    (setq incoming (nth index primitives)
          outgoing (nth (rem (1+ index) (length primitives)) primitives)
          point (ast:g-point incoming (ast:g-length incoming))
          point (list (/ (car point) factor) (/ (cadr point) factor) 0.0)
          corner-station (+ corner-station (/ (ast:g-length incoming) factor)))
    (if (not (and (> (ast:g-dot (ast:g-tangent incoming (ast:g-length incoming))
                               (ast:g-tangent outgoing 0.0)) 0.0)
                  (< (abs (ast:g-cross (ast:g-tangent incoming (ast:g-length incoming))
                                      (ast:g-tangent outgoing 0.0))) 1e-10)))
      (if (and (not (ast:markers-shared-point-p point factor connections))
               (not (equal point first 1e-8)) (not (equal point last 1e-8))
               (or closed (and (>= corner-station start) (<= corner-station finish))))
        (ast:markers-point guide point "J" 6 size text-height)))
    (setq index (1+ index)))
  (setq index 0)
  (foreach connection (if (equal guide (cdr (assoc 'primary (ast:cad-record guide)))) connections)
    (setq index (1+ index) point (cdr (assoc 'point connection)))
    (if point
      (ast:markers-point guide (list (/ (car point) factor) (/ (cadr point) factor) 0.0)
        "J" 2 size text-height))))

(defun ast:markers-snapshot (guide settings landmarks factor route)
  (list '(display-version . 10) (cons 'settings settings) (cons 'landmarks landmarks)
    (cons 'factor factor) (cons 'route route) (cons 'style (ast:markers-style guide settings factor))
    (cons 'connections (ast:markers-connections guide))))

(defun ast:markers-current-p (guide snapshot / reference record)
  (setq reference (ast:markers-reference guide) record (ast:markers-record guide))
  (and reference (equal (cdr (assoc 'snapshot record)) snapshot 1e-10)
           (equal (cdr (assoc 8 (entget reference))) "AUTOSTITCH_UI")
           (equal (cdr (assoc 10 (entget reference))) '(0.0 0.0 0.0) 1e-10)
           (equal (cdr (assoc 41 (entget reference))) 1.0 1e-10)
           (equal (cdr (assoc 42 (entget reference))) 1.0 1e-10)
           (equal (cdr (assoc 43 (entget reference))) 1.0 1e-10)
           (equal (cdr (assoc 50 (entget reference))) 0.0 1e-10)
           (equal (cdr (assoc 210 (entget reference))) '(0.0 0.0 1.0) 1e-10)))

(defun ast:markers-update (guide settings landmarks factor route / layer reference snapshot name index data owner object item style connections)
  (setq reference (ast:markers-reference guide)
        snapshot (ast:markers-snapshot guide settings landmarks factor route)
        style (cdr (assoc 'style snapshot)) connections (cdr (assoc 'connections snapshot)))
  (if (ast:markers-current-p guide snapshot)
    reference
    (progn
      (if (not (setq layer (tblsearch "LAYER" "AUTOSTITCH_UI")))
        (ast:cad-require (entmake '((0 . "LAYER") (100 . "AcDbSymbolTableRecord")
          (100 . "AcDbLayerTableRecord") (2 . "AUTOSTITCH_UI") (70 . 0)
          (62 . 7) (6 . "Continuous") (290 . 0))) "Could not create nonplotting marker layer."))
      (setq layer (entget (tblobjname "LAYER" "AUTOSTITCH_UI")))
      (ast:cad-require (= 0 (logand 4 (cdr (assoc 70 layer)))) "Unlock AUTOSTITCH_UI to edit seam points.")
      (ast:cad-require (= (cdr (assoc 290 layer)) 0) "Set AUTOSTITCH_UI to nonplotting before editing seam points.")
      (setq index 1 name (strcat "AST_UI_" (cdr (assoc 5 (entget guide))) "_1"))
      (while (tblsearch "BLOCK" name)
        (setq index (1+ index) name (strcat "AST_UI_" (cdr (assoc 5 (entget guide))) "_" (itoa index))))
      (ast:cad-require (entmake (list '(0 . "BLOCK") (cons 2 name) '(70 . 0)
        '(10 0.0 0.0 0.0) '(8 . "AUTOSTITCH_UI"))) "Could not create editing marker block.")
      (setq ast:*cad-block-open* T)
      (ast:markers-geometry guide settings landmarks factor route style connections)
      (ast:cad-require (entmake '((0 . "ENDBLK"))) "Could not finish editing marker block.")
      (setq ast:*cad-block-open* nil)
      (if reference
        (progn
          (setq data (entget reference))
          (foreach item (list (cons 2 name) '(8 . "AUTOSTITCH_UI") '(10 0.0 0.0 0.0) '(41 . 1.0) '(42 . 1.0)
                             '(43 . 1.0) '(50 . 0.0) '(210 0.0 0.0 1.0))
            (setq data (ast:cad-put (car item) (cdr item) data)))
          (ast:cad-require (entmod data) "Could not update editing markers.")
          (entupd reference))
        (progn
          (setq owner (vlax-ename->vla-object (cdr (assoc 330 (entget guide))))
                object (vla-InsertBlock owner (vlax-3d-point '(0.0 0.0 0.0)) name 1.0 1.0 1.0 0.0))
          (vla-put-Layer object "AUTOSTITCH_UI")
          (setq reference (vlax-vla-object->ename object))))
      (ast:markers-write-record guide (list '(role . guide) (cons 'snapshot snapshot) (cons 'style style)) reference)
      (ast:markers-write-record reference '((role . markers)) guide)
      (ast:cad-inject "marker-metadata")
      reference)))

(defun ast:markers-ensure (guide settings landmarks factor route / result)
  (if (ast:markers-current-p guide (ast:markers-snapshot guide settings landmarks factor route))
    (list '(ok . T))
    (progn
      (setq result (ast:cad-transaction 'ast:markers-update (list guide settings landmarks factor route)))
      (if (eq (type result) 'ENAME) (list '(ok . T)) result))))

(defun ast:markers-prune-missing (/ selection index reference record guide count)
  ;; Explicit repair may remove orphan annotations, never another valid seam's aids.
  (setq count 0)
  (if (setq selection (ssget "_X" '((0 . "INSERT") (8 . "AUTOSTITCH_UI"))))
    (progn
      (setq index 0)
      (repeat (sslength selection)
        (setq reference (ssname selection index) record (ast:markers-record reference)
              guide (cdr (assoc 'link record)) index (1+ index))
        (if (and (eq (cdr (assoc 'role record)) 'markers) (or (null guide) (null (entget guide))))
          (progn
            (ast:cad-require (entdel reference) "Could not remove a deleted stitch line's editing markers.")
            (setq count (1+ count)))))))
  count)

(defun ast:markers-sync (/ selection index reference record guide state)
  (if (setq selection (ssget "_X" '((0 . "INSERT") (8 . "AUTOSTITCH_UI"))))
    (progn
      (setq index 0)
      (repeat (sslength selection)
        (setq reference (ssname selection index) record (ast:markers-record reference)
              guide (cdr (assoc 'link record)) index (1+ index))
        (if (eq (cdr (assoc 'role record)) 'markers)
          (if (and guide (entget guide) (equal (ast:markers-reference guide) reference))
            (progn
              (setq state (ast:cad-read guide))
              (if (cdr (assoc 'ok state))
                (ast:markers-update guide (cdr (assoc 'settings state)) (cdr (assoc 'landmarks state))
                  (cdr (assoc 'factor state)) (cdr (assoc 'route state)))
                (progn
                  (ast:cad-require (entdel reference) "Could not remove invalid stitch line editing markers.")
                  (princ (strcat "\nAutostitch: Editing points hidden; " (cdr (assoc 'error state)))))))
            (ast:cad-require (entdel reference) "Could not remove an orphaned editing marker.")))))))

(defun ast:markers-native-sync (/ result cleanup ui-result ast:*cad-error* ast:*cad-block-open*)
  ;; Called synchronously by the managed document event bridge inside its transaction.
  ;; T means success; an error string tells the bridge to abort its transaction.
  (if ast:*marker-syncing* T
    (progn
      (setq ast:*marker-syncing* T)
      (setq result (vl-catch-all-apply 'ast:markers-sync nil))
      (if ast:*cad-block-open*
        (setq cleanup (vl-catch-all-apply 'entmake (list '((0 . "ENDBLK"))))))
      (setq ast:*marker-syncing* nil)
      (cond
        ((and ast:*cad-block-open* (or (null cleanup) (vl-catch-all-error-p cleanup)))
          "Could not close an incomplete editing marker block.")
        ((vl-catch-all-error-p result)
          (if ast:*cad-error* ast:*cad-error* (vl-catch-all-error-message result)))
        (T
          (if (member 'ast:ui-native-refresh (atoms-family 0))
            (progn
              (setq ui-result (vl-catch-all-apply 'ast:ui-native-refresh nil))
              (if (vl-catch-all-error-p ui-result)
                (princ (strcat "\nAutostitch palette refresh: " (vl-catch-all-error-message ui-result))))))
          T)))))

(vl-acad-defun 'ast:markers-native-sync)

(princ)
