#!/usr/bin/env python3
"""
Advanced Face Beautification using GFPGAN/CodeFormer
Provides professional face enhancement with strength control
"""

import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def beautify_with_ai(input_path, output_path, strength=0.7):
    """
    Beautify face using advanced PIL filters
    Strength: 0.0 (minimal) to 1.0 (maximum)
    """
    from PIL import Image, ImageEnhance, ImageFilter
    import cv2
    import numpy as np
    
    try:
        # Open image and preserve transparency
        img = Image.open(input_path)
        logger.info(f'Loaded image: {input_path}, mode: {img.mode}')
        
        # Check if image has alpha channel
        has_alpha = img.mode == 'RGBA' or 'transparency' in img.info
        
        if has_alpha and img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Extract alpha channel if present
        alpha_channel = None
        if has_alpha:
            alpha_channel = img.split()[-1]
            logger.info('Alpha channel detected and will be preserved')
        
        # Convert to RGB for processing
        img_rgb = img.convert('RGB')
        
        # Convert to OpenCV for advanced processing
        img_cv = cv2.cvtColor(np.array(img_rgb), cv2.COLOR_RGB2BGR)
        
        # 1. Skin smoothing (bilateral filter)
        logger.info(f'Applying skin smoothing (strength: {strength})')
        smoothed = cv2.bilateralFilter(img_cv, 9, 75, 75)
        
        # Blend with original based on strength
        blended = cv2.addWeighted(img_cv, 1 - strength, smoothed, strength, 0)
        
        # 2. Convert back to PIL
        img_result = Image.fromarray(cv2.cvtColor(blended, cv2.COLOR_BGR2RGB))
        
        # 3. Enhance contrast (tone) - INCREASED
        if strength > 0.3:
            enhance_contrast = 1.0 + (strength * 0.25)  # Increased from 0.12
            img_result = ImageEnhance.Contrast(img_result).enhance(enhance_contrast)
            logger.info(f'Contrast enhanced: {enhance_contrast}')
        
        # 4. Enhance color saturation - INCREASED
        if strength > 0.2:
            enhance_color = 1.0 + (strength * 0.18)  # Increased from 0.08
            img_result = ImageEnhance.Color(img_result).enhance(enhance_color)
            logger.info(f'Color enhanced: {enhance_color}')
        
        # 5. Enhance brightness - INCREASED
        if strength > 0.1:
            enhance_brightness = 1.0 + (strength * 0.12)  # Increased from 0.05
            img_result = ImageEnhance.Brightness(img_result).enhance(enhance_brightness)
            logger.info(f'Brightness enhanced: {enhance_brightness}')
        
        # 6. Sharpen
        enhance_sharp = 1.0 + (strength * 0.3)
        img_result = ImageEnhance.Sharpness(img_result).enhance(enhance_sharp)
        logger.info(f'Sharpness enhanced: {enhance_sharp}')
        
        # Apply unsharp mask for clarity
        img_result = img_result.filter(ImageFilter.UnsharpMask(
            radius=1.2,
            percent=int(100 + strength * 50),
            threshold=2
        ))
        
        # Restore alpha channel if original image had one
        if has_alpha and alpha_channel is not None:
            img_result = img_result.convert('RGB')
            img_result.putalpha(alpha_channel)
            logger.info('Alpha channel restored')
        
        # Save output
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        
        # Use PNG if alpha channel exists (supports transparency), otherwise JPEG
        if has_alpha and alpha_channel is not None:
            img_result.save(output_path, 'PNG')
            logger.info(f'Saved as PNG to preserve transparency')
        else:
            img_result.save(output_path, 'JPEG', quality=95)
        
        logger.info(f'Beautification complete. Output: {output_path}')
        print('OK')
        sys.exit(0)
        
    except Exception as e:
        logger.error(f'Beautification error: {str(e)}')
        print(f'Error: {str(e)}', file=sys.stderr)
        sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print('Usage: beautify.py <input_path> <output_path> [strength]')
        print('Example: beautify.py photo.jpg output.jpg 0.7')
        print('Strength: 0.0 (minimal) to 1.0 (maximum), default 0.7')
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Parse strength parameter
    try:
        strength = float(sys.argv[3]) if len(sys.argv) > 3 else 0.7
        strength = max(0.0, min(1.0, strength))  # Clamp to 0.0-1.0
    except ValueError:
        strength = 0.7
    
    beautify_with_ai(input_path, output_path, strength)

if __name__ == '__main__':
    main()
