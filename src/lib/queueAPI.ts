/**
 * Queue Processing API Client
 * Frontend integration with async job queue
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const queueAPI = {
  /**
   * Queue a single background removal job
   */
  async queueBackgroundRemoval(recordId: string, projectId: string, photoUrl: string) {
    const response = await fetch(`${API_BASE}/api/image-queue/remove-bg-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordId,
        projectId,
        photoUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to queue background removal: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Queue multiple background removal jobs
   */
  async queueBulkBackgroundRemoval(
    recordIds: string[],
    projectId: string,
    photoUrls: string[]
  ) {
    const response = await fetch(`${API_BASE}/api/image-queue/bulk-remove-bg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordIds,
        projectId,
        photoUrls,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to queue bulk background removal: ${response.statusText}`);
    }

    return response.json();
  },


  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string) {
    const response = await fetch(`${API_BASE}/api/image-queue/job/${jobId}`);

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Poll job status until completion or error
   * @param jobId Job ID to poll
   * @param maxWait Maximum time to wait in ms (default 5 minutes)
   * @param interval Polling interval in ms (default 1 second)
   */
  async pollJobUntilComplete(
    jobId: string,
    maxWait = 5 * 60 * 1000,
    interval = 1000
  ): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const status = await this.getJobStatus(jobId);

        if (status.state === 'completed') {
          return { success: true, result: status.result };
        }

        if (status.state === 'failed') {
          return { success: false, error: status.failedReason };
        }

        // Still processing
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error('[QueueAPI] Error polling job:', error);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return { success: false, error: 'Job polling timeout' };
  },

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const response = await fetch(`${API_BASE}/api/image-queue/queue-stats`);

    if (!response.ok) {
      throw new Error(`Failed to get queue stats: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get worker health status
   */
  async getWorkerHealth() {
    const response = await fetch(`${API_BASE}/api/worker/health`);

    if (!response.ok) {
      throw new Error(`Failed to get worker health: ${response.statusText}`);
    }

    return response.json();
  },
};

export default queueAPI;
