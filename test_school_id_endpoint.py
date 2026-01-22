#!/usr/bin/env python3
"""
Test School ID Processor Endpoint
Creates a simple test image and sends it to the API
"""
import requests
import base64
import sys
from PIL import Image, ImageDraw
import io

def create_test_image(output_path='test_input.jpg'):
    """Create a test image with a simple face-like pattern"""
    print("[CREATE] Generating test image...")
    
    # Create image
    img = Image.new('RGB', (400, 500), color='lightblue')
    draw = ImageDraw.Draw(img)
    
    # Draw background
    draw.rectangle([0, 0, 400, 500], fill='lightblue')
    
    # Draw simple face
    # Head
    draw.ellipse([100, 80, 300, 280], fill='peachpuff', outline='black', width=2)
    
    # Eyes
    draw.ellipse([130, 130, 150, 150], fill='white', outline='black')
    draw.ellipse([250, 130, 270, 150], fill='white', outline='black')
    draw.ellipse([135, 135, 145, 145], fill='black')
    draw.ellipse([255, 135, 265, 145], fill='black')
    
    # Nose
    draw.polygon([(200, 160), (195, 180), (205, 180)], fill='peachpuff', outline='black')
    
    # Mouth
    draw.arc([160, 180, 240, 210], 0, 180, fill='black', width=2)
    
    # Ears
    draw.ellipse([95, 130, 110, 160], fill='peachpuff', outline='black', width=1)
    draw.ellipse([290, 130, 305, 160], fill='peachpuff', outline='black', width=1)
    
    img.save(output_path)
    print(f"[CREATE] ✓ Test image saved: {output_path}")
    return output_path

def test_endpoint(image_path):
    """Test the school ID processor endpoint"""
    print(f"\n[TEST] Reading image: {image_path}")
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': (image_path, f, 'image/jpeg')}
            
            print("[TEST] Sending POST request to http://localhost:3001/api/image/process-school-id")
            response = requests.post(
                'http://localhost:3001/api/image/process-school-id',
                files=files,
                timeout=120  # 2 minutes for model loading on first run
            )
            
            print(f"[TEST] Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"[TEST] ✓ SUCCESS: {result.get('message')}")
                
                if result.get('processedImageUrl'):
                    print(f"[TEST] ✓ Processed image received (data URL length: {len(result['processedImageUrl'])} chars)")
                    
                    # Save the output
                    data_url = result['processedImageUrl']
                    if data_url.startswith('data:image/png;base64,'):
                        base64_data = data_url.split(',')[1]
                        image_data = base64.b64decode(base64_data)
                        
                        output_path = 'test_output_school_id.png'
                        with open(output_path, 'wb') as out_f:
                            out_f.write(image_data)
                        
                        print(f"[TEST] ✓ Output saved: {output_path}")
                        print(f"[TEST] ✓ Output file size: {len(image_data)} bytes")
                        return True
                    else:
                        print("[TEST] ✗ Unexpected data URL format")
                        return False
            else:
                print(f"[TEST] ✗ ERROR {response.status_code}")
                print(f"[TEST] Response: {response.text}")
                return False
                
    except requests.exceptions.ConnectionError:
        print("[TEST] ✗ CONNECTION ERROR: Backend not running on localhost:3001")
        print("[TEST] Start backend with: npm start")
        return False
    except Exception as e:
        print(f"[TEST] ✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Create test image
    test_img_path = create_test_image()
    
    # Test endpoint
    success = test_endpoint(test_img_path)
    
    if success:
        print("\n[RESULT] ✓✓✓ School ID Processor TEST PASSED ✓✓✓")
        sys.exit(0)
    else:
        print("\n[RESULT] ✗✗✗ School ID Processor TEST FAILED ✗✗✗")
        sys.exit(1)
