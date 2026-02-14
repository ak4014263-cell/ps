import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
from insightface.utils import face_align
import os
import sys
import traceback

print("=== PASSPORT CROP SCRIPT STARTED ===", flush=True)

# ================================================================
#           INDIAN PASSPORT / VISA PHOTO CROPPER - 2026 EDITION
# ================================================================
# Tuned especially for Passport Seva / VFS / BLS + kindergarten students
# Key updates:
#   - Strong hair protection (top)
#   - Guaranteed visible top of shoulders (bottom padding increased for ALL)
#   - Extra bottom padding for children to show more upper shoulders
#   - Head ~73–78% of frame (safe modern range)
# ================================================================

# ─── CONFIGURATION ──────────────────────────────────────────────────────────
FINAL_SIZE = 600                    # Final square size (600–1000 recommended)

EYE_FROM_TOP_RATIO    = 0.40        # Modern sweet spot (38–42%) - updated 2026
FACE_HEIGHT_RATIO     = 0.75        # Safe center of 70–80% zone

MIN_CONFIDENCE        = 0.30        # LOWERED for better detection (was 0.45)

# Safety margins - critical for compliance
SAFETY_PADDING_TOP    = 0.145       # Strong hair protection
SAFETY_PADDING_BOTTOM = 0.125       # ← INCREASED: Ensures top of shoulders visible for ALL
SAFETY_PADDING_SIDES  = 0.095

# Hard minimums
MIN_PIXELS_ABOVE_HAIR = 40          # Increased for better hair safety
MIN_HEAD_COVERAGE     = 0.725       # Slightly relaxed to allow more bottom padding

# Child-specific
REFERENCE_ADULT_HEIGHT = 320
EXTRA_CHILD_PADDING_TOP = 0.085
POSE_THRESHOLD = 15                 # degrees

DEBUG_VISUALIZE = True

# ================================================================

def ensure_white_background(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)
    if mean_brightness > 240:
        return img
    print(f"Warning: Background mean brightness low ({mean_brightness:.1f}). "
          "Consider using white background replacement tool.")
    return img


