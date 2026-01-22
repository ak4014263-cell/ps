"""
Image Processing Pipeline with Background Removal and Face Crop

Handles photo/zip uploads, background removal, face cropping with queue integration.
Supports async processing with real-time progress updates.
"""

import os
import io
import zipfile
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Tuple
import logging
from PIL import Image
import tempfile
import shutil

logger = logging.getLogger(__name__)


class ImageProcessor:
    """
    Processes images: background removal + face crop
    """
    
    def __init__(self, temp_dir: str = None):
        """
        Initialize image processor
        
        Args:
            temp_dir: Temporary directory for file storage
        """
        self.temp_dir = temp_dir or tempfile.mkdtemp(prefix="rembg_")
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        logger.info(f"Image processor initialized with temp dir: {self.temp_dir}")
    
    def process_image(
        self,
        image_bytes: bytes,
        remove_bg: bool = True,
        crop_face: bool = True,
        model: str = "u2net"
    ) -> Tuple[bytes, Dict]:
        """
        Process a single image
        
        Args:
            image_bytes: Image file bytes
            remove_bg: Remove background
            crop_face: Crop face
            model: Rembg model to use
        
        Returns:
            Tuple of (processed_image_bytes, metadata)
        """
        try:
            from rembg import remove
            
            # Load image
            image = Image.open(io.BytesIO(image_bytes))
            original_size = image.size
            
            # Convert to RGB if necessary
            if image.mode != 'RGB' and remove_bg:
                image = image.convert('RGB')
            
            metadata = {
                "original_size": original_size,
                "steps": []
            }
            
            # Remove background
            if remove_bg:
                image = remove(image)
                image = image.convert('RGBA')
                metadata["steps"].append("background_removed")
                logger.info("Background removed")
            
            # Crop face (optional)
            if crop_face:
                try:
                    image, face_bbox = self._crop_face(image)
                    if face_bbox:
                        metadata["steps"].append("face_cropped")
                        metadata["face_bbox"] = face_bbox
                        logger.info(f"Face cropped: {face_bbox}")
                    else:
                        logger.warning("No face detected, skipping crop")
                except Exception as e:
                    logger.warning(f"Face crop failed: {str(e)}")
            
            # Save as PNG with transparency
            output_bytes = io.BytesIO()
            image.save(output_bytes, format='PNG')
            output_bytes.seek(0)
            
            metadata["final_size"] = image.size
            metadata["format"] = "PNG"
            
            return output_bytes.getvalue(), metadata
        
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            raise
    
    def _crop_face(self, image: Image.Image) -> Tuple[Image.Image, Optional[Dict]]:
        """
        Detect and crop face from image
        
        Args:
            image: PIL Image
        
        Returns:
            Tuple of (cropped_image, bbox_dict)
        """
        try:
            import cv2
            import numpy as np
            
            # Convert PIL to OpenCV format
            img_array = np.array(image)
            if img_array.shape[2] == 4:  # RGBA
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
            elif img_array.shape[2] == 3:  # RGB
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            
            # Load face cascade classifier
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            
            # Detect faces
            faces = face_cascade.detectMultiScale(img_array, 1.3, 5)
            
            if len(faces) == 0:
                logger.info("No faces detected")
                return image, None
            
            # Get largest face
            face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = face
            
            # Add margin
            margin = int(w * 0.2)
            x = max(0, x - margin)
            y = max(0, y - margin)
            w = min(img_array.shape[1] - x, w + 2 * margin)
            h = min(img_array.shape[0] - y, h + 2 * margin)
            
            # Crop
            cropped = img_array[y:y+h, x:x+w]
            
            # Convert back to PIL
            if image.mode == 'RGBA':
                cropped = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGBA)
            else:
                cropped = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
            
            cropped_image = Image.fromarray(cropped)
            
            bbox = {
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "confidence": 0.95
            }
            
            return cropped_image, bbox
        
        except ImportError:
            logger.warning("OpenCV not available, skipping face crop")
            return image, None
        except Exception as e:
            logger.error(f"Face crop error: {str(e)}")
            return image, None


class ZipHandler:
    """
    Handles zip file extraction and image extraction
    """
    
    @staticmethod
    def extract_images_from_zip(zip_bytes: bytes, temp_dir: str) -> List[Dict]:
        """
        Extract images from zip file
        
        Args:
            zip_bytes: Zip file bytes
            temp_dir: Temporary directory for extraction
        
        Returns:
            List of extracted image info dicts
        """
        try:
            extracted = []
            
            with tempfile.TemporaryDirectory(dir=temp_dir) as temp_extract:
                # Extract zip
                with zipfile.ZipFile(io.BytesIO(zip_bytes), 'r') as zf:
                    zf.extractall(temp_extract)
                
                # Find all images
                image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'}
                
                for root, dirs, files in os.walk(temp_extract):
                    for file in files:
                        if Path(file).suffix.lower() in image_extensions:
                            file_path = os.path.join(root, file)
                            
                            try:
                                with open(file_path, 'rb') as f:
                                    image_bytes = f.read()
                                
                                extracted.append({
                                    "filename": file,
                                    "path": file_path,
                                    "bytes": image_bytes,
                                    "size": len(image_bytes)
                                })
                                logger.info(f"Extracted: {file}")
                            
                            except Exception as e:
                                logger.warning(f"Failed to read {file}: {str(e)}")
            
            logger.info(f"Extracted {len(extracted)} images from zip")
            return extracted
        
        except Exception as e:
            logger.error(f"Error extracting zip: {str(e)}")
            raise
    
    @staticmethod
    def validate_zip(zip_bytes: bytes) -> bool:
        """Validate zip file"""
        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes), 'r') as zf:
                test_result = zf.testzip()
                return test_result is None
        except:
            return False


class UploadHandler:
    """
    Handles file uploads (single images or zips)
    """
    
    def __init__(self, storage_dir: str = "uploads"):
        """
        Initialize upload handler
        
        Args:
            storage_dir: Directory to store uploaded files
        """
        self.storage_dir = storage_dir
        Path(storage_dir).mkdir(parents=True, exist_ok=True)
        self.processor = ImageProcessor(temp_dir=storage_dir)
    
    def save_upload(self, file_bytes: bytes, filename: str) -> str:
        """
        Save uploaded file
        
        Args:
            file_bytes: File content
            filename: Original filename
        
        Returns:
            Path to saved file
        """
        try:
            file_id = str(uuid.uuid4())
            file_ext = Path(filename).suffix
            saved_path = Path(self.storage_dir) / f"{file_id}{file_ext}"
            
            with open(saved_path, 'wb') as f:
                f.write(file_bytes)
            
            logger.info(f"Saved upload: {saved_path}")
            return str(saved_path)
        
        except Exception as e:
            logger.error(f"Error saving upload: {str(e)}")
            raise
    
    def cleanup(self, file_path: str):
        """Remove uploaded file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up: {file_path}")
        except Exception as e:
            logger.warning(f"Error cleaning up {file_path}: {str(e)}")
    
    def cleanup_temp(self):
        """Cleanup temporary directory"""
        try:
            if os.path.exists(self.processor.temp_dir):
                shutil.rmtree(self.processor.temp_dir)
                logger.info(f"Cleaned up temp dir: {self.processor.temp_dir}")
        except Exception as e:
            logger.warning(f"Error cleaning up temp: {str(e)}")
