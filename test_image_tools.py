#!/usr/bin/env python3
"""Test image processing endpoints"""
import requests
import json
import sys

API_BASE = 'http://localhost:5000/api/image'

def test_endpoints():
    print("🧪 Testing Image Tools API\n")
    
    # Test 1: Face Crop Status
    print("📋 Test 1: Check Face Crop Status")
    try:
        response = requests.get(f'{API_BASE}/face-crop-status', timeout=5)
        data = response.json()
        print(f"   Status Code: {response.status_code}")
        print(f"   Available: {data.get('available')}")
        print(f"   Python: {data.get('python')}")
        print(f"   Script Path: {data.get('scriptPath')}")
        print("   ✅ Success\n")
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
        return False

    # Test 2: Create a simple test image and beautify it
    print("🎨 Test 2: Test Beautify Endpoint")
    try:
        # Create a simple test image (1x1 pixel)
        from PIL import Image
        import io
        
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'image': ('test.png', img_bytes, 'image/png')}
        data = {'brightness': '1.1', 'contrast': '1.05', 'color': '1.0', 'sharpness': '1.0'}
        
        response = requests.post(f'{API_BASE}/beautify', files=files, data=data, timeout=30)
        result = response.json()
        
        print(f"   Status Code: {response.status_code}")
        if result.get('success'):
            print(f"   ✅ Beautify successful!")
            print(f"      URL: {result.get('url')}")
            print(f"      Path: {result.get('path')}")
        else:
            print(f"   ❌ Error: {result.get('error')}")
        print()
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
        return False

    print("✅ All endpoint tests completed!\n")
    return True

if __name__ == '__main__':
    try:
        success = test_endpoints()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
