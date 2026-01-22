import cv2
import numpy as np
import os
from insightface.app import FaceAnalysis
from rembg import remove, new_session
from PIL import Image
import tempfile

class SchoolIDProcessor:
    def __init__(self, model_root=None):
        """
        Initializes the processor specifically for CPU-only environments.
        """
        if model_root is None:
            # Use system temp directory for model cache (cross-platform compatible)
            model_root = os.path.join(tempfile.gettempdir(), '.insightface')
            os.makedirs(model_root, exist_ok=True)
        
        print(f"Initializing AI Models (CPU Mode)...")
        print(f"Model cache directory: {model_root}")

        # 1. Initialize InsightFace for CPU
        # name='buffalo_l' matches the folder name in your root
        self.app = FaceAnalysis(name='buffalo_l', root=model_root, providers=['CPUExecutionProvider'])

        # ctx_id=-1 forces CPU even if a stray GPU driver is detected
        # det_size=(640, 640) is the balance between accuracy and speed
        self.app.prepare(ctx_id=-1, det_size=(640, 640))

        # 2. Initialize rembg session
        # Use "u2netp" (pocket) if the VPS has less than 2GB RAM
        self.rembg_session = new_session("u2net")
        print("Initialization Complete.")

    def process_id_photo(self, input_path, output_path, size=1024):
        try:
            # Load image
            img = cv2.imread(input_path)
            if img is None:
                print(f"Error: Cannot read {input_path}")
                return False

            # --- STEP 1: Background Removal ---
            # rembg expects RGB, OpenCV provides BGR
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Remove background and get RGBA (Alpha channel)
            no_bg_rgba = remove(img_rgb, session=self.rembg_session)

            # Composite onto white background
            alpha = no_bg_rgba[:, :, 3] / 255.0
            color = no_bg_rgba[:, :, :3]
            white_bg = np.full(color.shape, 255, dtype=np.uint8)

            # Blend logic: (Foreground * Alpha) + (Background * (1-Alpha))
            composite_rgb = (color * alpha[..., np.newaxis] + white_bg * (1 - alpha[..., np.newaxis])).astype(np.uint8)
            img_processed = cv2.cvtColor(composite_rgb, cv2.COLOR_RGB2BGR)

            # --- STEP 2: Face Detection & Landmark Alignment ---
            faces = self.app.get(img_processed)
            if not faces:
                print(f"Error: No face detected in {input_path}")
                return False

            # Select the largest face found
            face = max(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]))

            # Geometric alignment (Similarity Transform)
            # This aligns eyes to a fixed horizontal line
            src_ref = np.array(
                [
                    [38.29, 51.60], [73.53, 51.60], [56.02, 71.73],
                    [41.54, 92.36], [70.72, 92.20]
                ], dtype=np.float32)

            padding = 2.5
            head_offset = 0.1
            scale = size / (112 * padding)
            new_src = src_ref * scale

            # Centering logic
            new_src[:, 0] += (size - (112 * scale)) / 2
            new_src[:, 1] += ((size - (112 * scale)) / 2) + (size * head_offset)

            tform, _ = cv2.estimateAffinePartial2D(face.kps, new_src)

            # Create the final square portrait
            final_img = cv2.warpAffine(
                img_processed, tform, (size, size),
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(255, 255, 255)
            )

            # --- STEP 3: Save ---
            cv2.imwrite(output_path, final_img)
            print(f"Successfully processed: {output_path}")
            return True

        except Exception as e:
            print(f"Critical error: {e}")
            return False


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print("Usage: python school_id_processor.py <input_path> <output_path>")
        sys.exit(1)
    
    processor = SchoolIDProcessor(model_root='/root/.insightface')
    success = processor.process_id_photo(sys.argv[1], sys.argv[2])
    sys.exit(0 if success else 2)
