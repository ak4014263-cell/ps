/**
 * Batch Processing Routes
 * Queue endpoints for submitting batch jobs (ZIP uploads, direct image lists)
 * 
 * POST /api/batch/upload-zip - Stream ZIP, extract images, queue jobs
 * POST /api/batch/add-images - Add individual images to batch
 * GET /api/batch/status/:batchId - Get batch progress
 * GET /api/batch/queue-stats - Get queue statistics
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Extract } from 'unzipper';
import sharp from 'sharp';
import {
  addFaceDetectionJob,
  addBatchIngestionJob,
  getBatchMetadata,
  getBatchProgress,
  updateBatchMetadata,
  updateBatchProgress,
  getQueueStats,
} from '../lib/bullQueue.js';
import { v4 as uuidv4 } from 'uuid';
import { execute, query } from '../db.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TMP_DIR = path.join(__dirname, '..', 'uploads', 'batch-tmp');
const BATCH_OUTPUT_DIR = path.join(__dirname, '..', 'uploads', 'batch-crops');

// Ensure directories exist
[TMP_DIR, BATCH_OUTPUT_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Multer for ZIP upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

/**
 * Apply face crop with white padding to image
 * @param {string} imagePath - Path to image file
 * @param {number} paddingPixels - Padding in pixels (default: 20)
 * @returns {Promise<Buffer>} - Cropped image buffer
 */
async function applyFaceCropWithPadding(imagePath, paddingPixels = 20) {
  try {
    console.log(`[FaceCrop] Processing image: ${imagePath}`);
    
    // Apply padding with white background
    const paddedBuffer = await sharp(imagePath)
      .extend({
        top: paddingPixels,
        bottom: paddingPixels,
        left: paddingPixels,
        right: paddingPixels,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: 95 })
      .toBuffer();
    
    console.log(`[FaceCrop] ✅ Image cropped and padded: ${paddedBuffer.length} bytes`);
    return paddedBuffer;
  } catch (err) {
    console.error(`[FaceCrop] ❌ Error applying crop:`, err.message);
    // Return original image on error
    return fs.readFileSync(imagePath);
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB for ZIP
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files allowed'), false);
    }
  },
});

/**
 * POST /api/batch/upload-zip
 * Stream ZIP file, extract images, queue face detection jobs
 * 
 * Query/body:
 * - projectId (required)
 * - priority (optional, 1-10)
 * 
 * Response: { batchId, imageCount, totalQueued }
 */
