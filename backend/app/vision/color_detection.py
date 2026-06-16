import cv2
import numpy as np

FACE_LABELS = ("U", "R", "F", "D", "L", "B")

REF = {
    "D": (28, 220, 200),
    "L": (12, 230, 220),
    "R": (175, 230, 180),
    "F": (62, 230, 150),
    "B": (105, 230, 180),
}


def detect_face_from_bytes(image_bytes):
    if not image_bytes:
        raise ValueError("image is empty")
    arr = np.frombuffer(image_bytes, np.uint8)
    if arr.size == 0:
        raise ValueError("image bytes could not be decoded")
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("image format not recognized")
    img = _resize_for_processing(img, 720)
    return detect_face_colors(img)


def detect_face_colors(image_bgr):
    if image_bgr is None or image_bgr.size == 0:
        raise ValueError("image is empty")
    centers = _find_sticker_centers_by_contour(image_bgr)
    if centers is None or len(centers) < 4:
        centers = _grid_centers_full_image(image_bgr)
        radius = _grid_sample_radius(image_bgr)
    elif len(centers) < 9:
        centers, radius = _rescue_partial_grid(image_bgr, centers)
    else:
        radius = _estimate_sample_radius(centers)
    centers = _sort_into_3x3(centers)
    samples = [_summarize_patch(_extract_patch(image_bgr, cx, cy, radius)) for cx, cy in centers]
    return _classify_samples(samples)


def _resize_for_processing(img, max_side):
    h, w = img.shape[:2]
    longest = max(h, w)
    if longest <= max_side:
        return img
    scale = max_side / longest
    return cv2.resize(img, (int(round(w * scale)), int(round(h * scale))), interpolation=cv2.INTER_AREA)


def _find_sticker_centers_by_contour(image_bgr):
    h, w = image_bgr.shape[:2]
    img_area = h * w
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    if gray.mean() < 110:
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
    smoothed = cv2.bilateralFilter(gray, 9, 40, 40)
    edges_canny = cv2.Canny(smoothed, 30, 90)
    edges_adapt = cv2.adaptiveThreshold(
        smoothed, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5,
    )
    edges = cv2.bitwise_or(edges_canny, edges_adapt)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
    edges = cv2.dilate(edges, kernel, iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    min_area = img_area * 0.005
    max_area = img_area * 0.12
    candidates = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < min_area or area > max_area:
            continue
        x, y, cw, ch = cv2.boundingRect(c)
        if cw == 0 or ch == 0:
            continue
        aspect = cw / ch if cw < ch else ch / cw
        if aspect < 0.65:
            continue
        rect_area = cw * ch
        fill = area / rect_area if rect_area > 0 else 0
        if fill < 0.55:
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.04 * peri, True)
        if len(approx) < 3 or len(approx) > 12:
            continue
        candidates.append({
            "cx": x + cw // 2, "cy": y + ch // 2,
            "size": max(cw, ch), "area": area,
        })
    if len(candidates) < 4:
        return None
    sizes = np.array([c["size"] for c in candidates])
    med_size = float(np.median(sizes))
    if med_size <= 0:
        return None
    candidates = [c for c in candidates if 0.55 * med_size <= c["size"] <= 1.8 * med_size]
    if len(candidates) < 4:
        return None
    deduped = []
    for c in candidates:
        is_dup = False
        for d in deduped:
            if abs(c["cx"] - d["cx"]) < 0.5 * med_size and abs(c["cy"] - d["cy"]) < 0.5 * med_size:
                is_dup = True
                if c["area"] > d["area"]:
                    d.update(c)
                break
        if not is_dup:
            deduped.append(c)
    if len(deduped) < 4:
        return None
    if len(deduped) > 9:
        deduped.sort(key=lambda c: abs(c["size"] - med_size))
        deduped = deduped[:9]
    return [(c["cx"], c["cy"]) for c in deduped]


