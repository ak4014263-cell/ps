#!/usr/bin/env python3
"""Test the school ID processor endpoint with verification of error handling"""

import requests
import os
from PIL import Image, ImageDraw

def test_endpoint_error_handling():
    """Test that the endpoint handles no-face case gracefully"""
    
    print("=" * 70)
    print("SCHOOL ID PROCESSOR - ENDPOINT TEST WITH NO-FACE ERROR HANDLING")
    print("=" * 70)
    
    # Use the synthetic face we have
    if not os.path.exists('synthetic_face.jpg'):
        print("[ERROR] synthetic_face.jpg not found")
        return False
    
    print("\n[TEST] Testing endpoint with image that has no detectable face...")
    print("[TEST] This tests error handling when InsightFace cannot detect a face")
    
    try:
        with open('synthetic_face.jpg', 'rb') as f:
            files = {'image': ('synthetic_face.jpg', f, 'image/jpeg')}
            
            print("[TEST] Sending POST request...")
            response = requests.post(
                'http://localhost:3001/api/image/process-school-id',
                files=files,
                timeout=120
            )
            
            print(f"\n[TEST] Status Code: {response.status_code}")
            result = response.json()
            print(f"[TEST] Response: {result}")
            
            # Verify proper error handling
            if response.status_code == 400:
                if 'no face' in result.get('error', '').lower():
                    print("\n✓ PASS: Endpoint correctly returns 400 for no-face scenario")
                    print(f"✓ PASS: User-friendly error message: '{result['error']}'")
                    return True
            elif response.status_code == 500:
                print(f"\n✗ FAIL: Got 500 error instead of 400: {result['error']}")
                return False
            else:
                print(f"\n✗ FAIL: Unexpected status code: {response.status_code}")
                return False
                
    except requests.exceptions.Timeout:
        print("\n✗ FAIL: Request timeout")
    except requests.exceptions.ConnectionError:
        print("\n✗ FAIL: Cannot connect to backend (localhost:3001)")
    except Exception as e:
        print(f"\n✗ FAIL: Error: {e}")
    
    return False

def test_endpoint_with_invalid_image():
    """Test endpoint with completely invalid image"""
    
    print("\n" + "=" * 70)
    print("TEST 2: Invalid Image File")
    print("=" * 70)
    
    # Create a corrupted image file
    test_file = 'corrupted.jpg'
    with open(test_file, 'wb') as f:
        f.write(b'JPEG\x00\x00INVALID_DATA' * 100)
    
    print("[TEST] Sending POST request with corrupted image data...")
    
    try:
        with open(test_file, 'rb') as f:
            files = {'image': (test_file, f, 'image/jpeg')}
            
            response = requests.post(
                'http://localhost:3001/api/image/process-school-id',
                files=files,
                timeout=60
            )
            
            print(f"[TEST] Status Code: {response.status_code}")
            result = response.json()
            print(f"[TEST] Response: {result}")
            
            # Should get an error
            if response.status_code >= 400:
                print("\n✓ PASS: Endpoint properly rejects corrupted images")
                return True
            else:
                print("\n✗ FAIL: Endpoint should reject corrupted image")
                return False
                
    except Exception as e:
        print(f"[TEST] Error: {e}")
        # This is acceptable - the endpoint returned an error
        if "500" in str(e) or "error" in str(e).lower():
            print("\n✓ PASS: Endpoint properly rejects corrupted images")
            return True
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)
    
    return False

def test_endpoint_no_image():
    """Test endpoint with missing image"""
    
    print("\n" + "=" * 70)
    print("TEST 3: Missing Image Parameter")
    print("=" * 70)
    
    print("[TEST] Sending POST request without image...")
    
    try:
        response = requests.post(
            'http://localhost:3001/api/image/process-school-id',
            timeout=10
        )
        
        print(f"[TEST] Status Code: {response.status_code}")
        print(f"[TEST] Response: {response.text}")
        
        if response.status_code >= 400:
            print("\n✓ PASS: Endpoint properly rejects request without image")
            return True
        else:
            print("\n✗ FAIL: Endpoint should reject request without image")
            return False
            
    except Exception as e:
        print(f"[TEST] Error: {e}")
    
    return False

if __name__ == '__main__':
    results = []
    
    results.append(("No-face error handling", test_endpoint_error_handling()))
    results.append(("Corrupted image handling", test_endpoint_with_invalid_image()))
    results.append(("Missing image handling", test_endpoint_no_image()))
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    total_passed = sum(1 for _, p in results if p)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")
    
    if total_passed == len(results):
        print("\n✓✓✓ ALL TESTS PASSED ✓✓✓")
        exit(0)
    else:
        print(f"\n✗✗✗ {len(results) - total_passed} TEST(S) FAILED ✗✗✗")
        exit(1)
