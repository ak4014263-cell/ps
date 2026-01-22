# Multivendor Image Processing Queue System

## Overview

A production-ready, scalable asynchronous job queue system for handling high-volume image processing requests in a multivendor environment.

**Key Features:**
- ✅ Queue-based async processing (Bull + Redis)
- ✅ Load-balanced multiple rembg instances
- ✅ Rate limiting per vendor to prevent abuse
- ✅ Automatic retry with exponential backoff
- ✅ Job progress tracking and monitoring
- ✅ Chunked database updates to avoid MySQL packet limits
- ✅ Concurrent job processing (3 BG removal, 3 face crop, 5 image processing)

## Architecture

```
Frontend
    ↓
API Routes (/api/image-queue/*)
    ↓
Job Queue (Redis + Bull)
    ├─ Background Removal Queue (3 workers)
    ├─ Face Crop Queue (3 workers)
    └─ Image Processing Queue (5 workers)
    ↓
Worker Service (worker.js)
    ├─ Load-balanced rembg calls
    ├─ Cloudinary uploads
    └─ Chunked DB updates
    ↓
Database (MySQL)
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install bull redis express-rate-limit rate-limit-redis node-fetch
```

### 2. Start Services

```bash
# Terminal 1: Start Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2: Start rembg instances (load-balanced)
docker-compose up rembg rembg-1 rembg-2

# Terminal 3: Start backend API
cd backend
npm start

# Terminal 4: Start worker (background processing)
node worker.js
```

Or with docker-compose (all services):
```bash
docker-compose up
```

### 3. Configure Environment Variables

Add to `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REMBG_URLS=http://localhost:5000,http://localhost:5001,http://localhost:5002
```

## API Endpoints

### Queue Background Removal (Single)

**POST** `/api/image-queue/remove-bg-queue`

```json
{
  "recordId": "record-123",
  "projectId": "project-456",
  "photoUrl": "https://example.com/photo.jpg",
  "vendorId": "vendor-789"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job-abc123",
  "recordId": "record-123",
  "message": "Job queued for processing",
  "estimatedTime": "30-60 seconds"
}
```

### Queue Background Removal (Bulk)

**POST** `/api/image-queue/bulk-remove-bg`

```json
{
  "recordIds": ["rec-1", "rec-2", "rec-3"],
  "projectId": "project-456",
  "photoUrls": ["url-1", "url-2", "url-3"],
  "vendorId": "vendor-789"
}
```

**Response:**
```json
{
  "success": true,
  "jobIds": ["job-1", "job-2", "job-3"],
  "count": 3,
  "message": "Bulk jobs queued for processing",
  "estimatedTime": "90-180 seconds"
}
```

### Queue Face Crop (Single)

**POST** `/api/image-queue/crop-face-queue`

```json
{
  "recordId": "record-123",
  "projectId": "project-456",
  "photoUrl": "https://example.com/photo.jpg",
  "mode": "passport",
  "vendorId": "vendor-789"
}
```

### Queue Face Crop (Bulk)

**POST** `/api/image-queue/bulk-crop-face`

```json
{
  "recordIds": ["rec-1", "rec-2", "rec-3"],
  "projectId": "project-456",
  "photoUrls": ["url-1", "url-2", "url-3"],
  "mode": "idcard",
  "vendorId": "vendor-789"
}
```

### Get Job Status

**GET** `/api/image-queue/job/:jobId`

**Response:**
```json
{
  "id": "job-abc123",
  "state": "completed",
  "progress": 100,
  "data": { "recordId": "rec-1", ... },
  "result": { "success": true, "photoUrl": "..." }
}
```

### Get Queue Statistics

**GET** `/api/image-queue/queue-stats`

**Response:**
```json
{
  "backgroundRemoval": {
    "waiting": 5,
    "active": 3,
    "completed": 128,
    "failed": 2
  },
  "faceCrop": {
    "waiting": 2,
    "active": 2,
    "completed": 45,
    "failed": 0
  }
}
```

### Get Worker Health

**GET** `/api/worker/health`

**Response:**
```json
{
  "status": "healthy",
  "bgRemovalQueueSize": 8,
  "faceCropQueueSize": 4,
  "timestamp": "2026-01-16T..."
}
```

## Frontend Integration

### Using the Queue API

```typescript
import { queueAPI } from '@/lib/queueAPI';

// Queue a single background removal
const response = await queueAPI.queueBackgroundRemoval(
  recordId,
  projectId,
  photoUrl
);

// Queue bulk background removal
const bulkResponse = await queueAPI.queueBulkBackgroundRemoval(
  recordIds,
  projectId,
  photoUrls
);

// Poll until completion
const result = await queueAPI.pollJobUntilComplete(jobId, 5 * 60 * 1000);
```

### With React Query (Recommended)

```typescript
import { useMutation } from '@tanstack/react-query';
import { queueAPI } from '@/lib/queueAPI';
import { toast } from 'sonner';

const useQueueBgRemoval = () => {
  return useMutation({
    mutationFn: async ({ recordId, projectId, photoUrl }) => {
      const response = await queueAPI.queueBackgroundRemoval(
        recordId,
        projectId,
        photoUrl
      );
      
      // Poll until done
      return queueAPI.pollJobUntilComplete(response.jobId);
    },
    onSuccess: (data) => {
      toast.success('Background removed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to remove background');
    },
  });
};
```

## Rate Limiting

The system includes rate limiting to protect shared resources:

