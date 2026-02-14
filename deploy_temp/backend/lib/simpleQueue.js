/**
 * Simple In-Memory Queue (Fallback when Redis not available)
 * Used for development/testing without Redis dependency
 */

class SimpleQueue {
  constructor(name) {
    this.name = name;
    this.waiting = [];
    this.active = [];
    this.completed = [];
    this.failed = [];
    this.processors = new Map();
    this.jobCounter = 0;
  }

  process(pattern, concurrency, processor) {
    this.processors.set(pattern, { processor, concurrency });
    this.startProcessing();
  }

  async add(data, options = {}) {
    const jobId = `job-${++this.jobCounter}`;
    const job = {
      id: jobId,
      data,
      attempts: 0,
      maxAttempts: options.attempts || 1,
      progress: 0,
      state: 'waiting',
      startedAt: null,
      completedAt: null,
    };
    this.waiting.push(job);
    return job;
  }

  async process(pattern, concurrency, processor) {
    this.processors.set(pattern, { processor, concurrency });
  }

  async startProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    setInterval(() => {
      while (this.waiting.length > 0 && this.active.length < 3) {
        const job = this.waiting.shift();
        this.active.push(job);
        this.executeJob(job);
      }
    }, 100);
  }

  async executeJob(job) {
    job.state = 'active';
    job.startedAt = new Date();

    try {
      const processor = Array.from(this.processors.values())[0];
      if (processor) {
        await processor.processor(job);
      }
      job.state = 'completed';
      job.completedAt = new Date();
      this.active = this.active.filter(j => j.id !== job.id);
      this.completed.push(job);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error.message);
      job.state = 'failed';
      this.active = this.active.filter(j => j.id !== job.id);
      this.failed.push(job);
    }
  }

  on(event, handler) {
    // Event emitter stub
  }

  async getJob(id) {
    return [
      ...this.waiting,
      ...this.active,
      ...this.completed,
      ...this.failed,
    ].find(j => j.id === id);
  }

  async getJobCounts() {
    return {
      waiting: this.waiting.length,
      active: this.active.length,
      completed: this.completed.length,
      failed: this.failed.length,
    };
  }

  async count() {
    return this.waiting.length + this.active.length;
  }

  async clean(ms, type) {
    // Stub
  }
}

export { SimpleQueue };
