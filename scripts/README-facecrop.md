face_crop_engine — advanced ID card processing pipeline

Complete photo ID processing with FaceAnalysis + effects:
- Face detection & studio alignment (InsightFace buffalo_l model)
- Advanced background removal (rembg with alpha matting)
- Beautification (nuclear pop + bilateral blend)
- Hair decontamination (edge color fixing)
- Studio glow effect
- Watermark grid (tileable, rotated)
- Shadow matching
- Logo overlay with border

Files:
- `scripts/face_crop_engine.py` — main production engine (CLI + Python API)
- `scripts/face_crop_zip_demo.py` — demo that shows each step in a collage
- `scripts/face_crop_colab.py` — Colab UI helper for logo/image upload

## Production Engine (face_crop_engine.py)

Quick CLI:

```bash
# Single image
python scripts/face_crop_engine.py --input photo.jpg --output ./out

# Directory of images
python scripts/face_crop_engine.py --input ./photos --output ./processed

# With custom settings and logo
python scripts/face_crop_engine.py \
  --input photo.jpg \
  --output ./out \
  --bg_color "#FFFFFF" \
  --sh_color "#333333" \
  --wm_text "OFFICIAL ID" \
  --glow 50 \
  --beauty_val 0.8 \
  --logo logo.png \
  --logo_pos "Top Right"
```

All CLI options:
```
--input PATH              Input image or directory (required)
--output PATH             Output directory (required)
--bg_color HEX            Background color, e.g. #FFFFFF (default: white)
--sh_color HEX            Shadow color, e.g. #222222 (default: dark gray)
--wm_text TEXT            Watermark text (default: "OFFICIAL ID")
--wm_space INT            Watermark vertical spacing (default: 180)
--glow FLOAT              Glow intensity 0-100 (default: 40)
--beauty_val FLOAT        Beauty strength 0.0-1.0 (default: 0.8)
--pop_iters INT           Nuclear pop iterations (default: 2)
--padding FLOAT           Face crop padding multiplier (default: 3.5)
--headroom FLOAT          Headroom in crop, 0-1 (default: 0.25)
--logo PATH               Optional logo image
--logo_pos STR            Logo position: "Top Left" or "Top Right" (default: Top Right)
```

## Demo Script (face_crop_zip_demo.py)

Process a ZIP and visualize each step:

```bash
python scripts/face_crop_zip_demo.py --zip images.zip --logo logo.png --out output_demo
```

Output: collage image showing original → bg_removed → face_cropped → beautified → logo_overlay

## Server Endpoints (backend)

Curl examples (endpoints in `backend/routes/image-tools.js`):

```bash
# Beautify (with nuclear pop + bilateral blend):
curl -F "image=@/path/photo.jpg" -F "strength=0.7" -F "mode=portrait" http://localhost:3001/api/image/beautify --output beautified.jpg

# Face crop (calls school_id_processor_cli.py):
curl -F "image=@/path/photo.jpg" http://localhost:3001/api/image/face-crop
```

Colab usage:
1. Upload `scripts/face_crop_colab.py` to Colab and run:

```python
from face_crop_colab import *
```

2. Use the UI to upload a logo and an image, choose position, then click "Apply Logo Overlay". The UI displays the result inline and prints the status.

Dependencies (recommended Python packages):
- insightface (buffalo_l model for face detection & alignment)
- rembg (advanced background removal)
- opencv-python-headless or opencv-python
- numpy
- pillow

Install via:

```bash
pip install insightface rembg opencv-python-headless numpy pillow
```

Notes:
- The engine is production-ready and uses GPU if available (`CPUExecutionProvider` is the fallback).
- Models are cached on first run; subsequent runs are faster.
- Output images are 1024x1024 with high-quality JPEG compression (95% quality).
- All parameters are CLI-configurable and sensible defaults are provided.
- For server deployment, use the backend endpoints which call the engine via subprocess.

