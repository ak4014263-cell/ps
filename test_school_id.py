#!/usr/bin/env python3
"""
Test script for School ID Processor endpoint
"""
import requests
import os
from PIL import Image, ImageDraw
import io

# Create a simple test image with a face-like pattern
def create_test_image():
    """Create a simple test image (light background with dark oval for face)"""
    img = Image.new('RGB', (400, 500), color='lightblue')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple face-like oval in the center
    # Head oval
    draw.ellipse([100, 80, 300, 280], fill='peachpuff', outline='black', width=2)
    
    # Eyes
    draw.ellipse([140, 140, 160, 160], fill='black')
    draw.ellipse([240, 140, 260, 160], fill='black')
    
    # Nose
    draw.polygon([(200, 160), (195, 180), (205, 180)], fill='black')
    
    # Mouth
    draw.arc([160, 180, 240, 200], 0, 180, fill='black', width=2)
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes

# Test the endpoint
def test_school_id_processor():
    print("[TEST] Creating test image...")
    test_img = create_test_image()
    
    print("[TEST] Uploading to /api/image/process-school-id...")
    url = 'http://localhost:3001/api/image/process-school-id'
    
    files = {'image': ('test_face.png', test_img, 'image/png')}
    
    try:
        response = requests.post(url, files=files, timeout=60)
        print(f"[TEST] Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"[TEST] SUCCESS: {result.get('message')}")
            if result.get('processedImageUrl'):
                print(f"[TEST] Processed image URL received (length: {len(result['processedImageUrl'])} chars)")
                
                # Save the result for verification
                data_url = result['processedImageUrl']
                if data_url.startswith('data:image/png;base64,'):
                    import base64
                    base64_data = data_url.split(',')[1]
                    image_data = base64.b64decode(base64_data)
                    with open('test_output.png', 'wb') as f:
                        f.write(image_data)
                    print("[TEST] Output saved to test_output.png")
        else:
            print(f"[TEST] ERROR: {response.status_code}")
            print(f"[TEST] Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("[TEST] ERROR: Cannot connect to backend server")
        print("[TEST] Make sure backend is running on localhost:3001")
    except Exception as e:
        print(f"[TEST] ERROR: {e}")

if __name__ == "__main__":
    test_school_id_processor()
