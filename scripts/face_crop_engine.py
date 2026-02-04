"""
Complete ID Card Processing Engine with FaceAnalysis + Advanced Effects
- Face detection & studio alignment (insightface buffalo_l)
- Advanced background removal (rembg with alpha matting)
- Beauty effects (nuclear pop + bilateral blend)
- Hair decontamination
- Glow, watermark grid, shadow matching
- Logo overlay + border
"""

import cv2
import numpy as np
import os
import argparse
from insightface.app import FaceAnalysis
from rembg import remove, new_session

# --- 1. SETUP & REPAIR ---
# Global instances for FaceAnalysis and rembg session
app_ai = None
bg_session = None

def initialize_models():
    global app_ai, bg_session
    if app_ai is None:
        print("Initializing FaceAnalysis model...")
        app_ai = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        app_ai.prepare(ctx_id=0, det_size=(640, 640))
        print("FaceAnalysis model initialized.")
    if bg_session is None:
        print("Initializing RemBG session...")
        bg_session = new_session()
        print("RemBG session initialized.")

# --- 2. INTEGRATED BEAUTY & COLOR FUNCTIONS ---
def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return [int(hex_color[i:i+2], 16) for i in (0, 2, 4)]

def nuclear_pop_lab(img_bgr, iterations=2):
    """Apply LAB L-channel lighting curve for punch."""
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l_f = l.astype(np.float32) / 255.0
    for _ in range(int(iterations)):
        l_f = l_f + 0.15 * l_f * (1.0 - l_f)
    l_final = (np.clip(l_f, 0, 1) * 255).astype(np.uint8)
    return cv2.cvtColor(cv2.merge((l_final, a, b)), cv2.COLOR_LAB2BGR)

def apply_beauty_v2(img_bgr, beauty_percent=0.8):
    """Bilateral blend beauty with reduced contrast."""
    final_f = img_bgr.astype(np.float32) / 255.0
    tmp = np.clip(final_f * 255.0, 0, 255).astype(np.uint8)
    smoothed = cv2.bilateralFilter(tmp, d=7, sigmaColor=75, sigmaSpace=75)
    smoothed_f = smoothed.astype(np.float32) / 255.0
    blend = beauty_percent * 0.5
    res = (final_f * (1 - blend) + smoothed_f * blend) * 255.0
    return np.clip(res, 0, 255).astype(np.uint8)

def decontaminate_hair(img_rgb, alpha):
    """Fix hair edges using inner color estimation."""
    img_f = img_rgb.astype(np.float32)
    inner_mask = cv2.erode(alpha, np.ones((5, 5), np.uint8), iterations=3)
    avg_col = cv2.mean(img_rgb, mask=(inner_mask * 255).astype(np.uint8))[:3]
    color_fix = np.full_like(img_f, avg_col)
    mask_edges = (alpha > 0.05) & (alpha < 0.95)
    img_f[mask_edges] = (img_f[mask_edges] * alpha[mask_edges][..., None] +
                         color_fix[mask_edges] * (1 - alpha[mask_edges][..., None]))
    return np.clip(img_f, 0, 255).astype(np.uint8)

