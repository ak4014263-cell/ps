const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Test photo URL and Python processing
async function testFaceCropFlow() {
  console.log('=== Testing Face Crop Flow ===\n');
  
  // 1. Check photo exists
  const photoName = 'photo_03c7dcac-3ba4-43cc-8eaf-d3a4286f1296_1768396458885.jpg';
  const photoPath = path.join(__dirname, 'uploads/photos', photoName);
  
  console.log('1. Checking if photo exists...');
  if (fs.existsSync(photoPath)) {
    const stats = fs.statSync(photoPath);
    console.log(`✓ Photo found: ${photoPath}`);
    console.log(`  Size: ${stats.size} bytes`);
  } else {
    console.log(`✗ Photo not found: ${photoPath}`);
    return;
  }
  
  // 2. Test Python processor
  console.log('\n2. Testing Python processor...');
  const pythonPath = 'C:/Users/ajayk/Downloads/remix-of-crystal-admin-42-main (1)/remix-of-crystal-admin-42-main/.venv/Scripts/python.exe';
  const cliPath = path.join(__dirname, 'tools/school_id_processor_cli.py');
  const outputPath = path.join(__dirname, 'uploads/tmp', 'test_face_crop_output.png');
  
  return new Promise((resolve) => {
    const proc = spawn(pythonPath, [cliPath, photoPath, outputPath]);
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      console.log(`Python process exited with code: ${code}`);
      
      if (code === 0) {
        console.log('✓ Face crop processed successfully');
        if (fs.existsSync(outputPath)) {
          const outStats = fs.statSync(outputPath);
          console.log(`✓ Output file created: ${outStats.size} bytes`);
        }
      } else if (code === 2) {
        console.log('⚠ No face detected in image');
      } else {
        console.log('✗ Face crop failed');
        console.log('stderr:', stderr);
      }
      resolve();
    });
  });
}

testFaceCropFlow().catch(console.error);