router.post('/upload-zip', upload.single('file'), async (req, res) => {
  let zipPath = null;
  const batchId = uuidv4();

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No ZIP file uploaded' });
    }

    const projectId = req.body.projectId || req.query.projectId;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId required' });
    }

    const priority = Math.min(10, Math.max(1, parseInt(req.body.priority || '5')));

    zipPath = req.file.path;
    console.log(`[Batch] 📦 Processing ZIP upload: ${req.file.filename} (batch: ${batchId})`);

    // Save batch metadata
    await updateBatchMetadata(batchId, {
      batchId,
      projectId,
      zipPath,
      status: 'extracting',
      createdAt: Date.now(),
      priority,
      imageCount: 0,
      queued: 0,
      failed: 0,
    });

    // Extract ZIP and queue images
    let imageCount = 0;
    let queued = 0;

    fs.createReadStream(zipPath)
      .pipe(Extract({ path: TMP_DIR }))
      .on('entry', async (entry) => {
        const fileName = entry.path;
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

        if (!isImage || entry.type === 'Directory') {
          entry.autodrain();
          return;
        }

        imageCount++;

        // Create temp file for image
        const tempImagePath = path.join(TMP_DIR, `extracted-${Date.now()}-${imageCount}`);
        const stream = fs.createWriteStream(tempImagePath);

        entry.pipe(stream).on('finish', async () => {
          try {
            // Read image buffer
            const imageBuffer = fs.readFileSync(tempImagePath);

            // Create or get record in data_records
            const recordId = uuidv4();
            await execute(
              `INSERT INTO data_records (id, project_id, processing_status) 
               VALUES (?, ?, ?)`,
              [recordId, projectId, 'processing_face_crop']
            );

            // Apply face crop with padding before queuing
            console.log(`[Batch] 🔄 Applying face crop to image ${imageCount}`);
            const croppedBuffer = await applyFaceCropWithPadding(tempImagePath);
            
            // Save cropped image
            const croppedImagePath = path.join(TMP_DIR, `cropped-${Date.now()}-${imageCount}.jpg`);
            fs.writeFileSync(croppedImagePath, croppedBuffer);

            // Queue face detection job with cropped image
            const imageUrl = `file://${croppedImagePath}`;
            await addFaceDetectionJob({
              recordId,
              batchId,
              imageUrl,
              priority,
            });

            queued++;
            console.log(`[Batch] ✅ Cropped and queued image ${imageCount} for batch ${batchId}`);
          } catch (err) {
            console.error(`[Batch] ❌ Failed to process image:`, err.message);
          }
        });

        stream.on('error', (err) => {
          console.error(`[Batch] ❌ Stream error:`, err.message);
          entry.autodrain();
        });
      })
      .on('finish', async () => {
        // Cleanup temp ZIP
        try {
          fs.unlinkSync(zipPath);
        } catch (e) {
          // Ignore
        }

        // Update batch metadata
        await updateBatchMetadata(batchId, {
          status: 'queued',
          imageCount,
          queued,
          finishedExtracting: Date.now(),
        });

        console.log(`[Batch] ✅ ZIP extraction complete: ${queued} images face-cropped and queued`);

        res.json({
          success: true,
          batchId,
          imageCount,
          queuedCount: queued,
          message: `${queued} images extracted, face-cropped with padding, and queued for processing`,
          status: 'face_crop_applied'
        });
      })
      .on('error', (err) => {
        console.error(`[Batch] ❌ ZIP extraction failed:`, err.message);

        // Cleanup
        try {
          if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        } catch (e) {
          // Ignore
        }

        res.status(500).json({
          success: false,
          error: `ZIP extraction failed: ${err.message}`,
        });
      });
  } catch (error) {
    console.error(`[Batch] ❌ Upload error:`, error.message);

    // Cleanup
    try {
      if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    } catch (e) {
      // Ignore
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/batch/add-images
 * Add individual images to batch (from existing URLs)
 * 
 * Body:
 * {
 *   projectId: string,
 *   images: [{ recordId, imageUrl }, ...],
 *   priority?: 1-10
 * }
 */
router.post('/add-images', async (req, res) => {
  try {
    const { projectId, images, priority } = req.body;

    if (!projectId || !images || !Array.isArray(images)) {
      return res.status(400).json({ success: false, error: 'projectId and images array required' });
    }

    const batchId = uuidv4();
    let queued = 0;

    for (const { recordId, imageUrl } of images) {
      try {
        await addFaceDetectionJob({
          recordId,
          batchId,
          imageUrl,
          priority: priority || 5,
        });
        queued++;
      } catch (err) {
        console.error(`[Batch] ❌ Failed to queue image ${recordId}:`, err.message);
      }
    }

    // Save batch metadata
    await updateBatchMetadata(batchId, {
      batchId,
      projectId,
      status: 'queued',
      createdAt: Date.now(),
      imageCount: images.length,
      queued,
    });

    res.json({
      success: true,
      batchId,
      totalRequested: images.length,
      queued,
    });
  } catch (error) {
    console.error(`[Batch] ❌ Error adding images:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/batch/status/:batchId
 * Get batch progress and metadata
 */
router.get('/status/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;

    const [meta, progress] = await Promise.all([
      getBatchMetadata(batchId),
      getBatchProgress(batchId),
    ]);

    if (!meta) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    res.json({
      success: true,
      batch: {
        ...meta,
        progress,
        progressPercent: progress ? Math.round((progress.processed / progress.total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error(`[Batch] ❌ Status error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/batch/queue-stats
 * Get queue statistics for monitoring
 */
router.get('/queue-stats', async (req, res) => {
  try {
    const stats = await getQueueStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error(`[Batch] ❌ Stats error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
