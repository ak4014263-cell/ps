const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const router = express.Router();

// Directory paths
const PROCESSED_DIR = path.join(__dirname, '..', 'uploads', 'processed-images');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure directories exist
[UPLOADS_DIR, PROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      cb(null, `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * POST /api/school-id/process
 * Process image as school ID using SchoolIDProcessor
 * Performs: Background Removal → Face Detection → Alignment → Standardization
 * Accepts multipart file upload or base64
 * Parameters: size (default: 1024)
 * Returns: processed school ID image
 */
router.post('/process', (req, res) => {
  if (req.is('multipart/form-data')) {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('[School ID] Multer error:', err.message);
        return res.status(400).json({ success: false, error: err.message });
      }
      handleSchoolIDProcess(req, res);
    });
  } else {
    handleSchoolIDProcess(req, res);
  }
});

async function handleSchoolIDProcess(req, res) {
  let tempImagePath = null;

  try {
    console.log('[School ID] Processing request...');

    // Get image - either from file upload or base64
    let inputPath;

    if (req.file) {
      inputPath = req.file.path;
      console.log('[School ID] Using uploaded file:', inputPath);
    } else if (req.body.imageBase64) {
      console.log('[School ID] Using base64 from JSON body');
      const imageBuffer = Buffer.from(req.body.imageBase64, 'base64');
      const tempDir = path.join(UPLOADS_DIR, 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      tempImagePath = path.join(tempDir, `sid-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
      fs.writeFileSync(tempImagePath, imageBuffer);
      inputPath = tempImagePath;
      console.log('[School ID] Using base64 converted to temp file:', inputPath);
    } else {
      console.error('[School ID] No image data provided');
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    // Verify input file exists
    if (!fs.existsSync(inputPath)) {
      return res.status(400).json({ success: false, error: 'Input image not found' });
    }

    // Parse parameters
    const size = Math.max(512, Math.min(2048, parseInt(req.body.size || '1024', 10)));
    console.log(`[School ID] Processing with size=${size}`);

    // Generate output path
    const outName = `school-id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const outputPath = path.join(PROCESSED_DIR, outName);

    // Get Python command and script
    const pythonCmd = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.join(__dirname, '..', 'tools', 'school_id_processor_cli.py');

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.error('[School ID] Script not found:', scriptPath);
      return res.status(500).json({ success: false, error: 'School ID processor service not available' });
    }

    console.log(`[School ID] Starting school ID processing`);
    console.log(`[School ID] Input: ${inputPath}`);
    console.log(`[School ID] Output: ${outputPath}`);
    console.log(`[School ID] Size: ${size}`);

    // Run school ID processor script
    const pythonArgs = [
      scriptPath,
      inputPath,
      outputPath,
      String(size)
    ];

    console.log('[School ID] Python command:', pythonCmd);
    console.log('[School ID] Python args:', pythonArgs);

    try {
      const result = execSync(`"${pythonCmd}" "${scriptPath}" "${inputPath}" "${outputPath}" ${size}`, {
        timeout: 30000,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });

      console.log('[School ID] Python output:', result);

      // Verify output exists
      if (!fs.existsSync(outputPath)) {
        console.error('[School ID] Output file not created');
        return res.status(500).json({ success: false, error: 'Processing failed: Output not created' });
      }

      // Read output and send
      const outputBuffer = fs.readFileSync(outputPath);
      const outputBase64 = outputBuffer.toString('base64');

      res.json({
        success: true,
        image: outputBase64,
        filename: outName,
        path: `/uploads/processed-images/${outName}`,
        size,
        message: 'School ID processed successfully'
      });

      // Cleanup temp files after success
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        fs.unlinkSync(tempImagePath);
      }
    } catch (execError) {
      console.error('[School ID] Python execution error:', execError.message);
      console.error('[School ID] stderr:', execError.stderr);
      console.error('[School ID] stdout:', execError.stdout);
      
      return res.status(500).json({
        success: false,
        error: `Processing failed: ${execError.message}`,
        details: execError.stderr || execError.stdout
      });
    }
  } catch (error) {
    console.error('[School ID] Unexpected error:', error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    // Cleanup temp files
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath);
      } catch (e) {
        console.warn('[School ID] Failed to cleanup temp file:', e.message);
      }
    }
  }
}

/**
 * GET /api/school-id/status
 * Check if School ID processor is available
 */
router.get('/status', (req, res) => {
  try {
    const pythonCmd = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.join(__dirname, '..', 'tools', 'school_id_processor_cli.py');

    console.log(`[School ID Status] Python: ${pythonCmd}`);
    console.log(`[School ID Status] Script exists: ${fs.existsSync(scriptPath)}`);

    res.json({
      status: 'available',
      python: pythonCmd,
      script: scriptPath,
      scriptExists: fs.existsSync(scriptPath),
      dependencies: [
        'cv2 (OpenCV)',
        'numpy',
        'insightface',
        'rembg',
        'PIL'
      ]
    });
  } catch (error) {
    console.error('[School ID Status] Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