| Limit | Value | Scope |
|-------|-------|-------|
| Global | 100 requests/15 min | Per IP |
| Image Processing | 50 requests/15 min | Per vendor |
| Background Removal | 30 requests/hour | Per vendor (strict) |
| Bulk Operations | 10 operations/hour | Per vendor |

**Rate Limit Response Headers:**
```
RateLimit-Limit: 30
RateLimit-Remaining: 28
RateLimit-Reset: 1705420800
```

## Worker Configuration

### Concurrency Settings

Edit `backend/lib/queue.js`:

```javascript
bgRemovalQueue.process('*', 3);      // 3 concurrent BG removals
faceCropQueue.process('*', 3);       // 3 concurrent face crops
imageProcessingQueue.process('*', 5); // 5 concurrent other processing
```

Increase these based on:
- Available CPU cores
- Memory available
- Rembg instance capacity

### Rembg Load Balancing

The worker rotates between rembg instances:
- `http://localhost:5000` (port 5000)
- `http://rembg-1:5000` (port 5001)
- `http://rembg-2:5000` (port 5002)

Add more instances in `docker-compose.yml` and update `REMBG_URLS` in worker.js.

## Job Lifecycle

```
Queued → Active → In Progress (with retries) → Completed
                                     ↓
                                   Failed (retry 3x)
                                     ↓
                                   Dead Letter Queue
```

**Retry Strategy:**
- Max attempts: 3
- Backoff: Exponential (2s, 4s, 8s)
- Timeout: 60 seconds per job

## Database Optimization

### Chunked Updates

The worker splits large updates into chunks to avoid `max_allowed_packet` errors:

```javascript
// Update split into 10-field chunks
for (let i = 0; i < updateKeys.length; i += 10) {
  // Execute update for chunk
}
```

### Retry Logic

If packet too large, retry with smaller chunk size.

## Monitoring

### Queue Statistics

```bash
curl http://localhost:3001/api/image-queue/queue-stats
```

### Worker Health

```bash
curl http://localhost:3001/api/worker/health
```

### Specific Job Status

```bash
curl http://localhost:3001/api/image-queue/job/job-abc123
```

### Redis CLI

```bash
docker exec -it crystal-redis redis-cli
> INFO stats
> LLEN bull:background-removal:wait
> LLEN bull:background-removal:active
```

## Troubleshooting

### 1. Jobs Stuck in Queue

**Symptom:** Jobs not processing

**Solution:**
```bash
# Check worker is running
ps aux | grep worker.js

# Check Redis connection
redis-cli ping

# Check rembg instances
curl http://localhost:5000/health
```

### 2. Rate Limit Errors

**Symptom:** 429 Too Many Requests

**Solution:**
- Increase limits in `backend/lib/rateLimiter.js`
- Wait for rate limit window to reset
- Check queue stats for bottlenecks

### 3. MySQL Packet Size Errors

**Symptom:** "Got a packet bigger than 'max_allowed_packet' bytes"

**Solution:**
- Worker automatically retries with smaller chunks
- Or increase MySQL limit in `my.ini`:
  ```ini
  max_allowed_packet=64M
  ```
- Restart MySQL

### 4. Rembg Timeouts

**Symptom:** Jobs timing out after 60 seconds

**Solution:**
- Check rembg instance logs: `docker logs rembg-service`
- Increase job timeout in `backend/lib/queue.js`
- Add more rembg instances for load balancing

### 5. Redis Connection Issues

**Symptom:** "connect ECONNREFUSED 127.0.0.1:6379"

**Solution:**
```bash
# Start Redis
docker-compose up redis

# Or locally
brew services start redis
```

## Performance Metrics

**Typical Processing Times:**
- Single BG Removal: 30-60 seconds
- Bulk BG Removal (10 images): 5-10 minutes
- Single Face Crop: 20-40 seconds
- Single Face Crop (bulk 10): 3-7 minutes

**Throughput with 3 workers:**
- ~6 BG removals/minute
- ~6 face crops/minute
- ~10 other operations/minute

**With GPU support (uncomment in docker-compose.yml):**
- ~12 BG removals/minute
- ~12 face crops/minute

## Production Recommendations

1. **Enable GPU Support:**
   - Uncomment GPU section in docker-compose.yml
   - Install nvidia-docker
   - Improves throughput 2-3x

2. **Use Persistent Storage:**
   - Configure Redis persistence: `appendonly yes`
   - Back up Redis snapshots

3. **Monitor Queue Depth:**
   - Alert if waiting queue > 100 jobs
   - Alert if job failure rate > 1%

4. **Scale Rembg:**
   - Start with 2-3 instances
   - Add more if avg processing time increases

5. **Database Optimization:**
   - Index: `data_records(vendor_id, processing_status)`
   - Periodic cleanup of old processed records

## Architecture Diagram

```
Vendors A, B, C
     ↓   ↓   ↓
    API Endpoint
 /image-queue/*
     ↓
Rate Limiter
(30 req/hour per vendor)
     ↓
    Redis Queue
   ┌──────────┐
   │ BG Removal Q │ → 3 Workers
   │ Face Crop Q  │ → 3 Workers
   └──────────┘
     ↓ (Load balanced)
  Rembg Instances
  ├─ rembg:5000
  ├─ rembg-1:5000
  └─ rembg-2:5000
     ↓
 Cloudinary CDN
     ↓
  MySQL Database
     ↓
Frontend gets URL via polling
```

## See Also

- [README: Background Removal Feature](../AI_IMAGE_BACKGROUND_REMOVER_GUIDE.md)
- [Backend Setup Guide](../BACKEND_INTEGRATION_GUIDE.md)
- [Database Schema](../DATABASE_COMPLETE_SCHEMA.sql)
