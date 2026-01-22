# 🚀 Multivendor Queue System - Quick Reference

## ⚡ 60-Second Setup

```bash
# 1. Install packages
cd backend && npm install bull redis express-rate-limit rate-limit-redis node-fetch

# 2. Start services
docker-compose up

# 3. Start worker (new terminal)
cd backend && node worker.js

# 4. Verify
curl http://localhost:3001/api/image-queue/queue-stats
```

---

## 📡 API Endpoints

### Queue Single Background Removal
```bash
POST /api/image-queue/remove-bg-queue
{
  "recordId": "rec-1",
  "projectId": "proj-1",
  "photoUrl": "https://...",
  "vendorId": "vendor-1"
}
→ { jobId: "job-abc", estimatedTime: "30-60s" }
```

### Queue Bulk Background Removal
```bash
POST /api/image-queue/bulk-remove-bg
{
  "recordIds": ["rec-1", "rec-2"],
  "projectId": "proj-1",
  "photoUrls": ["url-1", "url-2"],
  "vendorId": "vendor-1"
}
→ { jobIds: ["job-1", "job-2"], count: 2 }
```

### Get Job Status
```bash
GET /api/image-queue/job/job-abc
→ { state: "completed", progress: 100, result: {...} }
```

### Queue Statistics
```bash
GET /api/image-queue/queue-stats
→ { backgroundRemoval: {...}, faceCrop: {...} }
```

### Worker Health
```bash
GET /api/worker/health
→ { status: "healthy", bgRemovalQueueSize: 5, ... }
```

---

## 💻 Frontend Integration

### Simple Example
```typescript
import { queueAPI } from '@/lib/queueAPI';

// Queue a job
const job = await queueAPI.queueBackgroundRemoval(
  recordId,
  projectId,
  photoUrl
);

// Wait for completion
const result = await queueAPI.pollJobUntilComplete(
  job.jobId,
  5 * 60 * 1000  // 5 minute timeout
);

if (result.success) {
  console.log('Processed:', result.result);
} else {
  console.error('Failed:', result.error);
}
```

### With React Query
```typescript
const { mutate } = useMutation({
  mutationFn: async (recordId) => {
    const job = await queueAPI.queueBackgroundRemoval(
      recordId, projectId, photoUrl
    );
    return queueAPI.pollJobUntilComplete(job.jobId);
  },
  onSuccess: () => toast.success('Done!'),
  onError: (err) => toast.error(err.message),
});

mutate(recordId);
```

---

## 🎛️ Configuration

### Rate Limits (per vendor)
- Global: **100 req/15 min**
- Image: **50 req/15 min**
- BG Removal: **30 req/hour** ⚠️ STRICT
- Bulk Ops: **10 ops/hour**

### Worker Concurrency
```javascript
// backend/lib/queue.js
bgRemovalQueue.process('*', 3);       // 3 concurrent
faceCropQueue.process('*', 3);        // 3 concurrent
imageProcessingQueue.process('*', 5); // 5 concurrent
```

### Rembg Instances
- `rembg` → port 5000
- `rembg-1` → port 5001
- `rembg-2` → port 5002

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Throughput (3 workers) | ~6 jobs/min |
| Processing time (CPU) | 30-60 sec |
| Processing time (GPU) | 15-20 sec |
| Max concurrent | 11 jobs (3+3+5) |
| Job timeout | 60 seconds |
| Retry attempts | 3 with backoff |

---

## 🔍 Monitoring

### Check Queue Depth
```bash
watch curl -s http://localhost:3001/api/image-queue/queue-stats | jq
```

### Monitor Worker
```bash
# Terminal output shows:
# [Worker] Processing BG removal job job-123
# [Worker] Completed BG removal for record rec-456
```

### Redis CLI
```bash
redis-cli
> LLEN bull:background-removal:wait
> LLEN bull:background-removal:active
> LLEN bull:background-removal:completed
```

### Get Specific Job
```bash
curl http://localhost:3001/api/image-queue/job/job-123 | jq
```

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Jobs stuck | Check: `ps aux \| grep worker.js` |
| Redis error | Start: `docker-compose up redis` |
| Rembg timeout | Check: `curl http://localhost:5000/health` |
| Rate limit error | Increase limit in `rateLimiter.js` or wait |
| Packet too large | Auto-retry; if fails, increase MySQL config |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/lib/queue.js` | Bull queue setup |
| `backend/lib/rateLimiter.js` | Rate limiting |
| `backend/routes/image-processing-queue.js` | API routes |
| `backend/worker.js` | Job processor |
| `src/lib/queueAPI.ts` | Frontend client |
| `docker-compose.yml` | Services config |

---

## 🚀 Scale Up

### Add Worker
```bash
cd backend && node worker.js &
cd backend && node worker.js &  # Run multiple times
```

### Add Rembg Instance
```yaml
# In docker-compose.yml
rembg-3:
  build: ./rembg-microservice
  ports: ["5003:5000"]
```

### Increase Concurrency
```javascript
// In backend/lib/queue.js
bgRemovalQueue.process('*', 5);  // Increase from 3 to 5
```

---

## 📚 Full Docs

- **MULTIVENDOR_QUEUE_SYSTEM.md** - Complete reference
- **QUEUE_IMPLEMENTATION_GUIDE.md** - Step-by-step
- **QUEUE_ARCHITECTURE.md** - Architecture diagrams
- **setup-queue.sh** - Auto setup script

---

## ✅ Verification Checklist

- [ ] Redis running: `redis-cli ping`
- [ ] Rembg healthy: `curl http://localhost:5000/health`
- [ ] Backend running: `curl http://localhost:3001/`
- [ ] Worker running: `node worker.js` shows logs
- [ ] Queue stats work: `curl http://localhost:3001/api/image-queue/queue-stats`

---

**Version:** 1.0.0 | **Last Updated:** Jan 16, 2026 | **Status:** ✅ Production Ready
