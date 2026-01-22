# Queue Management System for Rembg Microservice

## Overview

The Queue Management System provides robust job queuing, tracking, and asynchronous processing for the Rembg background removal microservice. It enables handling of high-volume image processing tasks with persistent storage and real-time status tracking.

## Features

- **Job Queueing**: Submit single or batch image processing jobs
- **Persistent Storage**: SQLite database for job state persistence
- **Status Tracking**: Real-time job status and progress monitoring
- **Worker Management**: Background worker for asynchronous processing
- **Error Handling**: Comprehensive error tracking and recovery
- **Statistics**: Queue statistics and worker status monitoring
- **Job Cancellation**: Cancel pending jobs before processing starts

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Queue Management Endpoints                 │  │
│  │  - /queue/submit          (Submit jobs)             │  │
│  │  - /queue/job/{id}        (Check status)            │  │
│  │  - /queue/jobs            (List jobs)               │  │
│  │  - /queue/stats           (Get statistics)          │  │
│  │  - /queue/job/{id}/cancel (Cancel job)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │
           ├──> QueueManager (queue_manager.py)
           │    - SQLite database management
           │    - Job CRUD operations
           │    - Status tracking
           │
           └──> JobWorker (job_worker.py)
                - Background processing loop
                - Job status updates
                - Error handling
                - Concurrent job management
```

## Components

### 1. QueueManager (`queue_manager.py`)

Manages the SQLite database and job lifecycle.

**Key Methods:**

- `create_job()` - Create a new job in the queue
- `get_job()` - Retrieve job details
- `update_job_status()` - Update job status and progress
- `get_pending_jobs()` - Get jobs awaiting processing
- `get_job_stats()` - Get queue statistics
- `cancel_job()` - Cancel a pending job
- `cleanup_old_jobs()` - Remove old completed jobs

### 2. JobWorker (`job_worker.py`)

Processes jobs asynchronously from the queue.

**Key Methods:**

- `start()` - Start the worker loop
- `stop()` - Gracefully stop the worker
- `_process_batch()` - Process a batch of pending jobs
- `_process_job()` - Process individual job
- `process_image_bytes()` - Core image processing logic

### 3. Database Schema

```sql
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,                    -- Unique job ID
    status TEXT NOT NULL,                   -- pending, processing, completed, failed, cancelled
    created_at TEXT NOT NULL,               -- Job creation timestamp
    started_at TEXT,                        -- When job processing started
    completed_at TEXT,                      -- When job completed
    job_type TEXT NOT NULL,                 -- 'single' or 'batch'
    filenames TEXT,                         -- JSON array of filenames
    total_files INTEGER,                    -- Total files in job
    processed_files INTEGER DEFAULT 0,      -- Files successfully processed
    failed_files INTEGER DEFAULT 0,         -- Files that failed
    model TEXT,                             -- Rembg model used
    error_message TEXT,                     -- Error details if failed
    results TEXT,                           -- JSON results data
    metadata TEXT                           -- Additional metadata
);
```

## Job Status Lifecycle

```
PENDING  --[Worker picks up]--> PROCESSING --[All files done]--> COMPLETED
         --[Manual cancel]---> CANCELLED
                                    |
                                 [Error]--> FAILED
```

## API Endpoints

### Submit Job to Queue

**POST** `/queue/submit`

Submit images for background removal processing.

```bash
curl -X POST "http://localhost:5000/queue/submit?model=u2net" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"
```

**Request:**
- `images` (FormData): List of image files
- `model` (Query): Rembg model (default: "u2net")

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "job_type": "batch",
  "files_count": 2,
  "model": "u2net",
  "message": "Job queued successfully. Check status with /queue/job/{job_id}"
}
```

### Get Job Status

**GET** `/queue/job/{job_id}`

Check the status and progress of a job.

