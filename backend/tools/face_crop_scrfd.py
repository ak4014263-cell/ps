#!/usr/bin/env python3
"""
Face Detection and Cropping using InsightFace SCRFD (buffalo_l)
Detects faces and crops to customizable region with padding
"""

import sys
import os
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def crop_face_scrfd(input_path, output_path, padding=0.2, target_height=300, target_width=300):
    """
    Detect face using InsightFace SCRFD and crop to region
    
    Args:
        input_path: Input image path
        output_path: Output image path
        padding: Padding around face (0.0-1.0, relative to face size)
        target_height: Target crop height in pixels
        target_width: Target crop width in pixels
    """
    try:
        import cv2
        import numpy as np
        from insightface.app import FaceAnalysis
        
        logger.info(f'Loading image: {input_path}')
        img = cv2.imread(input_path)
        
        if img is None:
            raise ValueError(f'Failed to load image: {input_path}')
        
        img_height, img_width = img.shape[:2]
        logger.info(f'Image dimensions: {img_width}x{img_height}')
        
        # Initialize InsightFace with SCRFD buffalo_l
        logger.info('Initializing InsightFace SCRFD buffalo_l...')
        face_app = FaceAnalysis(name='buffalo_l', providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
        face_app.prepare(ctx_id=0, det_thresh=0.5, det_size=(640, 640))
        
        logger.info('Detecting faces...')
        faces = face_app.get(img)
        
        if not faces:
            logger.warning('No faces detected in image')
            # Return original image if no face detected
            cv2.imwrite(output_path, img)
            print(json.dumps({
                'success': True,
                'message': 'No face detected, returned original image',
                'face_detected': False
            }))
            return
        
        logger.info(f'Detected {len(faces)} face(s)')
        
        # Get the largest/most prominent face
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        
        bbox = face.bbox.astype(int)
        x1, y1, x2, y2 = bbox
        
        logger.info(f'Face bounding box: ({x1}, {y1}) to ({x2}, {y2})')
        
        # Calculate face region
        face_width = x2 - x1
        face_height = y2 - y1
        face_center_x = x1 + face_width / 2
        face_center_y = y1 + face_height / 2
        
        logger.info(f'Face size: {face_width}x{face_height}, center: ({face_center_x:.0f}, {face_center_y:.0f})')
        
        # Apply padding
        pad_x = int(face_width * padding)
        pad_y = int(face_height * padding)
        
        # Calculate crop region with padding
        crop_x1 = max(0, x1 - pad_x)
        crop_y1 = max(0, y1 - pad_y)
        crop_x2 = min(img_width, x2 + pad_x)
        crop_y2 = min(img_height, y2 + pad_y)
        
        crop_width = crop_x2 - crop_x1
        crop_height = crop_y2 - crop_y1
        
        logger.info(f'Crop region before resize: {crop_width}x{crop_height}')
        
        # Crop the face region
        cropped = img[crop_y1:crop_y2, crop_x1:crop_x2]
        
        # Resize to target dimensions
        logger.info(f'Resizing to {target_width}x{target_height}')
        resized = cv2.resize(cropped, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)
        
        # Save output
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        cv2.imwrite(output_path, resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        logger.info(f'Face crop complete. Output: {output_path}')
        print(json.dumps({
            'success': True,
            'message': 'Face detected and cropped successfully',
            'face_detected': True,
            'face_box': {'x1': int(x1), 'y1': int(y1), 'x2': int(x2), 'y2': int(y2)},
            'output_size': {'width': target_width, 'height': target_height}
        }))
        sys.exit(0)
        
    except ImportError as e:
        logger.error(f'Missing dependency: {str(e)}')
        print(json.dumps({'success': False, 'error': f'Missing dependency: {str(e)}'}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        logger.error(f'Face crop error: {str(e)}')
        print(json.dumps({'success': False, 'error': str(e)}), file=sys.stderr)
        sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print('Usage: face_crop_scrfd.py <input_path> <output_path> [padding] [height] [width]')
        print('Example: face_crop_scrfd.py photo.jpg output.jpg 0.2 300 300')
        print('Padding: 0.0-1.0 (relative to face size), default 0.2')
        print('Height/Width: pixels, default 300')
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Parse optional parameters
    try:
        padding = float(sys.argv[3]) if len(sys.argv) > 3 else 0.2
        padding = max(0.0, min(1.0, padding))  # Clamp to 0.0-1.0
    except ValueError:
        padding = 0.2
    
    try:
        target_height = int(sys.argv[4]) if len(sys.argv) > 4 else 300
        target_height = max(100, min(1000, target_height))  # Clamp to 100-1000
    except ValueError:
        target_height = 300
    
    try:
        target_width = int(sys.argv[5]) if len(sys.argv) > 5 else 300
        target_width = max(100, min(1000, target_width))  # Clamp to 100-1000
    except ValueError:
        target_width = 300
    
    logger.info(f'Parameters: padding={padding}, height={target_height}, width={target_width}')
    crop_face_scrfd(input_path, output_path, padding, target_height, target_width)

if __name__ == '__main__':
    main()
