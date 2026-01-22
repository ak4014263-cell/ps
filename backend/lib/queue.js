/**
 * Development Queue - Simple in-memory implementation
 * No Redis dependency for local testing
 */
import { SimpleQueue } from './simpleQueue.js';

export const bgRemovalQueue = new SimpleQueue('background-removal');
export const faceCropQueue = new SimpleQueue('face-crop');
export const imageProcessingQueue = new SimpleQueue('image-processing');

console.log('[Queue] 📦 Using in-memory SimpleQueue for development');

/**
 * Add a job to background removal queue
 */
export async function addBgRemovalJob(data) {
  try {
    const job = await bgRemovalQueue.add(data, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
      timeout: 60000,
    });
    console.log(`[Queue] ➕ BG removal job ${job.id} queued`);
    return job;
  } catch (error) {
    console.error('[Queue] ❌ Failed to add BG removal job:', error);
    throw error;
  }
}

/**
 * Add a job to face crop queue
 */
export async function addFaceCropJob(data) {
  try {
    const job = await faceCropQueue.add(data, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
      timeout: 60000,
    });
    console.log(`[Queue] ➕ Face crop job ${job.id} queued`);
    return job;
  } catch (error) {
    console.error('[Queue] ❌ Failed to add face crop job:', error);
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(queue, jobId) {
  try {
    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      state: job.state,
      progress: job.progress || 0,
      attempts: job.attempts || 0,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  } catch (error) {
    console.error('[Queue] ❌ Failed to get job status:', error);
    throw error;
  }
}

/**
 * Cleanup queue
 */
export async function cleanupQueue(queue) {
  try {
    await queue.empty?.();
    console.log('[Queue] 🧹 Queue cleaned');
  } catch (error) {
    console.error('[Queue] ❌ Failed to cleanup queue:', error);
  }
}
