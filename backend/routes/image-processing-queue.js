/**
 * Image Processing Routes with Queue Integration
 * Handles background removal and face cropping with job queue
 */
import express from 'express';
import { addBgRemovalJob, getJobStatus, bgRemovalQueue } from '../lib/queue.js';
import { bgRemovalLimiter, bulkOperationLimiter } from '../lib/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/image/remove-bg-queue
 * Queue background removal job (async, returns job ID)
 */
router.post('/remove-bg-queue', bgRemovalLimiter, async (req, res) => {
  try {
    const { recordId, projectId, photoUrl, vendorId } = req.body;

    if (!recordId || !photoUrl) {
      return res.status(400).json({ error: 'recordId and photoUrl required' });
    }

    console.log(`[API] Queuing BG removal for record ${recordId}`);

    const job = await addBgRemovalJob({
      recordId,
      projectId,
      photoUrl,
      vendorId,
      type: 'background-removal',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      jobId: job.id,
      recordId,
      message: 'Job queued for processing',
      estimatedTime: '30-60 seconds',
    });
  } catch (error) {
    console.error('[API] Failed to queue BG removal:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/image/job/:jobId
 * Get job status (polling endpoint for frontend)
 */
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Check background removal queue
    let jobStatus = await getJobStatus(bgRemovalQueue, jobId);

    if (!jobStatus) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(jobStatus);
  } catch (error) {
    console.error('[API] Failed to get job status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/image/bulk-remove-bg
 * Queue multiple background removal jobs
 */
router.post('/bulk-remove-bg', bulkOperationLimiter, async (req, res) => {
  try {
    const { recordIds, projectId, photoUrls, vendorId } = req.body;

    if (!recordIds || !photoUrls || recordIds.length !== photoUrls.length) {
      return res.status(400).json({ error: 'Invalid recordIds or photoUrls' });
    }

    console.log(`[API] Queuing bulk BG removal for ${recordIds.length} records`);

    const jobs = await Promise.all(
      recordIds.map((recordId, index) =>
        addBgRemovalJob({
          recordId,
          projectId,
          photoUrl: photoUrls[index],
          vendorId,
          type: 'background-removal',
          timestamp: new Date().toISOString(),
        })
      )
    );

    res.json({
      success: true,
      jobIds: jobs.map(j => j.id),
      count: jobs.length,
      message: 'Bulk jobs queued for processing',
      estimatedTime: `${jobs.length * 30}-${jobs.length * 60} seconds`,
    });
  } catch (error) {
    console.error('[API] Failed to queue bulk BG removal:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/image/queue-stats
 * Get queue statistics for monitoring
 */
router.get('/queue-stats', async (req, res) => {
  try {
    const bgStats = await bgRemovalQueue.getJobCounts();

    res.json({
      backgroundRemoval: bgStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Failed to get queue stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
