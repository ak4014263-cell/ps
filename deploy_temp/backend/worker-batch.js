/**
 * Batch Worker Process
 * Processes face detection jobs from BullMQ queue
 * 
 * Run with: node --watch worker-batch.js
 * Scale horizontally: run multiple instances
 */

import {
  faceDetectionQueue,
  updateJobMetadata,
  getBatchMetadata,
  updateBatchProgress,
  connectRedis,
} from './lib/bullQueue.js';
import { detectAndCropFace, loadCascade } from './lib/opencvWorker.js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { execute, query } from './db.js';

const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;
const BATCH_OUTPUT_DIR = process.env.BATCH_OUTPUT_DIR || './uploads/batch-crops';
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2');

// Ensure output directory exists
if (!fs.existsSync(BATCH_OUTPUT_DIR)) {
  fs.mkdirSync(BATCH_OUTPUT_DIR, { recursive: true });
}

console.log(`[${WORKER_ID}] 🚀 Starting batch worker`);
console.log(`[${WORKER_ID}] Concurrency: ${CONCURRENCY} jobs`);

/**
 * Download image from URL (streaming for large files)
 */
async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.buffer();
  } catch (err) {
    console.error(`[${WORKER_ID}] ❌ Download failed:`, err.message);
    return null;
  }
}

/**
 * Process single job
 */
async function processJob(job) {
  const {
    jobId,
    recordId,
    batchId,
    imageUrl,
  } = job.data;

  console.log(`[${WORKER_ID}] 📷 Processing job ${job.id} (record: ${recordId})`);

  try {
    // Update job status
    await updateJobMetadata(job.id, {
      status: 'processing',
      startedAt: Date.now(),
      workerId: WORKER_ID,
    });

    // 1. Download image
    const imageBuffer = await downloadImage(imageUrl);
    if (!imageBuffer) {
      await updateJobMetadata(job.id, { status: 'failed', error: 'Download failed' });
      return { success: false, error: 'Failed to download image' };
    }

    // 2. Detect and crop face
    const { detected, cropped, bbox, error: cropError } = await detectAndCropFace(
      imageBuffer,
      {
        padding: 0.20,
        outputSize: 300,
      }
    );

    if (!detected) {
      console.warn(`[${WORKER_ID}] ⚠️ No face detected for record ${recordId}`);
      await updateJobMetadata(job.id, {
        status: 'completed',
        detected: false,
        completedAt: Date.now(),
      });

      // Update database
      await execute(
        'UPDATE data_records SET face_detected = ?, processing_status = ? WHERE id = ?',
        [false, 'no_face_detected', recordId]
      );

      return { success: true, detected: false };
    }

    // 3. Save cropped image locally
    const cropOutputName = `crop-${recordId}-${Date.now()}.jpg`;
    const cropOutputPath = path.join(BATCH_OUTPUT_DIR, cropOutputName);
    
    fs.writeFileSync(cropOutputPath, cropped);
    console.log(`[${WORKER_ID}] ✅ Cropped image saved: ${cropOutputPath}`);

    // 4. Update database with result
    const cropUrl = `/uploads/batch-crops/${cropOutputName}`;
    await execute(
      `UPDATE data_records SET 
        face_detected = ?, 
        cropped_photo_url = ?, 
        face_crop_coordinates = ?,
        processing_status = ?
      WHERE id = ?`,
      [
        true,
        cropUrl,
        JSON.stringify(bbox),
        'face_cropped',
        recordId,
      ]
    );

    // 5. Update job metadata
    await updateJobMetadata(job.id, {
      status: 'completed',
      detected: true,
      cropUrl,
      bbox,
      completedAt: Date.now(),
    });

    // 6. Update batch progress if applicable
    if (batchId) {
      const batchMeta = await getBatchMetadata(batchId);
      if (batchMeta) {
        const processed = (batchMeta.processed || 0) + 1;
        await updateBatchProgress(batchId, processed, batchMeta.total || 0);
      }
    }

    console.log(`[${WORKER_ID}] ✅ Job ${job.id} completed successfully`);
    return { success: true, detected: true, cropUrl };
  } catch (err) {
    console.error(`[${WORKER_ID}] ❌ Job processing error:`, err.message);

    await updateJobMetadata(job.id, {
      status: 'failed',
      error: err.message,
      failedAt: Date.now(),
    });

    // Mark record as failed
    try {
      await execute(
        'UPDATE data_records SET processing_status = ? WHERE id = ?',
        ['processing_failed', recordId]
      );
    } catch (e) {
      console.error(`[${WORKER_ID}] ❌ Failed to update record:`, e.message);
    }

    throw err; // Let Bull handle retry
  }
}

/**
 * Setup job processor
 */
async function setupProcessor() {
  try {
    await connectRedis();

    // Load cascade once at startup
    loadCascade();

    faceDetectionQueue.process(CONCURRENCY, processJob);

    // Job event listeners
    faceDetectionQueue.on('completed', (job) => {
      console.log(`[${WORKER_ID}] ✅ Job ${job.id} completed`);
    });

    faceDetectionQueue.on('failed', (job, err) => {
      console.error(`[${WORKER_ID}] ❌ Job ${job.id} failed:`, err.message);
    });

    faceDetectionQueue.on('stalled', (job) => {
      console.warn(`[${WORKER_ID}] ⚠️ Job ${job.id} stalled`);
    });

    console.log(`[${WORKER_ID}] ✅ Worker ready (${CONCURRENCY} concurrent jobs)`);
  } catch (err) {
    console.error(`[${WORKER_ID}] ❌ Processor setup failed:`, err.message);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log(`[${WORKER_ID}] 🛑 Shutting down gracefully...`);
  try {
    await faceDetectionQueue.close();
    process.exit(0);
  } catch (err) {
    console.error(`[${WORKER_ID}] ❌ Shutdown error:`, err.message);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log(`[${WORKER_ID}] 🛑 Shutting down (SIGINT)...`);
  try {
    await faceDetectionQueue.close();
    process.exit(0);
  } catch (err) {
    console.error(`[${WORKER_ID}] ❌ Shutdown error:`, err.message);
    process.exit(1);
  }
});

// Start worker
setupProcessor().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
