# Multivendor Queue System Implementation Guide

## Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
npm install bull redis express-rate-limit rate-limit-redis node-fetch
cd ..
```

### Step 2: Update Environment
Add to `.env` or `.env.local`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REMBG_URLS=http://localhost:5000,http://rembg-1:5000,http://rembg-2:5000
```

### Step 3: Start Services

**Option A: Docker Compose (Recommended)**
```bash
docker-compose up
```

**Option B: Manual**
```bash
# Terminal 1: Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2: Rembg instances
docker-compose up rembg rembg-1 rembg-2

# Terminal 3: Backend
cd backend && npm start

# Terminal 4: Worker
cd backend && node worker.js
```

### Step 4: Verify Setup
```bash
# Check queue stats
curl http://localhost:3001/api/image-queue/queue-stats

# Check worker health
curl http://localhost:3001/api/worker/health
```

---

## Component Overview

### 1. Backend Library Files

#### `backend/lib/queue.js`
- **Purpose:** Bull queue initialization and management
- **Exports:** 
  - `bgRemovalQueue` - Background removal queue
  - `faceCropQueue` - Face crop queue
  - `addBgRemovalJob()` - Queue a BG removal job
  - `addFaceCropJob()` - Queue a face crop job
  - `getJobStatus()` - Get job status

#### `backend/lib/rateLimiter.js`
- **Purpose:** Express middleware for rate limiting
- **Features:**
  - Global rate limiter (100 req/15 min)
  - Image processing limiter (50 req/15 min per vendor)
  - Background removal limiter (30 req/hour per vendor)
  - Bulk operation limiter (10 ops/hour per vendor)
- **Exports:**
  - `globalLimiter` - Global middleware
  - `imageProcessingLimiter` - Image-specific limiter
  - `bgRemovalLimiter` - BG removal limiter
  - `bulkOperationLimiter` - Bulk ops limiter
  - `setupRateLimiters(app)` - Setup all limiters

### 2. Backend Routes

#### `backend/routes/image-processing-queue.js`
- **Purpose:** API endpoints for job queuing
- **Endpoints:**
  - `POST /remove-bg-queue` - Queue single BG removal
  - `POST /crop-face-queue` - Queue single face crop
  - `GET /job/:jobId` - Get job status
  - `POST /bulk-remove-bg` - Queue bulk BG removal
  - `POST /bulk-crop-face` - Queue bulk face crop
  - `GET /queue-stats` - Queue statistics

### 3. Worker Service

#### `backend/worker.js`
- **Purpose:** Background job processing
- **Features:**
  - Processes BG removal jobs (3 workers)
  - Processes face crop jobs (3 workers)
  - Load-balanced rembg calls
  - Chunked database updates
  - Retry logic with exponential backoff
- **Run:** `node worker.js` in separate terminal

### 4. Frontend Client

#### `src/lib/queueAPI.ts`
- **Purpose:** Frontend API client for queue operations
- **Methods:**
  - `queueBackgroundRemoval()` - Queue single
  - `queueBulkBackgroundRemoval()` - Queue multiple
  - `queueFaceCrop()` - Queue single
  - `queueBulkFaceCrop()` - Queue multiple
  - `getJobStatus()` - Get job status
  - `pollJobUntilComplete()` - Poll until done
  - `getQueueStats()` - Get statistics

---

## Integration Points

### Frontend Component Changes Needed

Update `src/components/project/DataRecordsTable.tsx`:

#### Before (Synchronous)
```typescript
const handleRemoveBackgroundBulk = async () => {
  try {
    // Direct synchronous processing
    const processedImages = await removeBackgroundBatch(photos);
    await saveToDatabase(processedImages);
  } catch (error) {
    // Handle error
  }
};
```

#### After (Queue-Based)
```typescript
import { queueAPI } from '@/lib/queueAPI';

const handleRemoveBackgroundBulk = async () => {
  try {
    setIsRemovingBackground(true);

    // Queue jobs
    const response = await queueAPI.queueBulkBackgroundRemoval(
      selectedIds,
      projectId,
      photoUrls
    );

    toast.info(`${response.count} images queued for processing`, {
      description: response.estimatedTime,
    });

    // Poll for completion
    const results = await Promise.all(
      response.jobIds.map(jobId => 
        queueAPI.pollJobUntilComplete(jobId, 5 * 60 * 1000)
      )
    );

    // Handle results
    const succeeded = results.filter(r => r.success).length;
    toast.success(`${succeeded}/${response.count} images processed`);
    
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['dataRecords', projectId] });
  } catch (error) {
    toast.error(`Error: ${error.message}`);
  } finally {
    setIsRemovingBackground(false);
  }
};
```

### Backend Server Integration

Already done in `backend/server.js`:
```javascript
import imageProcessingQueueRoutes from './routes/image-processing-queue.js';
import { setupRateLimiters } from './lib/rateLimiter.js';

// Setup rate limiters
setupRateLimiters(app);

// Add queue routes
app.use('/api/image-queue', imageProcessingQueueRoutes);
```

