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

def beautify_with_ai(input_path, output_path, strength=0.7, mode='default'):
    """
    Beautify face using advanced PIL filters
    Strength: 0.0 (minimal) to 1.0 (maximum)
    Mode: 'default', 'portrait', 'soft', 'vibrant'
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
        
        # Optional: apply nuclear pop (LAB L-channel lighting curve) for punch
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
            # bilateralFilter expects 8-bit input; convert and filter
            tmp = np.clip(final_f * 255.0, 0, 255).astype(np.uint8)
            smoothed = cv2.bilateralFilter(tmp, d=7, sigmaColor=75, sigmaSpace=75)
            smoothed_f = smoothed.astype(np.float32) / 255.0
            blend = beauty_percent * 0.5
            res = (final_f * (1 - blend) + smoothed_f * blend) * 255.0
            return np.clip(res, 0, 255).astype(np.uint8)

        logger.info('Applying nuclear pop (LAB)')
        img_cv = nuclear_pop_lab(img_cv, iterations=2)

        # 1. Skin smoothing (bilateral filter)
        logger.info(f'Applying skin smoothing (strength: {strength}, mode: {mode})')
        smoothing_intensity = 9 if mode != 'soft' else 11
        smoothed = cv2.bilateralFilter(img_cv, smoothing_intensity, 75, 75)

        # Blend with original based on strength
        blended = cv2.addWeighted(img_cv, 1 - strength, smoothed, strength, 0)

        # Apply bilateral blend beauty v2 as a final pass
        logger.info('Applying bilateral blend beauty v2')
        blended = apply_beauty_v2(blended, beauty_percent=min(1.0, max(0.0, strength)))
        
        # 2. Convert back to PIL
        img_result = Image.fromarray(cv2.cvtColor(blended, cv2.COLOR_BGR2RGB))
        
        # 3. Apply mode-specific enhancements
        # Reduce contrast slightly during beautification (keep tones softer)
        contrast_mult = {'default': -0.08, 'portrait': -0.06, 'soft': -0.04, 'vibrant': -0.03}
        color_mult = {'default': 0.18, 'portrait': 0.20, 'soft': 0.10, 'vibrant': 0.30}
        brightness_mult = {'default': 0.12, 'portrait': 0.10, 'soft': 0.08, 'vibrant': 0.15}
        sharpness_mult = {'default': 0.3, 'portrait': 0.35, 'soft': 0.15, 'vibrant': 0.40}
        
        # Enhance contrast (tone)
        if strength > 0.3:
            enhance_contrast = 1.0 + (strength * contrast_mult.get(mode, 0.25))
            img_result = ImageEnhance.Contrast(img_result).enhance(enhance_contrast)
            logger.info(f'Contrast enhanced: {enhance_contrast}')
        
        # Enhance color saturation
        if strength > 0.2:
            enhance_color = 1.0 + (strength * color_mult.get(mode, 0.18))
            img_result = ImageEnhance.Color(img_result).enhance(enhance_color)
            logger.info(f'Color enhanced: {enhance_color}')
        
        # Enhance brightness
        if strength > 0.1:
            enhance_brightness = 1.0 + (strength * brightness_mult.get(mode, 0.12))
            img_result = ImageEnhance.Brightness(img_result).enhance(enhance_brightness)
            logger.info(f'Brightness enhanced: {enhance_brightness}')
        
        # Sharpen
        enhance_sharp = 1.0 + (strength * sharpness_mult.get(mode, 0.3))
        img_result = ImageEnhance.Sharpness(img_result).enhance(enhance_sharp)
        logger.info(f'Sharpness enhanced: {enhance_sharp}')
        
        # Apply unsharp mask for clarity
        unsharp_percent = int(100 + strength * 50)
        img_result = img_result.filter(ImageFilter.UnsharpMask(
            radius=1.2,
            percent=unsharp_percent,
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
        print('Usage: beautify.py <input_path> <output_path> [strength] [mode]')
        print('Example: beautify.py photo.jpg output.jpg 0.7 portrait')
        print('Strength: 0.0 (minimal) to 1.0 (maximum), default 0.7')
        print('Mode: default, portrait, soft, vibrant')
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Parse strength parameter
    try:
        strength = float(sys.argv[3]) if len(sys.argv) > 3 else 0.7
    except ValueError:
        strength = 0.7
    
    # Parse mode parameter
    mode = sys.argv[4] if len(sys.argv) > 4 else 'default'
    if mode not in ['default', 'portrait', 'soft', 'vibrant']:
        mode = 'default'
    
    beautify_with_ai(input_path, output_path, strength, mode)

if __name__ == '__main__':
    main()
