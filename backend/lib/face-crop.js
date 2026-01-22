import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Crop face from image using MTCNN Python utility
 * @param {string} imagePath - Path to input image
 * @param {string} outputPath - Path to save cropped face
 * @param {number} padding - Padding around face (default: 20)
 * @returns {Promise<Object>} Result object with status and details
 */
export const cropFace = (imagePath, outputPath, padding = 20) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'face-crop.py');
    const pythonProcess = spawn('python', [
      pythonScript,
      imagePath,
      '-o', outputPath,
      '-p', padding.toString()
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        // Extract JSON result from stdout
        const jsonMatch = stdout.match(/=== Result ===\s*([\s\S]*)/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[1].trim());
          if (code === 0) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Face crop failed'));
          }
        } else if (code === 0) {
          resolve({ success: true, message: 'Face cropped successfully' });
        } else {
          reject(new Error(stderr || 'Face crop process failed'));
        }
      } catch (err) {
        if (code === 0) {
          resolve({ success: true, message: 'Face cropped successfully' });
        } else {
          reject(new Error(`Failed to parse face crop result: ${err.message}`));
        }
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });
  });
};

/**
 * Crop faces from batch of images
 * @param {string} inputDir - Directory with images
 * @param {string} outputDir - Directory to save cropped faces
 * @param {number} padding - Padding around face (default: 20)
 * @returns {Promise<Array>} Results for each image
 */
export const cropFaceBatch = (inputDir, outputDir, padding = 20) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'face-crop.py');
    const pythonProcess = spawn('python', [
      pythonScript,
      inputDir,
      '--batch',
      '--output-dir', outputDir,
      '-p', padding.toString()
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        // Extract JSON result from stdout
        const jsonMatch = stdout.match(/=== Batch Results ===\s*([\s\S]*)/);
        if (jsonMatch) {
          const results = JSON.parse(jsonMatch[1].trim());
          if (code === 0) {
            resolve(results);
          } else {
            reject(new Error('Batch face crop failed'));
          }
        } else if (code === 0) {
          resolve([]);
        } else {
          reject(new Error(stderr || 'Batch face crop process failed'));
        }
      } catch (err) {
        if (code === 0) {
          resolve([]);
        } else {
          reject(new Error(`Failed to parse batch results: ${err.message}`));
        }
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });
  });
};

export default { cropFace, cropFaceBatch };