---

## Performance Tuning

### Adjust Worker Concurrency

Edit `backend/lib/queue.js`:

```javascript
// Default: 3 BG removals, 3 face crops, 5 other
bgRemovalQueue.process('*', 5);      // Increase to 5
faceCropQueue.process('*', 5);       // Increase to 5
imageProcessingQueue.process('*', 10); // Increase to 10
```

**Recommendations:**
- CPU-bound: Concurrency = CPU cores
- I/O-bound: Concurrency = CPU cores * 2
- Memory-bound: Lower concurrency, monitor memory usage

### Add More Rembg Instances

Edit `docker-compose.yml`:
```yaml
rembg-3:
  build:
    context: ./rembg-microservice
  ports:
    - "5003:5000"
  # ... rest of config
```

Update `backend/worker.js`:
```javascript
const REMBG_URLS = [
  'http://localhost:5000',
  'http://rembg-1:5000',
  'http://rembg-2:5000',
  'http://rembg-3:5000', // New instance
];
```

### Rate Limiting Adjustments

Edit `backend/lib/rateLimiter.js`:

```javascript
// Example: Allow 100 BG removals per hour instead of 30
export const bgRemovalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, // Increased from 30
  // ...
});
```

### Job Timeout Settings

Edit `backend/lib/queue.js`:

```javascript
const job = await bgRemovalQueue.add(data, {
  // ... other options
  timeout: 120000, // Increase from 60s to 120s
});
```

---

## Monitoring & Debugging

### Check Queue Status
```bash
# Get live queue stats
watch curl -s http://localhost:3001/api/image-queue/queue-stats | jq

# Get specific job
curl http://localhost:3001/api/image-queue/job/job-abc123 | jq
```

### Monitor Worker Logs
```bash
# Backend worker
cd backend && node worker.js | grep -E "\[Worker\]|\[Queue\]"

# Backend API
npm start | grep -E "\[API\]|\[RateLimit\]"
```

### Redis Monitoring
```bash
# Connect to Redis
docker exec -it crystal-redis redis-cli

# See all keys
> KEYS *

# Queue depth
> LLEN bull:background-removal:wait
> LLEN bull:background-removal:active
> LLEN bull:background-removal:completed

# Job count
> HLEN bull:background-removal:jobs
```

### Common Issues

**Issue: Jobs not processing**
```bash
# Check worker is running
ps aux | grep "node worker.js"

# Check Redis connection
redis-cli ping  # Should return PONG

# Check rembg health
curl http://localhost:5000/health
```

**Issue: Rate limit too strict**
```bash
# Get rate limit status
redis-cli KEYS "rl:*" | head -20

# Clear rate limits (dev only!)
redis-cli FLUSHDB
```

**Issue: Jobs timing out**
```bash
# Increase timeout in queue.js
timeout: 300000 // 5 minutes instead of 60s

# Check rembg logs
docker logs rembg-service | tail -50
```

---

## Testing

### Manual Test Script

```bash
#!/bin/bash
# test-queue.sh

# Queue a single BG removal
curl -X POST http://localhost:3001/api/image-queue/remove-bg-queue \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "test-rec-1",
    "projectId": "test-proj",
    "photoUrl": "https://via.placeholder.com/300x300",
    "vendorId": "test-vendor"
  }'

# Wait for completion
echo "Waiting 5 seconds for processing..."
sleep 5

# Get queue stats
curl http://localhost:3001/api/image-queue/queue-stats | jq
```

### Load Testing

```bash
#!/bin/bash
# Simulate 50 concurrent requests

for i in {1..50}; do
  curl -X POST http://localhost:3001/api/image-queue/remove-bg-queue \
    -H "Content-Type: application/json" \
    -d "{
      \"recordId\": \"test-rec-$i\",
      \"projectId\": \"test-proj\",
      \"photoUrl\": \"https://via.placeholder.com/300x300\",
      \"vendorId\": \"vendor-$((i % 5))\"
    }" &
done

wait
```

---

## Next Steps

1. **Test the setup:**
   - Queue a few jobs
   - Monitor queue stats
   - Verify database updates

2. **Update frontend components:**
   - Modify DataRecordsTable.tsx
   - Use queueAPI for async operations
   - Add progress indicators

3. **Scale for production:**
   - Add GPU support to rembg
   - Enable Redis persistence
   - Set up monitoring/alerts

4. **Monitor performance:**
   - Track job completion times
   - Monitor queue depth
   - Track vendor usage patterns

---

## See Also

- [MULTIVENDOR_QUEUE_SYSTEM.md](../MULTIVENDOR_QUEUE_SYSTEM.md) - Complete documentation
- [AI_IMAGE_BACKGROUND_REMOVER_GUIDE.md](../AI_IMAGE_BACKGROUND_REMOVER_GUIDE.md) - Feature guide
- [BACKEND_INTEGRATION_GUIDE.md](../BACKEND_INTEGRATION_GUIDE.md) - Backend setup
