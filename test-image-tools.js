#!/usr/bin/env node
/**
 * Test script to verify crop and beautify image endpoints
 * Usage: node test-image-tools.js
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const API_BASE = 'http://localhost:5000/api/image';

// Create a simple test image (1x1 red pixel PNG)
const createTestImage = () => {
  // 1x1 red pixel PNG in base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  return Buffer.from(pngBase64, 'base64');
};

// Helper: POST multipart request
const postMultipart = async (endpoint, filePath, params = {}) => {
  const formData = new FormData();
  formData.append('image', fs.createReadStream(filePath));
  
  for (const [key, val] of Object.entries(params)) {
    formData.append(key, val);
  }

  return new Promise((resolve, reject) => {
    formData.submit(`${API_BASE}${endpoint}`, (err, res) => {
      if (err) return reject(err);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
  });
};

// Test function
const runTests = async () => {
  console.log('🧪 Testing Image Tools API\n');
  
  // Create test image
  const testImagePath = '/tmp/test-image.png';
  const imageData = createTestImage();
  fs.writeFileSync(testImagePath, imageData);
  console.log(`✅ Created test image: ${testImagePath}\n`);

  try {
    // Test 1: Face Crop Status
    console.log('📋 Test 1: Check Face Crop Status');
    const statusRes = await fetch(`${API_BASE}/face-crop-status`);
    const statusData = await statusRes.json();
    console.log(`   Status: ${statusRes.status}`);
    console.log(`   Available: ${statusData.available}`);
    console.log(`   Python: ${statusData.python}\n`);

    // Test 2: Beautify
    console.log('🎨 Test 2: Beautify Image');
    try {
      const beautifyRes = await postMultipart('/beautify', testImagePath, {
        brightness: '1.1',
        contrast: '1.05'
      });
      console.log(`   Status: ${beautifyRes.status}`);
      if (beautifyRes.body.success) {
        console.log(`   ✅ Beautify successful: ${beautifyRes.body.url}`);
      } else {
        console.log(`   ❌ Error: ${beautifyRes.body.error}`);
      }
    } catch (e) {
      console.log(`   ❌ Request failed: ${e.message}`);
    }
    console.log();

    // Test 3: Save Photo
    console.log('💾 Test 3: Save Photo');
    try {
      const saveRes = await postMultipart('/save-photo', testImagePath, {
        recordId: 'test-record-123',
        photoType: 'original'
      });
      console.log(`   Status: ${saveRes.status}`);
      if (saveRes.body.success) {
        console.log(`   ✅ Photo saved: ${saveRes.body.url}`);
      } else {
        console.log(`   ❌ Error: ${saveRes.body.error}`);
      }
    } catch (e) {
      console.log(`   ❌ Request failed: ${e.message}`);
    }
    console.log();

    console.log('✅ All tests completed!\n');
    console.log('📝 Summary:');
    console.log('   - Crop (face-crop.py) status checked');
    console.log('   - Beautify (beautify.py) tested with brightness/contrast params');
    console.log('   - Photo save endpoint tested\n');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }

  // Cleanup
  fs.unlinkSync(testImagePath);
  process.exit(0);
};

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
