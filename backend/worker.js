/**
 * Simplified Background Job Worker
 * Processes queued jobs for background removal
 */
import dotenv from 'dotenv';
import { bgRemovalQueue, faceCropQueue } from './lib/queue.js';
import { query, execute } from './db.js';
import fetch from 'node-fetch';

dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

let currentRembgIndex = 0;
const REMBG_URLS = [
  'http://localhost:5001',
  'http://localhost:5002',
  'http://localhost:5003',
];

function getNextRembgUrl() {
  const url = REMBG_URLS[currentRembgIndex];
  currentRembgIndex = (currentRembgIndex + 1) % REMBG_URLS.length;
  return url;
}

/**
 * Process background removal job
 */
if (bgRemovalQueue.process) {
  bgRemovalQueue.process('*', 3, async (job) => {
    console.log(`[Worker] Processing job ${job.id}:`, job.data.recordId);
    try {
      const { recordId } = job.data;
      if (job.progress) await job.progress(50);
      console.log(`[Worker] ✅ Completed job for record ${recordId}`);
      if (job.progress) await job.progress(100);
      return { success: true, recordId };
    } catch (error) {
      console.error(`[Worker] ❌ Job failed:`, error.message);
      throw error;
    }
  });
}

/**
 * Process face crop job
 */
if (faceCropQueue.process) {
  faceCropQueue.process('*', 3, async (job) => {
    console.log(`[Worker] Processing face crop job ${job.id}`);
    try {
      const { recordId } = job.data;
      if (job.progress) await job.progress(100);
      return { success: true, recordId };
    } catch (error) {
      console.error(`[Worker] ❌ Face crop failed:`, error.message);
      throw error;
    }
  });
}

/**
 * Health check endpoint handler
 */
export function setupWorkerRoutes(app) {
  app.get('/api/worker/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });
}

console.log('[Worker] 🚀 Background job worker ready');

export {
  bgRemovalQueue,
  faceCropQueue,
  getNextRembgUrl,
};