```bash
curl "http://localhost:5000/queue/job/550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "type": "batch",
  "created_at": "2026-01-15T10:30:00.000000",
  "started_at": "2026-01-15T10:30:05.000000",
  "completed_at": null,
  "progress": {
    "total": 2,
    "processed": 1,
    "failed": 0
  },
  "model": "u2net",
  "filenames": ["image1.jpg", "image2.jpg"],
  "results": null,
  "error": null
}
```

### List Jobs

**GET** `/queue/jobs?status=pending&limit=20`

List jobs in the queue.

```bash
curl "http://localhost:5000/queue/jobs?status=processing&limit=10"
```

**Query Parameters:**
- `status` (Optional): Filter by status
- `limit` (Optional): Maximum jobs to return (default: 20)

**Response:**
```json
{
  "total": 1,
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "processing",
      "type": "batch",
      "created_at": "2026-01-15T10:30:00.000000",
      "started_at": "2026-01-15T10:30:05.000000",
      "completed_at": null,
      "progress": {
        "total": 2,
        "processed": 1,
        "failed": 0
      },
      "model": "u2net",
      "filenames": ["image1.jpg", "image2.jpg"],
      "results": null,
      "error": null
    }
  ]
}
```

### Get Queue Statistics

**GET** `/queue/stats`

Get current queue statistics and worker status.

```bash
curl "http://localhost:5000/queue/stats"
```

**Response:**
```json
{
  "stats": {
    "pending": 5,
    "processing": 2,
    "completed": 42,
    "failed": 1,
    "cancelled": 0,
    "total": 50
  },
  "worker": {
    "status": "running",
    "active_jobs": 2,
    "max_concurrent": 2
  }
}
```

### Cancel Job

**POST** `/queue/job/{job_id}/cancel`

Cancel a pending job (only works for jobs not yet processing).

```bash
curl -X POST "http://localhost:5000/queue/job/550e8400-e29b-41d4-a716-446655440000/cancel"
```

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled",
  "message": "Job cancelled successfully"
}
```

## Usage Examples

### Example 1: Submit and Monitor Batch Job

```python
import requests
import time

BASE_URL = "http://localhost:5000"

# Step 1: Submit job
files = [
    ('images', open('image1.jpg', 'rb')),
    ('images', open('image2.jpg', 'rb')),
]
response = requests.post(f"{BASE_URL}/queue/submit", files=files)
job_id = response.json()['job_id']
print(f"Job submitted: {job_id}")

# Step 2: Poll for status
while True:
    status_response = requests.get(f"{BASE_URL}/queue/job/{job_id}")
    job_status = status_response.json()
    
    print(f"Status: {job_status['status']}")
    print(f"Progress: {job_status['progress']['processed']}/{job_status['progress']['total']}")
    
    if job_status['status'] in ['completed', 'failed', 'cancelled']:
        break
    
    time.sleep(2)

# Step 3: Get results
print(f"Final status: {job_status['status']}")
if job_status['results']:
    print(f"Results: {job_status['results']}")
```

### Example 2: Queue Monitoring Dashboard

```python
import requests

BASE_URL = "http://localhost:5000"

# Get queue statistics
stats = requests.get(f"{BASE_URL}/queue/stats").json()

print("Queue Statistics:")
print(f"  Pending: {stats['stats']['pending']}")
print(f"  Processing: {stats['stats']['processing']}")
print(f"  Completed: {stats['stats']['completed']}")
print(f"  Failed: {stats['stats']['failed']}")
print(f"  Total: {stats['stats']['total']}")

print("\nWorker Status:")
print(f"  Status: {stats['worker']['status']}")
print(f"  Active Jobs: {stats['worker']['active_jobs']}/{stats['worker']['max_concurrent']}")
```

### Example 3: Frontend Integration (JavaScript)

```javascript
// Submit job
async function submitJob(files, model = 'u2net') {
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));
  
  const response = await fetch('http://localhost:5000/queue/submit?model=' + model, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.job_id;
}

