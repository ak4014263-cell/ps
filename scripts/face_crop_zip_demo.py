"""
Demo script: upload a ZIP of images (or provide path), process first image by
- background removal (rembg if available, otherwise GrabCut fallback)
- face crop (Haar cascade fallback)
- beautify (nuclear pop + bilateral blend)
- logo overlay (optional)

Produces a collage image showing: original | bg_removed | face_cropped | beautified | logo_overlay
Saves outputs in `output_demo/` and writes `output_demo.zip`.

Usage (CLI):
  python scripts/face_crop_zip_demo.py --zip path/to/input.zip --logo path/to/logo.png

In Colab, omit args and upload via the interactive prompt when prompted.
"""

import os
import sys
import zipfile
import tempfile
import argparse
import shutil
import io

try:
    from google.colab import files as colab_files  # type: ignore
    IN_COLAB = True
except Exception:
    IN_COLAB = False

import cv2
import numpy as np
from PIL import Image


# --- Image utilities -------------------------------------------------

def read_image(path_or_bytes):
    if isinstance(path_or_bytes, (bytes, bytearray)):
        arr = np.frombuffer(path_or_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    else:
        img = cv2.imdecode(np.fromfile(path_or_bytes, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f'Could not read image: {path_or_bytes}')
    # Convert BGRA->BGR
    if img.ndim == 3 and img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return img


def save_image_bgr(path, img_bgr):
    # Ensure directory
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    # Use imwrite
    cv2.imencode(os.path.splitext(path)[1] or '.jpg', img_bgr)[1].tofile(path)


# --- Background removal (try rembg, fallback to GrabCut) ------------

def remove_background(img_bgr):
    try:
        from rembg import remove  # type: ignore
        print('[bgremove] Using rembg remove()')
        rgba = remove(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        # rembg returns RGBA bytes or PIL image depending on version; handle both
        if isinstance(rgba, bytes):
            arr = np.frombuffer(rgba, np.uint8)
            pil = Image.open(io.BytesIO(arr)).convert('RGBA')
            out = cv2.cvtColor(np.array(pil), cv2.COLOR_RGBA2BGRA)
        else:
            # assume PIL.Image
            pil = rgba.convert('RGBA')
            out = cv2.cvtColor(np.array(pil), cv2.COLOR_RGBA2BGRA)
        # Convert to BGR with white background
        bgr = cv2.cvtColor(out, cv2.COLOR_RGBA2BGR)
        # For visualization, place white where alpha was 0
        if out.shape[2] == 4:
            alpha = out[:, :, 3] / 255.0
            bgr = (bgr.astype(np.float32) * np.expand_dims(alpha, axis=2) + 255 * (1 - np.expand_dims(alpha, axis=2))).astype(np.uint8)
        return bgr
    except Exception as e:
        print('[bgremove] rembg not available or failed:', e)
        print('[bgremove] Falling back to GrabCut (approximate)')
        # GrabCut fallback
        mask = np.zeros(img_bgr.shape[:2], np.uint8)
        h, w = img_bgr.shape[:2]
        rect = (int(w*0.05), int(h*0.05), int(w*0.9), int(h*0.9))
        bgdModel = np.zeros((1,65), np.float64)
        fgdModel = np.zeros((1,65), np.float64)
        try:
            cv2.grabCut(img_bgr, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)
            mask2 = np.where((mask==2)|(mask==0), 0, 1).astype('uint8')
            img_nobg = img_bgr * mask2[:, :, np.newaxis]
            # composite on white
            white = np.ones_like(img_bgr, dtype=np.uint8) * 255
            comp = np.where(mask2[:, :, np.newaxis]==1, img_bgr, white)
            return comp
        except Exception as ge:
            print('[bgremove] GrabCut failed:', ge)
            return img_bgr


# --- Face crop using Haar cascade ----------------------------------

def face_crop_center(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(80,80))
    h, w = img_bgr.shape[:2]
    if len(faces) == 0:
        print('[facecrop] No face found; returning center crop')
        # center crop to square
        side = min(h, w)
        cy, cx = h//2, w//2
        y1 = max(0, cy - side//2)
        x1 = max(0, cx - side//2)
        crop = img_bgr[y1:y1+side, x1:x1+side]
        return crop
    # choose largest face
    faces = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)
    x, y, fw, fh = faces[0]
    # Expand box to include shoulders
    pad_x = int(fw * 0.8)
    pad_y = int(fh * 1.2)
    x1 = max(0, x - pad_x//2)
    y1 = max(0, y - pad_y//4)
    x2 = min(w, x + fw + pad_x//2)
    y2 = min(h, y + fh + pad_y//2)
    crop = img_bgr[y1:y2, x1:x2]
    return crop


# --- Beautify functions (nuclear pop + bilateral blend) ------------

def nuclear_pop_lab(img_bgr, iterations=2):
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l_f = l.astype(np.float32) / 255.0
    for _ in range(int(iterations)):
        l_f = l_f + 0.15 * l_f * (1.0 - l_f)
    l_final = (np.clip(l_f, 0, 1) * 255).astype(np.uint8)
    return cv2.cvtColor(cv2.merge((l_final, a, b)), cv2.COLOR_LAB2BGR)


def apply_beauty_v2(img_bgr, beauty_percent=0.8):
    final_f = img_bgr.astype(np.float32) / 255.0
    tmp = np.clip(final_f * 255.0, 0, 255).astype(np.uint8)
    smoothed = cv2.bilateralFilter(tmp, d=7, sigmaColor=75, sigmaSpace=75)
    smoothed_f = smoothed.astype(np.float32) / 255.0
    blend = beauty_percent * 0.5
    res = (final_f * (1 - blend) + smoothed_f * blend) * 255.0
    return np.clip(res, 0, 255).astype(np.uint8)


# --- Logo overlay (RGB inputs) -------------------------------------

def apply_logo_overlay(final_rgb, branding_local):
    if not branding_local or branding_local.get('logo') is None:
        return final_rgb
    logo = branding_local['logo']
    if logo is None:
        return final_rgb
    if logo.dtype != np.uint8:
        logo = (np.clip(logo, 0, 255)).astype(np.uint8)
    h, w = final_rgb.shape[:2]
    ref = 1024
    lh = max(1, int(ref * 0.18 * (h / ref)))
    lw = max(1, int(ref * 0.18 * (w / ref)))
    s_logo = cv2.resize(logo, (lw, lh), interpolation=cv2.INTER_AREA)
    pos = branding_local.get('logo_pos', 'Top Right')
    y1 = 40
    x1 = w - lw - 40 if 'Right' in pos else 40
    # If logo has alpha channel
    if s_logo.ndim == 3 and s_logo.shape[2] == 3:
        final_rgb[y1:y1+lh, x1:x1+lw] = s_logo
    else:
        # handle potential alpha
        alpha = None
        if s_logo.ndim == 3 and s_logo.shape[2] == 4:
            alpha = s_logo[:, :, 3] / 255.0
            rgb_logo = s_logo[:, :, :3]
        else:
            rgb_logo = s_logo
        if alpha is None:
            final_rgb[y1:y1+lh, x1:x1+lw] = rgb_logo
        else:
            for c in range(3):
                final_rgb[y1:y1+lh, x1:x1+lw, c] = (
                    alpha * rgb_logo[:, :, c] + (1 - alpha) * final_rgb[y1:y1+lh, x1:x1+lw, c]
                ).astype(np.uint8)
    return final_rgb


# --- Collage helper -------------------------------------------------

def make_collage(images, thumb_h=512, gap=10):
    thumbs = []
    for img in images:
        # convert BGR to RGB for PIL
        if img is None:
            img = np.ones((thumb_h, thumb_h, 3), dtype=np.uint8) * 200
        # resize keeping aspect
        h, w = img.shape[:2]
        scale = thumb_h / h
        new_w = int(w * scale)
        resized = cv2.resize(img, (new_w, thumb_h), interpolation=cv2.INTER_AREA)
        thumbs.append(Image.fromarray(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)))
    # compute total width
    total_w = sum(t.size[0] for t in thumbs) + gap * (len(thumbs)-1)
    out = Image.new('RGB', (total_w, thumb_h), (255,255,255))
    x = 0
    for t in thumbs:
        out.paste(t, (x, 0))
        x += t.size[0] + gap
    return out


# --- Main processing ------------------------------------------------

def process_first_image_from_zip(zip_path, logo_path=None, output_dir='output_demo'):
    tmpdir = tempfile.mkdtemp(prefix='fc_demo_')
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            names = [n for n in z.namelist() if n.lower().endswith(('.jpg', '.jpeg', '.png'))]
            if not names:
                raise RuntimeError('No images found in ZIP')
            first = names[0]
            with z.open(first) as f:
                data = f.read()
            img_bgr = read_image(data)
        os.makedirs(output_dir, exist_ok=True)

        # BG remove
        bg_removed = remove_background(img_bgr)
        save_image_bgr(os.path.join(output_dir, 'bg_removed.png'), bg_removed)

        # Face crop
        face_cropped = face_crop_center(bg_removed)
        save_image_bgr(os.path.join(output_dir, 'face_cropped.png'), face_cropped)

        # Beautify (apply nuclear pop then bilateral blend)
        beaut = nuclear_pop_lab(face_cropped, iterations=2)
        beaut = apply_beauty_v2(beaut, beauty_percent=0.8)
        save_image_bgr(os.path.join(output_dir, 'beautified.png'), beaut)

        # Logo overlay
        branding = {'logo': None, 'logo_pos': 'Top Right'}
        if logo_path:
            try:
                logo_img = read_image(logo_path)
                # store as RGB
                branding['logo'] = cv2.cvtColor(logo_img, cv2.COLOR_BGR2RGB)
            except Exception as e:
                print('Failed to read logo:', e)
        else:
            print('No logo provided; skipping overlay')

        overlay_rgb = cv2.cvtColor(beaut, cv2.COLOR_BGR2RGB)
        overlayed = apply_logo_overlay(overlay_rgb, branding)
        # convert back to BGR for saving
        overlay_bgr = cv2.cvtColor(overlayed, cv2.COLOR_RGB2BGR)
        save_image_bgr(os.path.join(output_dir, 'logo_overlay.png'), overlay_bgr)

        # Make collage
        collage = make_collage([img_bgr, bg_removed, face_cropped, beaut, overlay_bgr], thumb_h=512)
        collage_path = os.path.join(output_dir, 'collage_demo.jpg')
        collage.save(collage_path, quality=90)

        # Zip outputs
        out_zip = os.path.join(output_dir, 'output_demo.zip')
        with zipfile.ZipFile(out_zip, 'w') as outz:
            for fname in ['bg_removed.png', 'face_cropped.png', 'beautified.png', 'logo_overlay.png', 'collage_demo.jpg']:
                outz.write(os.path.join(output_dir, fname), arcname=fname)

        print('Processing complete. Outputs in', output_dir)
        print('Collage:', collage_path)
        return output_dir, collage_path, out_zip
    finally:
        try:
            shutil.rmtree(tmpdir)
        except Exception:
            pass


# --- CLI / Colab interaction ----------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--zip', help='Path to ZIP of images', default=None)
    parser.add_argument('--logo', help='Path to logo image (optional)', default=None)
    parser.add_argument('--out', help='Output directory', default='output_demo')
    args = parser.parse_args()

    if args.zip is None and IN_COLAB:
        print('Running in Colab - please upload a ZIP of images')
        uploaded = colab_files.upload()
        if not uploaded:
            print('No file uploaded - exiting')
            return
        first_key = list(uploaded.keys())[0]
        # save uploaded to temp file
        tmpzip = os.path.join(tempfile.gettempdir(), first_key)
        with open(tmpzip, 'wb') as f:
            f.write(uploaded[first_key])
        zip_path = tmpzip
    elif args.zip is None:
        print('Provide --zip path or run in Colab to upload interactively')
        return
    else:
        zip_path = args.zip

    out_dir, collage, out_zip = process_first_image_from_zip(zip_path, logo_path=args.logo, output_dir=args.out)

    if IN_COLAB:
        from IPython.display import display
        display(Image.open(collage))
        print('Download ZIP:')
        files = colab_files
        if files:
            try:
                colab_files.download(out_zip)
            except Exception:
                print('Could not trigger download; ZIP at', out_zip)
    else:
        print('Done. Check', out_dir)


if __name__ == '__main__':
    main()