def _rescue_partial_grid(image_bgr, partial):
    h, w = image_bgr.shape[:2]
    xs = [p[0] for p in partial]
    ys = [p[1] for p in partial]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    span_x = max_x - min_x
    span_y = max_y - min_y
    if span_x < 10 or span_y < 10:
        cell = max(w, h) / 9
        cx0 = (min_x + max_x) // 2 - int(cell)
        cy0 = (min_y + max_y) // 2 - int(cell)
        step_x = step_y = int(cell)
    else:
        step_x = max(1, span_x // 2)
        step_y = max(1, span_y // 2)
        cx0, cy0 = min_x, min_y
    centers = []
    for r in range(3):
        for c in range(3):
            x = max(2, min(w - 3, cx0 + c * step_x))
            y = max(2, min(h - 3, cy0 + r * step_y))
            centers.append((x, y))
    radius = max(4, min(step_x, step_y) // 5)
    return centers, radius


def _grid_centers_full_image(image_bgr):
    h, w = image_bgr.shape[:2]
    return [(int(w * (2 * c + 1) / 6), int(h * (2 * r + 1) / 6))
            for r in range(3) for c in range(3)]


def _grid_sample_radius(image_bgr):
    h, w = image_bgr.shape[:2]
    return max(4, min(h, w) // 20)


def _estimate_sample_radius(centers):
    if len(centers) < 2:
        return 6
    xs = sorted({c[0] for c in centers})
    ys = sorted({c[1] for c in centers})
    diffs = []
    for arr in (xs, ys):
        for i in range(1, len(arr)):
            d = arr[i] - arr[i - 1]
            if d > 4:
                diffs.append(d)
    if not diffs:
        return 6
    return max(4, int(float(np.median(diffs)) * 0.18))


def _sort_into_3x3(centers):
    if len(centers) != 9:
        return centers
    pts = sorted(centers, key=lambda p: p[1])
    out = []
    for row in (pts[0:3], pts[3:6], pts[6:9]):
        out.extend(sorted(row, key=lambda p: p[0]))
    return out


def _extract_patch(image_bgr, cx, cy, radius):
    h, w = image_bgr.shape[:2]
    x0, y0 = max(0, cx - radius), max(0, cy - radius)
    x1, y1 = min(w, cx + radius + 1), min(h, cy + radius + 1)
    patch = image_bgr[y0:y1, x0:x1]
    if patch.size == 0:
        cx = max(0, min(w - 1, cx))
        cy = max(0, min(h - 1, cy))
        patch = image_bgr[cy:cy + 1, cx:cx + 1]
    return patch


def _summarize_patch(patch_bgr):
    hsv = cv2.cvtColor(patch_bgr, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(patch_bgr, cv2.COLOR_BGR2LAB)
    h_px = hsv[:, :, 0].flatten().astype(np.int32)
    s_px = hsv[:, :, 1].flatten().astype(np.int32)
    v_px = hsv[:, :, 2].flatten().astype(np.int32)
    l_px = lab[:, :, 0].flatten().astype(np.int32)
    a_px = lab[:, :, 1].flatten().astype(np.int32)
    b_px = lab[:, :, 2].flatten().astype(np.int32)
    if v_px.size >= 7:
        order = np.argsort(v_px)
        trim = max(1, len(order) // 7)
        keep = order[trim:-trim] if len(order) > 2 * trim else order
        h_px, s_px, v_px = h_px[keep], s_px[keep], v_px[keep]
        l_px, a_px, b_px = l_px[keep], a_px[keep], b_px[keep]
    return {
        "h": _circular_median_hue(h_px),
        "s": int(np.median(s_px)) if s_px.size else 0,
        "v": int(np.median(v_px)) if v_px.size else 0,
        "l": int(np.median(l_px)) if l_px.size else 0,
        "a": int(np.median(a_px)) if a_px.size else 128,
        "b": int(np.median(b_px)) if b_px.size else 128,
    }


def _circular_median_hue(hues):
    if hues.size == 0:
        return 0
    angles = hues.astype(np.float64) * (2 * np.pi / 180.0)
    x = np.cos(angles).mean()
    y = np.sin(angles).mean()
    a = np.arctan2(y, x)
    if a < 0:
        a += 2 * np.pi
    return int(round(a * 180.0 / (2 * np.pi))) % 180


def _hue_distance(h1, h2):
    d = abs(h1 - h2)
    return min(d, 180 - d)


def _color_score(sample, ref_h, ref_s, ref_v):
    dh = _hue_distance(sample["h"], ref_h)
    ds = abs(sample["s"] - ref_s) / 6.0
    dv = abs(sample["v"] - ref_v) / 6.0
    return dh * dh + ds * ds + dv * dv


def _closest_color(sample):
    h = sample["h"]
    s = sample["s"]
    if s >= 90:
        if h < 8 or h >= 160:
            return "R"
        if 8 <= h < 22:
            return "L"
        if 22 <= h < 40:
            return "D"
        if 40 <= h < 88:
            return "F"
        if 88 <= h < 140:
            return "B"
        return "R"
    best = None
    best_score = None
    for label, (rh, rs, rv) in REF.items():
        score = _color_score(sample, rh, rs, rv)
        if best_score is None or score < best_score:
            best_score = score
            best = label
    return best


def _classify_samples(samples):
    n = len(samples)
    labels = [None] * n
    for i, s in enumerate(samples):
        if s["s"] < 85 and s["v"] > 110:
            labels[i] = "U"
            continue
        if s["s"] <= 55 and s["v"] > 50:
            labels[i] = "U"
    for i, s in enumerate(samples):
        if labels[i] is None:
            labels[i] = _closest_color(s)
    return labels