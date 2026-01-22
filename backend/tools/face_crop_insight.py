import argparse
import json
import os
import sys
import traceback

import cv2
import numpy as np

try:
    import insightface
    from insightface.app import FaceAnalysis
except Exception as e:  # pragma: no cover - environment issue
    print(json.dumps({"success": False, "error": f"insightface import failed: {e}"}))
    sys.exit(1)


def crop_face_with_buffalo_l(
    input_path: str,
    output_path: str,
    padding_pct: float = 20.0,
    out_w: int = 300,
    out_h: int = 300,
):
    if not os.path.exists(input_path):
        return {"success": False, "error": f"Input file not found: {input_path}"}

    img = cv2.imread(input_path)
    if img is None:
        return {"success": False, "error": "Failed to read input image"}

    try:
        app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        # Larger det_size helps with small/partial faces
        app.prepare(ctx_id=0, det_size=(640, 640))
    except Exception as e:
        return {"success": False, "error": f"Failed to load buffalo_l: {e}"}

    faces = app.get(img) or []
    if not faces:
        return {"success": False, "error": "No face detected"}

    # Pick highest confidence face
    face = max(faces, key=lambda f: getattr(f, "det_score", 0))
    det_score = getattr(face, "det_score", 0)

    # Use bbox to crop; pad by percentage of bbox size
    bbox = face.bbox  # [x1, y1, x2, y2]
    x1, y1, x2, y2 = map(float, bbox)
    w = x2 - x1
    h = y2 - y1
    pad = max(w, h) * (padding_pct / 100.0)

    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0

    crop_x1 = max(0, int(cx - w / 2 - pad))
    crop_y1 = max(0, int(cy - h / 2 - pad))
    crop_x2 = min(img.shape[1], int(cx + w / 2 + pad))
    crop_y2 = min(img.shape[0], int(cy + h / 2 + pad))

    if crop_x2 <= crop_x1 or crop_y2 <= crop_y1:
        return {"success": False, "error": "Invalid crop region"}

    cropped = img[crop_y1:crop_y2, crop_x1:crop_x2]
    if cropped.size == 0:
        return {"success": False, "error": "Empty crop"}

    # Resize to target size
    resized = cv2.resize(
        cropped, (out_w, out_h), interpolation=cv2.INTER_AREA
    )

    # Ensure output directory exists
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    cv2.imwrite(output_path, resized)
    return {
        "success": True,
        "det_score": float(det_score),
        "bbox": [float(x1), float(y1), float(x2), float(y2)],
        "output": output_path,
        "width": out_w,
        "height": out_h,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Face crop using InsightFace buffalo_l"
    )
    parser.add_argument("input", help="Input image path")
    parser.add_argument("output", help="Output image path")
    parser.add_argument(
        "--padding",
        type=float,
        default=20.0,
        help="Padding percentage around detected face (default 20%)",
    )
    parser.add_argument("--width", type=int, default=300, help="Output width")
    parser.add_argument("--height", type=int, default=300, help="Output height")

    args = parser.parse_args()

    try:
        result = crop_face_with_buffalo_l(
            args.input,
            args.output,
            padding_pct=args.padding,
            out_w=args.width,
            out_h=args.height,
        )
        print(json.dumps(result))
        sys.exit(0 if result.get("success") else 1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
