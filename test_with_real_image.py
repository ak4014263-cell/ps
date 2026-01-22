#!/usr/bin/env python3
"""Download a real face image and test the school ID processor endpoint"""

import requests
import os
from PIL import Image
from io import BytesIO

def download_real_face():
    """Download a real face image from Wikimedia Commons"""
    print("[DOWNLOAD] Fetching real face image...")
    
    # Using a public domain face image from Wikimedia Commons
    url = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            # Save the image
            with open('real_face.jpg', 'wb') as f:
                f.write(response.content)
            print("[DOWNLOAD] ✓ Real face image saved: real_face.jpg")
            return True
    except Exception as e:
        print(f"[DOWNLOAD] Error downloading image: {e}")
    
    return False

def test_endpoint_with_real_image():
    """Test the endpoint with real face image"""
    print("\n[TEST] Testing School ID processor with real face image...")
    
    if not os.path.exists('real_face.jpg'):
        print("[TEST] ✗ real_face.jpg not found")
        return False
    
    try:
        with open('real_face.jpg', 'rb') as f:
            files = {'image': ('real_face.jpg', f, 'image/jpeg')}
            
            print("[TEST] Sending POST request to http://localhost:3001/api/image/process-school-id")
            print("[TEST] Note: First run will download InsightFace models (~280MB), may take 1-2 minutes...")
            
            response = requests.post(
                'http://localhost:3001/api/image/process-school-id',
                files=files,
                timeout=180  # 3 minutes timeout for model loading
            )
            
            print(f"[TEST] Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"[TEST] ✓ SUCCESS: {result.get('message')}")
                
                if result.get('processedImageUrl'):
                    print(f"[TEST] ✓ Processed image received (data URL length: {len(result['processedImageUrl'])} chars)")
                    
                    # Save the processed image
                    if result['processedImageUrl'].startswith('data:image/png;base64,'):
                        import base64
                        base64_str = result['processedImageUrl'].replace('data:image/png;base64,', '')
                        image_data = base64.b64decode(base64_str)
                        with open('real_face_processed.png', 'wb') as f:
                            f.write(image_data)
                        print(f"[TEST] ✓ Processed image saved: real_face_processed.png")
                    
                    return True
            else:
                result = response.json()
                print(f"[TEST] ✗ ERROR {response.status_code}")
                print(f"[TEST] Response: {result}")
                return False
                
    except requests.exceptions.Timeout:
        print("[TEST] ✗ Request timeout (server processing took too long)")
    except requests.exceptions.ConnectionError:
        print("[TEST] ✗ Connection error (backend server not running on localhost:3001)")
    except Exception as e:
        print(f"[TEST] ✗ Error: {e}")
    
    return False

if __name__ == '__main__':
    print("=" * 60)
    print("SCHOOL ID PROCESSOR - REAL IMAGE TEST")
    print("=" * 60)
    
    if download_real_face():
        success = test_endpoint_with_real_image()
        print("\n" + "=" * 60)
        if success:
            print("✓✓✓ SCHOOL ID PROCESSOR TEST PASSED ✓✓✓")
        else:
            print("✗✗✗ SCHOOL ID PROCESSOR TEST FAILED ✗✗✗")
        print("=" * 60)
    else:
        print("\n✗ Failed to download test image")