// Poll job status
async function pollJobStatus(jobId, onUpdate) {
  while (true) {
    const response = await fetch(`http://localhost:5000/queue/job/${jobId}`);
    const job = await response.json();
    
    onUpdate(job);
    
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return job;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Usage
const jobId = await submitJob(selectedFiles);
await pollJobStatus(jobId, (job) => {
  updateProgressBar(job.progress.processed / job.progress.total);
  updateStatusText(job.status);
});
```

## Configuration

### Worker Configuration

Modify worker settings in `app.py`:

```python
worker = init_worker(
    queue_manager,
    max_concurrent=2      # Adjust based on CPU cores
)
```

**Recommended settings:**
- **CPU-bound (u2net)**: max_concurrent = CPU_CORES / 2
- **Lightweight (siluette)**: max_concurrent = CPU_CORES
- **GPU-accelerated**: max_concurrent = 4-8

### Queue Database

- Location: `queue.db` (in rembg-microservice directory)
- Automatic cleanup: Old jobs deleted after 7 days
- Manual cleanup: 

```python
queue_manager.cleanup_old_jobs(days=7)
```

## Performance Tuning

### 1. Optimize Concurrent Jobs

```python
# For 4-core CPU:
worker = init_worker(queue_manager, max_concurrent=2)

# For 8-core CPU:
worker = init_worker(queue_manager, max_concurrent=4)
```

### 2. Database Optimization

```python
# Regular cleanup
import asyncio

async def cleanup_task():
    while True:
        queue_manager.cleanup_old_jobs(days=7)
        await asyncio.sleep(86400)  # Once per day
```

### 3. Model Selection Impact

- **u2net**: ~176 MB, ~2-3s per image (best quality)
- **u2netp**: ~4.7 MB, ~1.5s per image
- **siluette**: ~167 KB, ~0.5s per image (fastest)
- **isnet-general**: ~167 MB, ~1.5s per image (very high quality)

## Monitoring

### Health Checks

```bash
# Service health
curl http://localhost:5000/health

# Queue health
curl http://localhost:5000/queue/stats
```

### Logging

Logs are written to console and can be configured:

```python
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Error Handling

### Job Failures

Failed jobs retain error messages for debugging:

```json
{
  "status": "failed",
  "error": "Invalid image format",
  "failed_files": 1
}
```

### Automatic Retries

Currently, failed jobs are not automatically retried. To implement retries:

```python
# In job_worker.py
MAX_RETRIES = 3
retry_count = job.get('retry_count', 0)
if retry_count < MAX_RETRIES:
    # Reset to pending for retry
    queue_manager.update_job_status(
        job_id,
        JobStatus.PENDING,
        retry_count=retry_count + 1
    )
```

## Troubleshooting

### High Queue Backup

- Increase `max_concurrent` in worker initialization
- Use faster model (siluette instead of u2net)
- Increase server resources (CPU cores)

### Worker Not Processing Jobs

- Check worker status: `GET /queue/stats`
- View application logs for errors
- Verify worker startup in app logs

### Database Lock Issues

- Reduce concurrent database access
- Implement connection pooling (optional enhancement)
- Ensure proper cleanup of old jobs

## Future Enhancements

1. **Persistent Task Queue**: Use Redis/RabbitMQ for distributed processing
2. **Retry Logic**: Automatic job retries with exponential backoff
3. **Priority Queue**: Support priority-based job processing
4. **Webhooks**: Notify clients when jobs complete
5. **Result Storage**: Store processed images in blob storage
6. **Distributed Workers**: Multiple worker instances across servers
7. **Advanced Metrics**: Prometheus metrics and monitoring
8. **Job Templates**: Reusable job configurations

## Related Files

- [app.py](./app.py) - Main FastAPI application
- [queue_manager.py](./queue_manager.py) - Queue management logic
- [job_worker.py](./job_worker.py) - Job processing worker
- [requirements.txt](./requirements.txt) - Python dependencies
