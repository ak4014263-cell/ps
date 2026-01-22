#!/usr/bin/env python3
"""
Face Beautification using CodeFormer
Professional face enhancement with restoration and beautification
"""

import sys
import os
import torch
import cv2
import numpy as np
from PIL import Image
from io import BytesIO
import base64

# Try to import CodeFormer
try:
    from basicsr.archs.codeformer_arch import CodeFormer
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer
except ImportError:
    print("CodeFormer not installed. Install with: pip install codeformer realesrgan", file=sys.stderr)
    sys.exit(1)

class CodeFormerBeautifier:
    def __init__(self, device='cpu'):
        """Initialize CodeFormer model"""
        self.device = device
        
        # Initialize CodeFormer
        self.codeformer_net = CodeFormer(
            dim_embd=512,
            codebook_size=1024,
            n_head=8,
            n_layers=9,
            connect_list=['32', '64', '128', '256'],
            fix_decoder=True,
            pretrained_path=None
        )
        self.codeformer_net = self.codeformer_net.to(self.device)
        
        # Initialize RealESRGAN for upsampling
        self.upsampler = RealESRGANer(
            scale=2,
            model_path=None,  # Will use default
            model=RRDBNet(
                num_in_ch=3,
                num_out_ch=3,
                num_feat=64,
                num_block=23,
                num_grow_ch=32,
                scale=2
            ),
            tile=400,
            tile_pad=10,
            pre_pad=0,
            half=False if device == 'cpu' else True
        )
        self.upsampler = self.upsampler.to(self.device)
    
    def beautify(self, image_input, strength=0.7, upscale=True):
        """
        Beautify face image
        
        Args:
            image_input: File path or base64 string
            strength: Enhancement strength 0.0-1.0 (0.7 is recommended)
            upscale: Whether to upscale image using RealESRGAN
        
        Returns:
            Beautified image as PIL Image
        """
        
        # Load image
        if isinstance(image_input, str):
            if image_input.startswith('data:') or len(image_input) > 260:
                # Base64 input
                if image_input.startswith('data:'):
                    image_input = image_input.split(',')[1]
                img = Image.open(BytesIO(base64.b64decode(image_input)))
            else:
                # File path
                img = Image.open(image_input)
        else:
            img = image_input
        
        # Convert to RGB
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        img_np = np.array(img)
        h, w = img_np.shape[:2]
        
        # Ensure image is not too large for processing
        max_dim = 1024
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            new_h, new_w = int(h * scale), int(w * scale)
            img_np = cv2.resize(img_np, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        # Convert to tensor
        img_tensor = torch.from_numpy(img_np).permute(2, 0, 1).float() / 255.0
        img_tensor = img_tensor.unsqueeze(0).to(self.device)
        
        # Apply CodeFormer
        with torch.no_grad():
            output = self.codeformer_net(
                img_tensor,
                w=strength,  # w controls the blend between input and output
                adain=True
            )
        
        # Convert back to numpy
        output_np = output.squeeze(0).permute(1, 2, 0).cpu().numpy()
        output_np = np.clip(output_np * 255, 0, 255).astype(np.uint8)
        
        # Optional: Upscale with RealESRGAN for sharper results
        if upscale:
            try:
                output_np, _ = self.upsampler.enhance(output_np, outscale=2)
            except Exception as e:
                print(f"Upscaling failed: {e}, using original", file=sys.stderr)
        
        return Image.fromarray(output_np)

def main():
    """
    CLI interface for CodeFormer beautification
    Usage: beautify_codeformer.py <input_path_or_base64> <output_path> [strength] [upscale]
    """
    
    if len(sys.argv) < 3:
        print('Usage: beautify_codeformer.py <input> <output> [strength 0-1] [upscale 0/1]')
        print('Example: beautify_codeformer.py photo.jpg output.jpg 0.7 1')
        sys.exit(1)
    
    try:
        input_path = sys.argv[1]
        output_path = sys.argv[2]
        strength = float(sys.argv[3]) if len(sys.argv) > 3 else 0.7
        upscale = bool(int(sys.argv[4])) if len(sys.argv) > 4 else True
        
        # Clamp strength to valid range
        strength = max(0.0, min(1.0, strength))
        
        print(f"[CodeFormer] Loading image...", file=sys.stderr)
        
        # Determine device
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"[CodeFormer] Using device: {device}", file=sys.stderr)
        
        # Initialize beautifier
        beautifier = CodeFormerBeautifier(device=device)
        print(f"[CodeFormer] Model initialized", file=sys.stderr)
        
        # Beautify
        print(f"[CodeFormer] Beautifying image (strength={strength}, upscale={upscale})...", file=sys.stderr)
        beautified_img = beautifier.beautify(input_path, strength, upscale)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        
        # Save
        beautified_img.save(output_path, 'JPEG', quality=95)
        print('[CodeFormer] OK', file=sys.stderr)
        print('OK')
        sys.exit(0)
        
    except Exception as e:
        print(f'Error: {str(e)}', file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
