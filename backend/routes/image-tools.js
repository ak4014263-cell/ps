import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';
import sharp from 'sharp';
import { execute, query } from '../db.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const TMP_DIR = path.join(UPLOADS_DIR, 'tmp');
const PROCESSED_DIR = path.join(UPLOADS_DIR, 'processed');
[UPLOADS_DIR, TMP_DIR, PROCESSED_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});

// Multer upload middleware
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    console.log(`[Multer] File filter check: name=${file.originalname}, mimetype=${file.mimetype}`);
    if (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream')) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
  }
});


/**
 * POST /api/image/beautify
 * multipart/form-data file field 'image'
 * optional form fields: strength (0-1, default 0.7)
 * returns beautified image as blob
 * Uses CodeFormer for professional face enhancement
 */
router.post('/beautify', upload.single('image'), async (req, res) => {
  let tempImagePath = null;
  
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    // Prefer a server-side processed/foreground image when provided.
    // Client may send `processedPath` (e.g. returned from /remove-background) to indicate
    // which server-side file to beautify. We only accept filenames under PROCESSED_DIR
    // to avoid arbitrary file access.
    let inputPath = req.file.path;
    const providedProcessed = (req.body && req.body.processedPath) || req.query.processedPath;
    if (providedProcessed) {
      try {
        const candidate = path.join(PROCESSED_DIR, path.basename(providedProcessed));
        if (fs.existsSync(candidate)) {
          console.log('[Beautify] Using provided processed image:', candidate);
          inputPath = candidate;
        } else {
          console.warn('[Beautify] Provided processedPath not found, falling back to upload:', providedProcessed);
        }
      } catch (e) {
        console.warn('[Beautify] Error validating processedPath, falling back to upload:', e.message);
      }
    }
    const outName = `bf-codeformer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const outputPath = path.join(PROCESSED_DIR, outName);

    // Get beautification strength (0-1, default 0.7)
    const strength = Math.min(1.0, Math.max(0.0, parseFloat(req.body.strength || req.query.strength || '0.7')));

    // Build python args for beautify with strength
    const python = process.env.PYTHON_PATH || 'python';
    const script = path.join(__dirname, '..', 'tools', 'beautify.py');

    if (!fs.existsSync(script)) {
      console.error(`[Beautify] Script not found: ${script}`);
      return res.status(500).json({ success: false, error: 'Beautification service not available' });
    }

    const args = [script, inputPath, outputPath, String(strength)];

    console.log('[Beautify] Using AI beautification with strength:', strength);
    console.log('[Beautify] Running:', python, args.join(' '));

    const proc = spawn(python, args, { 
      stdio: 'pipe',
      timeout: 60000  // 60 second timeout for GPU processing
    });

    let stderr = '';
    let stdout = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('[Beautify] Stderr:', data.toString());
    });

    proc.on('error', (err) => {
      console.error('[Beautify] Failed to start process:', err);
      return res.status(500).json({ success: false, error: 'Failed to start beautification' });
    });

    proc.on('close', (code) => {
      // Clean up temp uploaded file if we used the uploaded temp (not a server-side processed file)
      try {
        const uploadedPath = req.file && req.file.path;
        if (uploadedPath && uploadedPath !== inputPath && fs.existsSync(uploadedPath)) {
          fs.unlinkSync(uploadedPath);
        }
      } catch (e) {
        console.log('[Beautify] Could not clean temp file:', e.message);
      }

      if (code !== 0) {
        console.error('[Beautify] Process failed with code', code);
        console.error('[Beautify] Stderr:', stderr);
        return res.status(500).json({ success: false, error: 'Beautification failed: ' + stderr });
      }

      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        console.error('[Beautify] Output file not created');
        return res.status(500).json({ success: false, error: 'Output file not created' });
      }

      console.log('[Beautify] Success! Sending beautified image');

      // Send beautified image as blob
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', 'inline; filename="beautified.jpg"');
      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error('[Beautify] Error sending file:', err);
        } else {
          // Clean up output file after sending
          setTimeout(() => {
            try {
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {
              console.log('[Beautify] Could not clean output file:', e.message);
            }
          }, 1000);
        }
      });
    });
  } catch (error) {
    console.error('[Beautify] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



/**
 * POST /api/image/remove-background
 * multipart/form-data file field 'image'
 * returns { success: true, url: '/uploads/processed/...' }
 */
router.post('/remove-background', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const inputPath = req.file.path;
    const outName = `rb-${Date.now()}-${path.basename(req.file.filename, path.extname(req.file.filename))}.png`;
    const outputPath = path.join(PROCESSED_DIR, outName);

    // Call Python rembg script
    const python = process.env.PYTHON_PATH || 'python';
    const script = path.join(__dirname, '..', 'tools', 'rembg_run.py');

    const proc = spawn(python, [script, inputPath, outputPath], { stdio: 'inherit' });

    proc.on('error', (err) => {
      console.error('Failed to start rembg process', err);
      return res.status(500).json({ success: false, error: 'Failed to start background removal process' });
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('rembg process exited with code', code);
        return res.status(500).json({ success: false, error: 'Background removal failed' });
      }

      // Return public URL path
      const publicUrl = `/uploads/processed/${outName}`;
      return res.json({ success: true, url: publicUrl, path: outputPath });
    });
  } catch (error) {
    console.error('remove-background error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/image/save-photo
 * multipart/form-data file field 'photo'
 * Saves a processed photo as BLOB in MySQL database
 */
router.post('/save-photo', async (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    try {
      if (err) {
        console.error('[Save Photo] Multer error:', err.message, err.code);
        return res.status(400).json({ success: false, error: `Upload failed: ${err.message}` });
      }

      if (!req.file) {
        console.error('[Save Photo] No file in request');
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const { recordId, photoType } = req.body;
      if (!recordId) {
        console.error('[Save Photo] No recordId in body');
        return res.status(400).json({ success: false, error: 'recordId required' });
      }

      console.log(`[Save Photo] File: ${req.file.filename}, Size: ${req.file.size}, RecordId: ${recordId}, Type: ${photoType}`);

      // Read file as binary data
      const fileBuffer = fs.readFileSync(req.file.path);

      // Determine which BLOB column to update based on photoType
      let blobColumn = 'photo_blob';
      if (photoType === 'face_cropped' || photoType === 'cropped_photo_url') {
        blobColumn = 'cropped_photo_blob';
      } else if (photoType === 'original') {
        blobColumn = 'original_photo_blob';
      }

      // Save to MySQL BLOB column
      const sql = `UPDATE data_records SET ${blobColumn} = ? WHERE id = ?`;
      await execute(sql, [fileBuffer, recordId]);

      console.log(`[Save Photo] Saved to MySQL ${blobColumn} for record ${recordId}`);

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      // Return success with generic URL (image will be fetched via /api/image/get-photo endpoint)
      const publicUrl = `/api/image/get-photo/${recordId}?type=${photoType}`;
      
      return res.json({ 
        success: true, 
        url: publicUrl,
        message: 'Photo saved to database'
      });
    } catch (error) {
      console.error('[Save Photo] Processing error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

/**
 * GET /api/image/get-photo/:recordId
 * Retrieves photo BLOB from MySQL database
 */
router.get('/get-photo/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { type } = req.query;

    if (!recordId) {
      return res.status(400).json({ success: false, error: 'recordId required' });
    }

    // Determine which BLOB column to fetch
    let blobColumn = 'photo_blob';
    if (type === 'face_cropped' || type === 'cropped_photo_url') {
      blobColumn = 'cropped_photo_blob';
    } else if (type === 'original') {
      blobColumn = 'original_photo_blob';
    }

    // Fetch BLOB from database
    const results = await query(
      `SELECT ${blobColumn} FROM data_records WHERE id = ?`,
      [recordId]
    );

    if (!results || results.length === 0) {
      console.error(`[Get Photo] No record found: ${recordId}`);
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const photoBlob = results[0][blobColumn];
    if (!photoBlob) {
      console.error(`[Get Photo] No ${blobColumn} found for record ${recordId}`);
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    console.log(`[Get Photo] Retrieved ${blobColumn} for record ${recordId}, size: ${photoBlob.length} bytes`);

    // Set appropriate headers
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `inline; filename="photo_${recordId}.jpg"`);
    res.set('Cache-Control', 'public, max-age=31536000');
    
    // Send BLOB data
    res.send(photoBlob);
  } catch (error) {
    console.error('[Get Photo] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/image/face-crop-status
 * Check if face crop service is available
 */
router.get('/face-crop-status', (req, res) => {
  try {
    const pythonCmd = process.env.PYTHON_PATH || 'python';
    const insightScript = path.join(__dirname, '..', 'tools', 'face_crop_insight.py');
    const mediapipeScript = path.join(__dirname, '..', 'tools', 'crop_face_mediapipe_clean.py');
    const scriptExists = fs.existsSync(insightScript) || fs.existsSync(mediapipeScript);
    
    console.log(`[Face Crop Status] Python: ${pythonCmd}`);
    console.log(`[Face Crop Status] InsightFace script: ${fs.existsSync(insightScript)}`);
    console.log(`[Face Crop Status] MediaPipe script: ${fs.existsSync(mediapipeScript)}`);
    
    res.json({
      available: scriptExists,
      python: pythonCmd,
      insightScript,
      mediapipeScript,
      pythonPath: process.env.PYTHON_PATH,
      virtualEnv: process.env.VIRTUAL_ENV,
    });
  } catch (error) {
    res.status(500).json({ available: false, error: error.message });
  }
});
/**
 * POST /api/image/face-crop
 * Face detection and cropping using InsightFace SCRFD buffalo_l
 * Accepts JSON with base64 encoded image OR multipart file upload
 * Parameters: padding (0.0-1.0), height (100-1000), width (100-1000)
 * Returns cropped face image
 */
router.post('/face-crop', (req, res) => {
  // Handle both JSON and multipart requests
  if (req.is('multipart/form-data')) {
    // Use multer for file uploads
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('[Face Crop] Multer error:', err.message);
        return res.status(400).json({ success: false, error: err.message });
      }
      handleFaceCrop(req, res);
    });
  } else {
    // Handle JSON requests directly
    handleFaceCrop(req, res);
  }
});

async function handleFaceCrop(req, res) {
  let tempImagePath = null;
  
  try {
    console.log('[Face Crop] Processing request...');
    console.log('[Face Crop] Content-Type:', req.get('content-type'));
    
    // Get image - either from file upload or base64
    let inputPath;
    
    if (req.file) {
      inputPath = req.file.path;
      console.log('[Face Crop] Using uploaded file:', inputPath);
    } else if (req.body.imageBase64) {
      console.log('[Face Crop] Using base64 from JSON body');
      // Convert base64 to temp file
      const imageBuffer = Buffer.from(req.body.imageBase64, 'base64');
      const tempDir = path.join(PROCESSED_DIR, '..', 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      tempImagePath = path.join(tempDir, `fc-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
      fs.writeFileSync(tempImagePath, imageBuffer);
      inputPath = tempImagePath;
      console.log('[Face Crop] Using base64 converted to temp file:', inputPath);
    } else {
      console.error('[Face Crop] No image data provided');
      console.error('[Face Crop] req.body keys:', req.body ? Object.keys(req.body) : 'no body');
      console.error('[Face Crop] req.file:', req.file ? 'file present' : 'no file');
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }
    
    // Verify input file exists
    if (!fs.existsSync(inputPath)) {
      return res.status(400).json({ success: false, error: 'Input image not found' });
    }
    
    // Parse parameters
    console.log('[Face Crop] Raw body:', JSON.stringify(req.body));
    console.log('[Face Crop] Raw padding from body:', req.body.padding, 'type:', typeof req.body.padding);
    
    const padding = Math.max(0.0, Math.min(1.0, parseFloat(req.body.padding || '0.2')));
    const height = Math.max(100, Math.min(1000, parseInt(req.body.height || '300', 10)));
    const width = Math.max(100, Math.min(1000, parseInt(req.body.width || '300', 10)));
    
    console.log(`[Face Crop] Parsed parameters: padding=${padding} (type: ${typeof padding}), height=${height}, width=${width}`);
    
    // Generate output path
    const outName = `fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const outputPath = path.join(PROCESSED_DIR, outName);
    
    // Get Python command
    const pythonCmd = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.join(__dirname, '..', 'tools', 'face_crop_scrfd.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.error('[Face Crop] Script not found:', scriptPath);
      return res.status(500).json({ success: false, error: 'Face crop service not available' });
    }
    
    console.log(`[Face Crop] Starting face crop with SCRFD buffalo_l`);
    console.log(`[Face Crop] Input: ${inputPath}`);
    console.log(`[Face Crop] Output: ${outputPath}`);
    
    // Run face crop script
    const pythonArgs = [
      scriptPath,
      inputPath,
      outputPath,
      String(padding),
      String(height),
      String(width)
    ];
    
    console.log('[Face Crop] Python command:', pythonCmd);
    console.log('[Face Crop] Python args:', pythonArgs);
    console.log('[Face Crop] Args as strings:', pythonArgs.map((arg, i) => `[${i}]=${arg}`).join(', '));
    
    const proc = spawn(pythonCmd, pythonArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000, // 120 second timeout
      shell: false,
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[Face Crop] Stdout:', data.toString());
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('[Face Crop] Stderr:', data.toString());
    });
    
    proc.on('error', (err) => {
      console.error('[Face Crop] Process error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: `Process failed: ${err.message}` });
      }
    });
    
    proc.on('close', (code) => {
      if (res.headersSent) return;
      
      console.log(`[Face Crop] Exit code: ${code}`);
      
      try {
        if (code !== 0) {
          console.error('[Face Crop] Process failed with code', code);
          console.error('[Face Crop] Stderr:', stderr);
          
          // Try to parse error message
          let errorMsg = 'Face crop processing failed';
          try {
            const errorJson = JSON.parse(stderr);
            errorMsg = errorJson.error || errorMsg;
          } catch (e) {
            // Not JSON, use stderr as is
            errorMsg = stderr || errorMsg;
          }
          
          return res.status(500).json({ success: false, error: errorMsg });
        }
        
        // Parse success response
        let result = {};
        try {
          result = JSON.parse(stdout);
        } catch (e) {
          console.warn('[Face Crop] Could not parse stdout as JSON');
        }
        
        // Check if output file was created
        if (!fs.existsSync(outputPath)) {
          console.error('[Face Crop] Output file not created');
          return res.status(500).json({ success: false, error: 'Output file not created' });
        }
        
        const stats = fs.statSync(outputPath);
        console.log(`[Face Crop] Success! Output file size: ${stats.size} bytes`);
        
        // Send cropped image
        res.type('image/jpeg');
        res.set('Content-Disposition', 'inline; filename="face_cropped.jpg"');
        res.sendFile(outputPath, (err) => {
          if (err) {
            console.error('[Face Crop] Error sending file:', err);
          }
        });
      } catch (error) {
        console.error('[Face Crop] Response error:', error.message);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: error.message });
        }
      } finally {
        // Cleanup temp files after 3 seconds
        setTimeout(() => {
          try {
            if (req.file && fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
              console.log('[Face Crop] Cleaned up uploaded temp file');
            }
            if (tempImagePath && fs.existsSync(tempImagePath)) {
              fs.unlinkSync(tempImagePath);
              console.log('[Face Crop] Cleaned up base64 temp file');
            }
          } catch (e) {
            console.log('[Face Crop] Cleanup warning:', e.message);
          }
        }, 3000);
      }
    });
  } catch (error) {
    console.error('[Face Crop] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
    // Cleanup
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try { fs.unlinkSync(tempImagePath); } catch (e) {}
    }
  }
}

export default router;