# --- 3. MASTER PROCESSING ENGINE ---
def run_id_engine(img_bgr, settings, branding):
    """Complete pipeline: face detection → alignment → BG removal → beautify → effects → logo overlay."""
    # Ensure models are initialized
    initialize_models()

    # 1. Face Detection & Studio Alignment
    print("  [1/7] Detecting face...")
    faces = app_ai.get(img_bgr)
    if not faces:
        print("  No face detected with FaceAnalysis, trying Haar cascade fallback...")
        try:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            haar = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            rects = haar.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            if len(rects) > 0:
                print(f"  Haar cascade found {len(rects)} faces, using largest bbox")
                x, y, w, h = max(rects, key=lambda r: r[2] * r[3])
                class SimpleFace:
                    pass
                f = SimpleFace()
                f.bbox = np.array([x, y, x + w, y + h], dtype=np.float32)
                # approximate eye keypoints within the bbox
                f.kps = np.array([[x + w * 0.3, y + h * 0.35], [x + w * 0.7, y + h * 0.35]], dtype=np.float32)
                faces = [f]
            else:
                print("  No face detected by Haar either, returning original image.")
                return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        except Exception as e:
            print("  Haar fallback failed:", e)
            return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    face = max(faces, key=lambda x: (x.bbox[2]-x.bbox[0]))
    crop_size = max(face.bbox[2]-face.bbox[0], face.bbox[3]-face.bbox[1]) * settings['padding']
    
    # Calculate rotation based on eye positions
    eye_angle = np.arctan2(face.kps[1][1]-face.kps[0][1], face.kps[1][0]-face.kps[0][0])
    M = cv2.getRotationMatrix2D(((face.kps[0][0]+face.kps[1][0])/2, (face.kps[0][1]+face.kps[1][1])/2),
                               np.degrees(eye_angle), 1.0)
    M[0, 2] += (crop_size/2) - (face.kps[0][0]+face.kps[1][0])/2
    M[1, 2] += (crop_size * settings['headroom']) - (face.bbox[1])
    cropped_bgr = cv2.warpAffine(img_bgr, M, (int(crop_size), int(crop_size)), borderValue=(255, 255, 255))

    # 2. Advanced BG Removal
    print("  [2/7] Removing background...")
    cropped_rgb = cv2.cvtColor(cropped_bgr, cv2.COLOR_BGR2RGB)
    rgba = remove(cropped_rgb, session=bg_session, alpha_matting=True)
    rgba = cv2.resize(rgba, (1024, 1024), interpolation=cv2.INTER_LANCZOS4)
    alpha = rgba[:, :, 3].astype(np.float32) / 255.0
    fg_rgb = rgba[:, :, :3]

    # 3. Beautifier + Nuclear Pop Sequence
    print("  [3/7] Applying beauty effects...")
    fg_rgb = decontaminate_hair(fg_rgb, alpha)
    fg_bgr = cv2.cvtColor(fg_rgb, cv2.COLOR_RGB2BGR)
    fg_bgr = apply_beauty_v2(fg_bgr, beauty_percent=settings['beauty_val'])
    fg_bgr = nuclear_pop_lab(fg_bgr, iterations=settings['pop_iters'])
    fg_rgb_final = cv2.cvtColor(fg_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

    # 4. Background Canvas & Studio Glow
    print("  [4/7] Rendering canvas and glow...")
    bg_rgb = hex_to_rgb(branding['bg_color'])
    canvas = np.full((1024, 1024, 3), bg_rgb, dtype=np.float32)
    h, w = 1024, 1024
    y, x = np.ogrid[:h, :w]
    dist = np.sqrt((x - w//2)**2 + (y - h*0.4)**2)
    glow = np.clip(1 - (dist / 800), 0, 1) ** 2 * (branding['glow'] / 100.0)
    for i in range(3):
        canvas[:, :, i] += (255 - canvas[:, :, i]) * glow

    # 5. Tileable Watermark Grid
    print("  [5/7] Applying watermark...")
    if branding['wm_text']:
        wm_layer = np.zeros((2000, 2000, 3), dtype=np.uint8)
        font = cv2.FONT_HERSHEY_DUPLEX
        tsize = cv2.getTextSize(branding['wm_text'], font, 1.0, 2)[0]
        step_x, step_y = tsize[0] + 160, branding['wm_space']
        for row, y_pos in enumerate(range(0, 2000, step_y)):
            offset = (step_x // 2) if row % 2 == 0 else 0
            for x_pos in range(0, 2000, step_x):
                cv2.putText(wm_layer, branding['wm_text'], (x_pos + offset, y_pos), font, 1.0, (255, 255, 255), 2, cv2.LINE_AA)
        M_rot = cv2.getRotationMatrix2D((1000, 1000), 30, 1.0)
        wm_rot = cv2.warpAffine(wm_layer, M_rot, (2000, 2000))[488:1512, 488:1512]
        wm_mask = (cv2.cvtColor(wm_rot, cv2.COLOR_RGB2GRAY) > 0).astype(np.float32) * 0.15
        for i in range(3):
            canvas[:, :, i] = canvas[:, :, i] * (1 - wm_mask) + wm_rot[:, :, i] * wm_mask

    # 6. Realistic Shadow Matching
    print("  [6/7] Compositing foreground with shadow...")
    shadow_mask = cv2.GaussianBlur(alpha, (51, 51), 15) * 0.45
    shadow_v = np.zeros_like(shadow_mask)
    shadow_v[18:, 18:] = shadow_mask[:-18, :-18]
    sh_rgb = hex_to_rgb(branding['sh_color'])
    final = np.zeros_like(canvas)
    for i in range(3):
        bg_layer = canvas[:, :, i] * (1 - shadow_v) + (sh_rgb[i] * shadow_v)
        final[:, :, i] = fg_rgb_final[:, :, i] * alpha + bg_layer * (1 - alpha)

    # 7. School Logo Overlay
    print("  [7/7] Applying logo and border...")
    final_rgb = np.clip(final, 0, 255).astype(np.uint8)
    if branding['logo'] is not None:
        logo = branding['logo']
        lh, lw = int(1024 * 0.18), int(1024 * 0.18)
        s_logo = cv2.resize(logo, (lw, lh))
        y1, x1 = (40, 1024 - lw - 40) if "Right" in branding['logo_pos'] else (40, 40)
        final_rgb[y1:y1+lh, x1:x1+lw] = s_logo
    
    # Black border
    cv2.rectangle(final_rgb, (0, 0), (1023, 1023), (0, 0, 0), 12)
    return final_rgb

def process_images_standalone(input_path, output_path, config):
    """Process single image or directory of images."""
    os.makedirs(output_path, exist_ok=True)

    global_logo = config.get('logo', None)

    # Default settings, can be overridden by config
    settings = {
        'padding': config.get('padding', 3.5),
        'headroom': config.get('headroom', 0.25),
        'beauty_val': config.get('beauty_val', 0.8),
        'pop_iters': config.get('pop_iters', 2)
    }
    branding = {
        'bg_color': config.get('bg_color', '#FFFFFF'),
        'sh_color': config.get('sh_color', '#222222'),
        'wm_text': config.get('wm_text', 'OFFICIAL ID'),
        'wm_space': config.get('wm_space', 180),
        'glow': config.get('glow', 40),
        'logo': global_logo,
        'logo_pos': config.get('logo_pos', 'Top Right')
    }

    if os.path.isdir(input_path):
        image_files = [f for f in os.listdir(input_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if not image_files:
            print(f"No image files found in {input_path}")
            return
        for filename in image_files:
            img_path = os.path.join(input_path, filename)
            img_bgr = cv2.imread(img_path)
            if img_bgr is None:
                print(f"Warning: Could not read image {img_path}. Skipping.")
                continue
            print(f"Processing {filename}...")
            res_rgb = run_id_engine(img_bgr, settings, branding)
            output_filepath = os.path.join(output_path, filename)
            cv2.imwrite(output_filepath, cv2.cvtColor(res_rgb, cv2.COLOR_RGB2BGR))
            print(f"Saved: {output_filepath}")
    elif os.path.isfile(input_path) and input_path.lower().endswith(('.png', '.jpg', '.jpeg')):
        filename = os.path.basename(input_path)
        img_bgr = cv2.imread(input_path)
        if img_bgr is None:
            print(f"Error: Could not read image {input_path}. Exiting.")
            return
        print(f"Processing {filename}...")
        res_rgb = run_id_engine(img_bgr, settings, branding)
        output_filepath = os.path.join(output_path, filename)
        cv2.imwrite(output_filepath, cv2.cvtColor(res_rgb, cv2.COLOR_RGB2BGR))
        print(f"Saved: {output_filepath}")
    else:
        print("Error: Input path must be a valid image file or a directory containing images.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process ID card images with FaceAnalysis + advanced effects.')
    parser.add_argument('--input', type=str, required=True, help='Path to input image file or directory.')
    parser.add_argument('--output', type=str, required=True, help='Path to output directory for processed images.')
    parser.add_argument('--bg_color', type=str, default='#FFFFFF', help='Background color in hex (e.g., #FFFFFF).')
    parser.add_argument('--sh_color', type=str, default='#222222', help='Shadow color in hex.')
    parser.add_argument('--wm_text', type=str, default='OFFICIAL ID', help='Watermark text.')
    parser.add_argument('--wm_space', type=int, default=180, help='Watermark vertical spacing.')
    parser.add_argument('--glow', type=float, default=40, help='Glow intensity (0-100).')
    parser.add_argument('--beauty_val', type=float, default=0.8, help='Beauty effect intensity (0.0-1.0).')
    parser.add_argument('--pop_iters', type=int, default=2, help='Nuclear pop iterations.')
    parser.add_argument('--padding', type=float, default=3.5, help='Face crop padding multiplier.')
    parser.add_argument('--headroom', type=float, default=0.25, help='Headroom proportion in crop.')
    parser.add_argument('--logo', type=str, help='Optional: Path to logo image file.')
    parser.add_argument('--logo_pos', type=str, default='Top Right', help='Logo position (Top Left / Top Right).')

    args = parser.parse_args()

    # Load logo if provided
    loaded_logo = None
    if args.logo and os.path.isfile(args.logo):
        logo_img = cv2.imread(args.logo)
        if logo_img is not None:
            loaded_logo = cv2.cvtColor(logo_img, cv2.COLOR_BGR2RGB)
            print(f"Loaded logo from {args.logo}")
        else:
            print(f"Warning: Could not load logo from {args.logo}.")

    config = {
        'bg_color': args.bg_color,
        'sh_color': args.sh_color,
        'wm_text': args.wm_text,
        'wm_space': args.wm_space,
        'glow': args.glow,
        'beauty_val': args.beauty_val,
        'pop_iters': args.pop_iters,
        'padding': args.padding,
        'headroom': args.headroom,
        'logo': loaded_logo,
        'logo_pos': args.logo_pos,
    }

    process_images_standalone(args.input, args.output, config)
