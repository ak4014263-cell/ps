#!/usr/bin/env python3
"""
Face Crop Utility using InsightFace
Advanced face detection, alignment and cropping with high accuracy
"""

import os
import sys
import cv2
import numpy as np
from pathlib import Path
import json
import argparse

# Suppress TensorFlow and ONNXRuntime warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['ONNX_ENABLE_ALL_OPERATORS'] = '1'

try:
    import insightface
except ImportError:
    print("[FaceCrop] ERROR: insightface not installed. Run: pip install insightface onnxruntime", file=sys.stderr)
    sys.exit(1)

class FaceCropper:
    def __init__(self, padding=20, model_name='buffalo_l'):
        """
        Initialize face cropper with InsightFace detector
        
        Args:
            padding: pixels to add around detected face (default: 20)
            model_name: insightface model to use ('buffalo_l', 'buffalo_m', 'buffalo_s')
        """
        try:
            # Initialize InsightFace model - don't specify providers for compatibility
            self.app = insightface.app.FaceAnalysis(name=model_name)
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            self.padding = padding
            print(f"[FaceCrop] InsightFace detector initialized with model '{model_name}' (padding={padding}px)", file=sys.stderr)
        except Exception as e:
            print(f"[FaceCrop] ERROR: Failed to initialize InsightFace detector: {e}", file=sys.stderr)
            raise
    
    def detect_faces(self, image_path):
        """
        Detect faces in an image using InsightFace
        
        Args:
            image_path: path to image file
            
        Returns:
            list of detected face objects
        """
        try:
            if not os.path.exists(image_path):
                print(f"[FaceCrop] ERROR: Image file not found: {image_path}", file=sys.stderr)
                return []
            
            img = cv2.imread(image_path)
            if img is None:
                print(f"[FaceCrop] ERROR: Could not load image: {image_path}", file=sys.stderr)
                return []
            
            # Check image dimensions
            if img.shape[0] < 10 or img.shape[1] < 10:
                print(f"[FaceCrop] ERROR: Image too small ({img.shape[1]}x{img.shape[0]})", file=sys.stderr)
                return []
            
            print(f"[FaceCrop] Detecting faces in {Path(image_path).name} (size: {img.shape[1]}x{img.shape[0]})", file=sys.stderr)
            
            # Detect all faces in the image
            faces = self.app.get(img)
            print(f"[FaceCrop] Found {len(faces)} face(s)", file=sys.stderr)
            
            # Sort faces by detection confidence (descending)
            if faces:
                faces = sorted(faces, key=lambda f: f.det_score, reverse=True)
            
            return faces
        except Exception as e:
            print(f"[FaceCrop] ERROR detecting faces: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return []
    
    def crop_face(self, image_path, output_path=None, face_index=0):
        """
        Detect and crop the best face from an image
        
        Args:
            image_path: path to input image
            output_path: path to save cropped face (optional)
            face_index: which face to crop if multiple detected (default: 0 = highest confidence)
            
        Returns:
            dict with status and cropped image info
        """
        faces = self.detect_faces(image_path)
        
        if not faces:
            error_result = {
                "success": False,
                "error": "No faces detected",
                "image_path": image_path
            }
            print(json.dumps(error_result))
            return error_result
        
        try:
            # Load the original image
            img = cv2.imread(image_path)
            img_height, img_width = img.shape[:2]
            
            # Get the requested face (default: highest confidence)
            if face_index >= len(faces):
                face_index = 0
            
            face = faces[face_index]
            
            # Extract bounding box from InsightFace detection
            # bbox format: [x1, y1, x2, y2]
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox
            
            # Get face center for better cropping
            face_width = x2 - x1
            face_height = y2 - y1
            face_center_x = (x1 + x2) / 2
            face_center_y = (y1 + y2) / 2
            
            # Use the larger of width/height to create a square crop
            # This ensures we capture the full face with consistent aspect ratio
            face_size = max(face_width, face_height)
            
            # Apply padding
            padded_size = face_size + (self.padding * 2)
            
            # Calculate crop coordinates (centered on face)
            crop_x1 = int(face_center_x - padded_size / 2)
            crop_y1 = int(face_center_y - padded_size / 2)
            crop_x2 = int(face_center_x + padded_size / 2)
            crop_y2 = int(face_center_y + padded_size / 2)
            
            # Ensure crop is within image bounds
            crop_x1 = max(0, crop_x1)
            crop_y1 = max(0, crop_y1)
            crop_x2 = min(img_width, crop_x2)
            crop_y2 = min(img_height, crop_y2)
            
            # Crop the face
            cropped_face = img[crop_y1:crop_y2, crop_x1:crop_x2]
            
            if cropped_face.size == 0:
                raise ValueError("Crop resulted in empty image")
            
            # Save if output path provided
            if output_path:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                success = cv2.imwrite(output_path, cropped_face)
                if not success:
                    raise ValueError(f"Failed to write image to {output_path}")
                print(f"[FaceCrop] SUCCESS: Saved cropped face to {output_path}", file=sys.stderr)
            
            # Prepare result
            result = {
                "success": True,
                "faces_detected": len(faces),
                "face_index": face_index,
                "confidence": float(face.det_score),
                "original_size": {
                    "width": img_width,
                    "height": img_height
                },
                "crop_box": {
                    "x": crop_x1,
                    "y": crop_y1,
                    "width": crop_x2 - crop_x1,
                    "height": crop_y2 - crop_y1
                },
                "face_box": {
                    "x": int(x1),
                    "y": int(y1),
                    "width": int(face_width),
                    "height": int(face_height)
                },
                "cropped_size": {
                    "width": cropped_face.shape[1],
                    "height": cropped_face.shape[0]
                },
                "saved_to": output_path
            }
            
            print(f"[FaceCrop] Face 1/{len(faces)}: confidence={face.det_score:.4f}, box=({x1}, {y1}, {x2}, {y2})", file=sys.stderr)
            print(json.dumps(result))
            
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e),
                "image_path": image_path,
                "faces_detected": len(faces)
            }
            print(f"[FaceCrop] ERROR: {e}", file=sys.stderr)
            print(json.dumps(error_result))
            import traceback
            traceback.print_exc(file=sys.stderr)
            return error_result
    
    def crop_batch(self, input_dir, output_dir):
        """
        Crop faces from all images in a directory
        
        Args:
            input_dir: directory containing images
            output_dir: directory to save cropped faces
            
        Returns:
            list of results for each image
        """
        results = []
        os.makedirs(output_dir, exist_ok=True)
        
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif'}
        image_files = [f for f in os.listdir(input_dir) 
                      if os.path.splitext(f.lower())[1] in image_extensions]
        
        print(f"[FaceCrop] Processing {len(image_files)} images from {input_dir}", file=sys.stderr)
        
        for i, filename in enumerate(image_files, 1):
            input_path = os.path.join(input_dir, filename)
            output_filename = f"cropped_{os.path.splitext(filename)[0]}.jpg"
            output_path = os.path.join(output_dir, output_filename)
            
            print(f"[FaceCrop] [{i}/{len(image_files)}] Processing: {filename}", file=sys.stderr)
            result = self.crop_face(input_path, output_path)
            result["input_file"] = filename
            result["output_file"] = output_filename if result["success"] else None
            results.append(result)
        
        success_count = sum(1 for r in results if r["success"])
        print(f"[FaceCrop] Batch complete: {success_count}/{len(image_files)} successful", file=sys.stderr)
        
        return results


def main():
    parser = argparse.ArgumentParser(description='Face crop utility using InsightFace')
    parser.add_argument('image', help='Image file path')
    parser.add_argument('-o', '--output', help='Output file path for cropped face')
    parser.add_argument('-p', '--padding', type=int, default=20, help='Padding around face (default: 20)')
    parser.add_argument('-m', '--model', default='buffalo_l', help='Model to use (buffalo_l, buffalo_m, buffalo_s)')
    parser.add_argument('-b', '--batch', action='store_true', help='Process directory batch')
    parser.add_argument('-d', '--output-dir', help='Output directory for batch processing')
    
    args = parser.parse_args()
    
    try:
        cropper = FaceCropper(padding=args.padding, model_name=args.model)
        
        if args.batch:
            if not args.output_dir:
                print("Error: --output-dir required for batch processing")
                sys.exit(1)
            results = cropper.crop_batch(args.image, args.output_dir)
            print(json.dumps(results, indent=2))
        else:
            result = cropper.crop_face(args.image, output_path=args.output)
            sys.exit(0 if result['success'] else 1)
    except Exception as e:
        print(f"[FaceCrop] FATAL ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
