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
    const mime = file.mimetype || '';
    const isImage = mime.startsWith('image/') || mime === 'application/octet-stream';
    const hasImageExt = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.originalname);
    
    if (isImage || hasImageExt || !mime) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${mime}`), false);
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

      // Get project ID from record
      const projectIdResults = await query('SELECT project_id FROM data_records WHERE id = ?', [recordId]);
      if (!projectIdResults || projectIdResults.length === 0) {
        throw new Error(`Record not found: ${recordId}`);
      }
      
      const projectId = projectIdResults[0].project_id;
      if (!projectId) {
        throw new Error(`No project_id found for record ${recordId}`);
      }

      // Determine which BLOB column and URL column to update based on photoType
      let blobColumn = 'photo_blob';
      let urlColumn = 'photo_url';
      let photoFileName = `photo_${recordId}_${Date.now()}.jpg`;

      if (photoType === 'face_cropped' || photoType === 'cropped_photo_url') {
        blobColumn = 'cropped_photo_blob';
        urlColumn = 'cropped_photo_url';
        photoFileName = `cropped_${recordId}_${Date.now()}.jpg`;
      } else if (photoType === 'original') {
        blobColumn = 'original_photo_blob';
        urlColumn = 'original_photo_url';
        photoFileName = `original_${recordId}_${Date.now()}.jpg`;
      }

      // Save both BLOB (for database) and filename (for URL)
      const sql = `UPDATE data_records SET ${blobColumn} = ?, ${urlColumn} = ? WHERE id = ?`;
      await execute(sql, [fileBuffer, photoFileName, recordId]);

      console.log(`[Save Photo] Saved BLOB to ${blobColumn} and URL to ${urlColumn} (${photoFileName}) for record ${recordId}, project ${projectId}`);

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      // Return success with URL that matches our static file structure (project-specific directory)
      const publicUrl = `/uploads/project-photos/${projectId}/${photoFileName}`;
      
      return res.json({ 
        success: true, 
        url: publicUrl,
        photoUrl: publicUrl,
        photoType: photoType,
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
 * POST /api/image/face-crop
 * Process image as school ID photo (background removal + face detection + alignment)
 */
router.post('/face-crop', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }

    // Convert to absolute paths (Python needs absolute paths to work correctly)
    const inputPath = path.resolve(req.file.path);
    const outputPath = path.join(PROCESSED_DIR, `face-crop-${Date.now()}.png`);

    console.log(`[Face Crop] Processing image: ${inputPath}`);

    // Call Python school ID processor
    const pythonScript = path.resolve(path.join(__dirname, '..', 'tools', 'school_id_processor_cli.py'));
    const pythonProcess = spawn('python', [
      pythonScript,
      inputPath,
      outputPath
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Face Crop] stdout:`, data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[Face Crop] stderr:`, data.toString());
    });

    pythonProcess.on('close', (code) => {
      // Clean up input file
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      if (code === 2) {
        // Exit code 2 = no face detected
        console.warn(`[Face Crop] No face detected in image`);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return res.status(400).json({
          success: false,
          error: 'No face detected in the provided image. Please upload a clear photo of a face.'
        });
      }

      if (code !== 0) {
        console.error(`[Face Crop] Python process exited with code ${code}`);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return res.status(500).json({
          success: false,
          error: `Face crop processing failed: ${stderr || 'Unknown error'}`
        });
      }

      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({
          success: false,
          error: 'Face crop processing failed: No output generated'
        });
      }

      // Read the processed image
      const imageBuffer = fs.readFileSync(outputPath);
      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;

      console.log(`[Face Crop] Successfully processed: ${outputPath}`);

      // Clean up output file
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      res.json({
        success: true,
        processedImageUrl: dataUrl,
        message: 'Face crop processed successfully'
      });
    });

    // Set timeout (120 seconds - model loading can be slow on first run)
    setTimeout(() => {
      if (pythonProcess.exitCode === null) {
        pythonProcess.kill();
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        res.status(500).json({
          success: false,
          error: 'Face crop processing timeout (took longer than 120 seconds)'
        });
      }
    }, 120000);
  } catch (error) {
    console.error('[Face Crop] Error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/image/face-crop-status
 * Check if face crop service is available
 */
router.get('/face-crop-status', (req, res) => {
  res.json({
    available: true,
    message: 'Face crop service available (InsightFace buffalo_l)'
  });
});

export default router;