def crop_auto_id_photo(
    input_path,
    output_path=None,
    final_size=FINAL_SIZE,
    debug=DEBUG_VISUALIZE
):
    print(f"[DEBUG] crop_auto_id_photo called with input_path={input_path}", flush=True)
    
    try:
        print("[DEBUG] Creating FaceAnalysis app...", flush=True)
        app = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']
        )
        print("[DEBUG] Preparing FaceAnalysis with larger det_size...", flush=True)
        app.prepare(ctx_id=0, det_size=(640, 640))  # Bigger for better detection
        print("[DEBUG] FaceAnalysis ready", flush=True)

        print(f"[DEBUG] Reading image from: {input_path}", flush=True)
        img = cv2.imread(input_path)
        if img is None:
            print(f"Error: Cannot read image: {input_path}", flush=True)
            return None
        
        print(f"[DEBUG] Image shape: {img.shape}", flush=True)

        print("[DEBUG] Running face detection...", flush=True)
        faces = app.get(img)
        print(f"[DEBUG] Raw faces detected: {len(faces) if faces else 0}", flush=True)
        
        if faces:
            for i, face in enumerate(faces):
                score = face.det_score if hasattr(face, 'det_score') else 'N/A'
                print(f"[DEBUG] Face {i}: score={score}", flush=True)
        
        if not faces:
            print("No face detected.", flush=True)
            return None

        face = max(faces, key=lambda f: f.det_score)
        print(f"[DEBUG] Best face score: {face.det_score:.3f}", flush=True)
        
        if face.det_score < MIN_CONFIDENCE:
            print(f"Best face confidence too low: {face.det_score:.3f}", flush=True)
            return None

        # Pose awareness
        orig_pose = face.get('pose', [0, 0, 0])
        print(f"Head pose: yaw={orig_pose[0]:.1f}, pitch={orig_pose[1]:.1f}, roll={orig_pose[2]:.1f}")

        # Dynamic pose-based padding (use local variables to avoid global modification)
        safety_padding_top = SAFETY_PADDING_TOP
        safety_padding_bottom = SAFETY_PADDING_BOTTOM
        safety_padding_sides = SAFETY_PADDING_SIDES

        if max(map(abs, orig_pose)) > POSE_THRESHOLD:
            print("Extreme head pose → extra safety padding")
            safety_padding_top += 0.04
            safety_padding_bottom += 0.04
            safety_padding_sides += 0.025

        # Align face (standard 512×512)
        aligned_512 = face_align.norm_crop(img, landmark=face.kps, image_size=512)

        # Get landmarks - buffalo_l has kps (5 or 106 points depending on config)
        # For now, use simple bounding box approach
        kps = face.kps  # Will be 5 points: [[x,y], ...] 
        print(f"[DEBUG] Available landmarks: {len(kps)} points", flush=True)
        
        # More stable eye position estimation from bounding box
        # Use face bbox to estimate eye position
        bbox = face.bbox  # [x1, y1, x2, y2]
        face_width = bbox[2] - bbox[0]
        face_height = bbox[3] - bbox[1]
        
        # Estimated eye y position (typically 1/3 from top of face)
        eye_y = bbox[1] + (face_height * 0.35)
        
        # Hair top and chin bottom from bbox
        hair_top_y = bbox[1] - face_height * 0.05  # slightly above bbox
        chin_y = bbox[3] + face_height * 0.05      # slightly below bbox

        # ─── Child / Kindergarten detection & adjustments ───────────────────────
        FACE_HEIGHT_RATIO_local = FACE_HEIGHT_RATIO
        child_detected = False

        if face_height < REFERENCE_ADULT_HEIGHT * 0.85:  # kindergarten range
            child_detected = True
            FACE_HEIGHT_RATIO_local = min(0.82, FACE_HEIGHT_RATIO + 0.05)
            safety_padding_top += EXTRA_CHILD_PADDING_TOP
            # Extra bottom padding → shows more shoulders/upper chest
            safety_padding_bottom += 0.035  # total ≈ 0.16 (very good for kids)
            print(f"Kindergarten/child detected (face h={face_height:.1f}) → "
                  f"extra top & bottom padding | new head ratio={FACE_HEIGHT_RATIO_local:.3f}")

        elif face_height < REFERENCE_ADULT_HEIGHT:
            child_detected = True
            extra_top = ((REFERENCE_ADULT_HEIGHT - face_height) / REFERENCE_ADULT_HEIGHT) * EXTRA_CHILD_PADDING_TOP
            safety_padding_top += extra_top
            safety_padding_bottom += 0.015  # mild extra for older children
            print(f"Small face detected → extra padding (top +{extra_top:.3f}, bottom +0.015)")

        # Center based on bbox
        face_center_x = (bbox[0] + bbox[2]) / 2
        face_center_y = eye_y + face_height * 0.12

        # Desired scaled sizes
        desired_face_height_px = final_size * FACE_HEIGHT_RATIO_local
        scale = desired_face_height_px / face_height

        desired_top_to_eye_px = final_size * EYE_FROM_TOP_RATIO
        scaled_eye_y = eye_y * scale
        y_top_scaled = scaled_eye_y - desired_top_to_eye_px
        y_top = y_top_scaled / scale

        # HAIR PROTECTION (multi-layer)
        y_top = min(y_top, hair_top_y - face_height * safety_padding_top)
        y_top = min(y_top, hair_top_y - MIN_PIXELS_ABOVE_HAIR)

        y_bottom = chin_y + face_height * safety_padding_bottom

        # Shoulder visibility safety check
        current_scaled_height = (y_bottom - y_top) * scale
        if current_scaled_height < final_size * MIN_HEAD_COVERAGE:
            print("Head coverage below minimum → expanding (mostly top)")
            missing = (final_size * MIN_HEAD_COVERAGE - current_scaled_height) / scale
            y_top    -= missing * 0.65
            y_bottom += missing * 0.35

        # Sides
        half_w = (final_size * 0.70 / 2) / scale
        half_w += face_width * safety_padding_sides

        x_left  = face_center_x - half_w
        x_right = face_center_x + half_w

        # Clamp to image bounds
        x_left   = max(0, x_left)
        x_right  = min(512, x_right)
        y_top    = max(0, y_top)
        y_bottom = min(512, y_bottom)

        if y_bottom <= y_top or x_right <= x_left:
            print("Invalid crop dimensions after clamping")
            return None

        cropped = aligned_512[int(y_top):int(y_bottom), int(x_left):int(x_right)]

        if cropped.size == 0:
            print("Empty crop result")
            return None

        # Final high-quality resize
        result = cv2.resize(cropped, (final_size, final_size),
                            interpolation=cv2.INTER_LANCZOS4)

        result = ensure_white_background(result)
        # Optional crispness for passport look
        result = cv2.detailEnhance(result, sigma_s=10, sigma_r=0.15)

        # Debug saves
        if debug and output_path:
            debug_dir = "debug_id_crop"
            os.makedirs(debug_dir, exist_ok=True)
            base = os.path.splitext(os.path.basename(input_path))[0]
            cv2.imwrite(f"{debug_dir}/{base}_01_orig.jpg", img)
            cv2.imwrite(f"{debug_dir}/{base}_02_aligned.jpg", aligned_512)
            cv2.imwrite(f"{debug_dir}/{base}_03_cropped.jpg", cropped)
            cv2.imwrite(f"{debug_dir}/{base}_04_final.jpg", result)
            print(f"Debug images saved in: {debug_dir}/")

        if output_path:
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            if cv2.imwrite(output_path, result):
                print(f"Success -> Saved: {output_path}")
            else:
                print(f"Failed to save: {output_path}")

        return result
    
    except Exception as e:
        print(f"[DEBUG] Exception in crop_auto_id_photo: {str(e)}", flush=True)
        traceback.print_exc()
        return None
    print(f"Head pose: yaw={orig_pose[0]:.1f}, pitch={orig_pose[1]:.1f}, roll={orig_pose[2]:.1f}")

    # Dynamic pose-based padding (use local variables to avoid global modification)
    safety_padding_top = SAFETY_PADDING_TOP
    safety_padding_bottom = SAFETY_PADDING_BOTTOM
    safety_padding_sides = SAFETY_PADDING_SIDES

    if max(map(abs, orig_pose)) > POSE_THRESHOLD:
        print("Extreme head pose → extra safety padding")
        safety_padding_top += 0.04
        safety_padding_bottom += 0.04
        safety_padding_sides += 0.025

    # Align face (standard 512×512)
    aligned_512 = face_align.norm_crop(img, landmark=face.kps, image_size=512)

    # Re-detect for precise 106 landmarks
    aligned_faces = app.get(aligned_512)
    if not aligned_faces:
        print("Lost face after alignment")
        return None

    aligned_face = aligned_faces[0]
    kps = aligned_face.kps  # 106 landmarks

    # More stable eye position (average of multiple eye points)
    eye_points = [33, 133, 36, 39, 42, 45]  # left & right eye corners
    eye_y = np.mean([kps[i][1] for i in eye_points])

    hair_top_y = np.min(kps[:, 1])
    chin_y     = np.max(kps[:, 1])

    face_width  = np.max(kps[:, 0]) - np.min(kps[:, 0])
    face_height = chin_y - hair_top_y

    # ─── Child / Kindergarten detection & adjustments ───────────────────────
    FACE_HEIGHT_RATIO_local = FACE_HEIGHT_RATIO
    child_detected = False

    if face_height < REFERENCE_ADULT_HEIGHT * 0.85:  # kindergarten range
        child_detected = True
        FACE_HEIGHT_RATIO_local = min(0.82, FACE_HEIGHT_RATIO + 0.05)
        safety_padding_top += EXTRA_CHILD_PADDING_TOP
        # Extra bottom padding → shows more shoulders/upper chest
        safety_padding_bottom += 0.035  # total ≈ 0.16 (very good for kids)
        print(f"Kindergarten/child detected (face h={face_height:.1f}) → "
              f"extra top & bottom padding | new head ratio={FACE_HEIGHT_RATIO_local:.3f}")

    elif face_height < REFERENCE_ADULT_HEIGHT:
        child_detected = True
        extra_top = ((REFERENCE_ADULT_HEIGHT - face_height) / REFERENCE_ADULT_HEIGHT) * EXTRA_CHILD_PADDING_TOP
        safety_padding_top += extra_top
        safety_padding_bottom += 0.015  # mild extra for older children
        print(f"Small face detected → extra padding (top +{extra_top:.3f}, bottom +0.015)")

    # Center based on eyes + slight downward bias for natural look
    face_center_x = np.mean(kps[:, 0])
    face_center_y = eye_y + face_height * 0.12

    # Desired scaled sizes
    desired_face_height_px = final_size * FACE_HEIGHT_RATIO_local
    scale = desired_face_height_px / face_height

    desired_top_to_eye_px = final_size * EYE_FROM_TOP_RATIO
    scaled_eye_y = eye_y * scale
    y_top_scaled = scaled_eye_y - desired_top_to_eye_px
    y_top = y_top_scaled / scale

    # HAIR PROTECTION (multi-layer)
    y_top = min(y_top, hair_top_y - face_height * safety_padding_top)
    y_top = min(y_top, hair_top_y - MIN_PIXELS_ABOVE_HAIR)

    y_bottom = chin_y + face_height * safety_padding_bottom

    # Shoulder visibility safety check
    current_scaled_height = (y_bottom - y_top) * scale
    if current_scaled_height < final_size * MIN_HEAD_COVERAGE:
        print("Head coverage below minimum → expanding (mostly top)")
        missing = (final_size * MIN_HEAD_COVERAGE - current_scaled_height) / scale
        y_top    -= missing * 0.65
        y_bottom += missing * 0.35

    # Sides
    half_w = (final_size * 0.70 / 2) / scale
    half_w += face_width * safety_padding_sides

    x_left  = face_center_x - half_w
    x_right = face_center_x + half_w

    # Clamp to image bounds
    x_left   = max(0, x_left)
    x_right  = min(512, x_right)
    y_top    = max(0, y_top)
    y_bottom = min(512, y_bottom)

    if y_bottom <= y_top or x_right <= x_left:
        print("Invalid crop dimensions after clamping")
        return None

    cropped = aligned_512[int(y_top):int(y_bottom), int(x_left):int(x_right)]

    if cropped.size == 0:
        print("Empty crop result")
        return None

    # Final high-quality resize
    result = cv2.resize(cropped, (final_size, final_size),
                        interpolation=cv2.INTER_LANCZOS4)

    result = ensure_white_background(result)
    # Optional crispness for passport look
    result = cv2.detailEnhance(result, sigma_s=10, sigma_r=0.15)

    # Debug saves
    if debug and output_path:
        debug_dir = "debug_id_crop"
        os.makedirs(debug_dir, exist_ok=True)
        base = os.path.splitext(os.path.basename(input_path))[0]
        cv2.imwrite(f"{debug_dir}/{base}_01_orig.jpg", img)
        cv2.imwrite(f"{debug_dir}/{base}_02_aligned.jpg", aligned_512)
        cv2.imwrite(f"{debug_dir}/{base}_03_cropped.jpg", cropped)
        cv2.imwrite(f"{debug_dir}/{base}_04_final.jpg", result)
        print(f"Debug images saved in: {debug_dir}/")

    if output_path:
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        if cv2.imwrite(output_path, result):
            print(f"Success → Saved: {output_path}")
        else:
            print(f"Failed to save: {output_path}")

    return result


if __name__ == "__main__":
    print("=== ENTERING MAIN ===", flush=True)
    
    if len(sys.argv) < 2:
        print("Usage: python passport_crop_2026.py input.jpg [output.jpg]", flush=True)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "passport_auto_2026.jpg"

    print(f"[DEBUG] Input file: {input_path}", flush=True)
    print(f"[DEBUG] Checking if file exists: {os.path.exists(input_path)}", flush=True)
    print(f"[DEBUG] Output file: {output_path}", flush=True)

    try:
        print("[DEBUG] Starting crop_auto_id_photo...", flush=True)
        result = crop_auto_id_photo(input_path, output_path, debug=DEBUG_VISUALIZE)
        if result is not None:
            print("=== PROCESSING SUCCESS ===", flush=True)
        else:
            print("=== PROCESSING RETURNED NONE ===", flush=True)
    except Exception as e:
        print(f"CRASH: {str(e)}", flush=True)
        traceback.print_exc()
        sys.exit(1)
    
    print("=== SCRIPT ENDED ===", flush=True)
