/**
 * OpenCV Face Detection Worker
 * Stateless, horizontally scalable worker for batch face crop processing
 * 
 * Performance:
 * - 100-150ms per image (with resize)
 * - ~8-10 images/sec per worker process
 * - Can run multiple workers in parallel
 */

import cv from 'opencv-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load Haar Cascade classifier
 */
let cascadeClassifier = null;

export function loadCascade() {
  if (cascadeClassifier) return cascadeClassifier;
  
  const cascadePath = cv.HAAR_FRONTALFACE_ALT2;
  try {
    cascadeClassifier = new cv.CascadeClassifier(cascadePath);
    console.log('[OpenCVWorker] ✅ Loaded Haar cascade classifier');
    return cascadeClassifier;
  } catch (err) {
    console.error('[OpenCVWorker] ❌ Failed to load cascade:', err.message);
    throw err;
  }
}

/**
 * Process single image buffer for face detection
 * @param {Buffer} imageBuffer - Raw image data
 * @param {object} options - { padding: 0-50%, maxPadding: px, outputSize: px }
 * @returns {object} - { detected: bool, cropped: Buffer, bbox: {} }
 */
export async function detectAndCropFace(imageBuffer, options = {}) {
  const {
    padding = 0.15, // 15% padding
    maxPadding = 50,
    outputSize = 300,
  } = options;

  try {
    // 1. Decode image with OpenCV
    const mat = cv.imdecode(imageBuffer);
    if (mat.empty) {
      console.warn('[OpenCVWorker] ⚠️ Empty/corrupted image');
      return { detected: false, error: 'Empty image' };
    }

    // 2. Resize for faster detection (keep aspect ratio)
    let resized = mat;
    const maxDim = Math.max(mat.rows, mat.cols);
    if (maxDim > 1024) {
      const scale = 1024 / maxDim;
      resized = mat.resize(
        Math.round(mat.cols * scale),
        Math.round(mat.rows * scale)
      );
    }

    // 3. Detect faces with Haar classifier
    const classifier = loadCascade();
    const detections = classifier.detectMultiScale(resized).objects;

    mat.release();
    if (resized.data !== mat.data) resized.release();

    if (!detections || detections.length === 0) {
      console.warn('[OpenCVWorker] ⚠️ No faces detected');
      return { detected: false };
    }

    // 4. Get largest face (most prominent)
    const largest = detections.reduce((a, b) => 
      (a.width * a.height > b.width * b.height) ? a : b
    );

    // Scale back if we resized
    const scale = maxDim > 1024 ? maxDim / 1024 : 1;
    const bbox = {
      x: Math.round(largest.x * scale),
      y: Math.round(largest.y * scale),
      width: Math.round(largest.width * scale),
      height: Math.round(largest.height * scale),
    };

    // 5. Apply padding
    let padX = Math.round(bbox.width * padding);
    let padY = Math.round(bbox.height * padding);
    padX = Math.min(padX, maxPadding);
    padY = Math.min(padY, maxPadding);

    let extractX = Math.max(0, bbox.x - padX);
    let extractY = Math.max(0, bbox.y - padY);
    let extractW = bbox.width + padX * 2;
    let extractH = bbox.height + padY * 2;

    // Clamp to image bounds
    const origMat = cv.imdecode(imageBuffer);
    extractW = Math.min(extractW, origMat.cols - extractX);
    extractH = Math.min(extractH, origMat.rows - extractY);
    origMat.release();

    // 6. Crop and encode with sharp
    const cropped = await sharp(imageBuffer)
      .extract({
        left: extractX,
        top: extractY,
        width: extractW,
        height: extractH,
      })
      .resize(outputSize, outputSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255 },
      })
      .jpeg({ quality: 95 })
      .toBuffer();

    return {
      detected: true,
      cropped,
      bbox: { ...bbox, padX, padY, extractX, extractY, extractW, extractH },
    };
  } catch (err) {
    console.error('[OpenCVWorker] ❌ Detection error:', err.message);
    return { detected: false, error: err.message };
  }
}

/**
 * Batch process multiple image buffers
 * @param {Buffer[]} imageBuffers
 * @param {object} options
 * @returns {object[]} Results with detection status
 */
export async function batchDetectAndCrop(imageBuffers, options = {}) {
  const results = [];
  
  for (const buffer of imageBuffers) {
    try {
      const result = await detectAndCropFace(buffer, options);
      results.push(result);
    } catch (err) {
      console.error('[OpenCVWorker] Error in batch:', err.message);
      results.push({ detected: false, error: err.message });
    }
  }
  
  return results;
}

/**
 * Cleanup resources
 */
export function cleanup() {
  if (cascadeClassifier) {
    cascadeClassifier = null;
  }
}
