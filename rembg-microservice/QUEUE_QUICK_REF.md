# Queue Management Quick Reference

## Quick Start

### 1. Start the Service

```bash
cd rembg-microservice
python -m uvicorn app:app --host 0.0.0.0 --port 5000
```

### 2. Submit a Job

```bash
curl -X POST "http://localhost:5000/queue/submit" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"
```

Returns:
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  ...
}
```

### 3. Check Status

```bash
curl "http://localhost:5000/queue/job/550e8400-e29b-41d4-a716-446655440000"
```

### 4. View Queue Stats

```bash
curl "http://localhost:5000/queue/stats"
```

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/queue/submit` | POST | Submit images for processing |
| `/queue/job/{id}` | GET | Get job status and progress |
| `/queue/jobs` | GET | List jobs (filterable by status) |
| `/queue/stats` | GET | Get queue statistics |
| `/queue/job/{id}/cancel` | POST | Cancel pending job |

## Using the CLI Example

### Submit Job
```bash
python queue_example.py submit image1.jpg image2.jpg
```

### Monitor Job
```bash
python queue_example.py monitor 550e8400-e29b-41d4-a716-446655440000
```

### Check Status
```bash
python queue_example.py status 550e8400-e29b-41d4-a716-446655440000
```

### List Queue
```bash
python queue_example.py list                    # All jobs
python queue_example.py list processing        # Only processing
python queue_example.py list completed 5       # Last 5 completed
```

### View Stats
```bash
python queue_example.py stats
```

### Cancel Job
```bash
python queue_example.py cancel 550e8400-e29b-41d4-a716-446655440000
```

## Job Status Values

- **pending**: Waiting to be processed
- **processing**: Currently being processed
- **completed**: Successfully processed
- **failed**: Processing failed
- **cancelled**: Manually cancelled

## Performance Tips

1. **Monitor Queue**: Check stats regularly to avoid bottlenecks
   ```bash
   curl "http://localhost:5000/queue/stats"
   ```

2. **Choose Right Model**: 
   - Fast processing: `siluette` (~0.5s per image)
   - Balanced: `u2net` (~2-3s per image)
   - High quality: `isnet-general-use` (~1.5s per image)

3. **Batch Size**: Submit multiple images at once for efficiency
   ```bash
   # Good - batch submission
   python queue_example.py submit img1.jpg img2.jpg img3.jpg
   
   # Less efficient - individual submissions
   python queue_example.py submit img1.jpg
   python queue_example.py submit img2.jpg
   python queue_example.py submit img3.jpg
   ```

4. **Monitor Progress**: For long-running jobs
   ```bash
   python queue_example.py monitor {job_id}
   ```

## Common Issues & Solutions

### Queue Backup (Many Pending Jobs)
- Increase `max_concurrent` in worker initialization
- Use faster model (siluette)
- Scale up server resources

### Job Stuck in Processing
- Check logs for errors
- Restart the service
- Check job status with `/queue/job/{id}`

### Database Locked
- Reduce concurrent access
- Wait for current operations to complete
- Restart service

## Database Management

### View Database
```bash
sqlite3 queue.db
> SELECT id, status, created_at FROM jobs LIMIT 10;
```

### Clean Old Jobs
```python
from queue_manager import QueueManager
qm = QueueManager()
qm.cleanup_old_jobs(days=7)
```

### Reset Database
```bash
# Backup first!
cp queue.db queue.db.backup

# Delete and reinitialize
rm queue.db
# Service will recreate on startup
```

## Integration Examples

### Python
```python
import requests

# Submit
response = requests.post("http://localhost:5000/queue/submit", 
                        files=[('images', open('img.jpg', 'rb'))])
job_id = response.json()['job_id']

# Monitor
while True:
    status = requests.get(f"http://localhost:5000/queue/job/{job_id}").json()
    if status['status'] in ['completed', 'failed']:
        break
```

### JavaScript/Node.js
```javascript
// Submit
const formData = new FormData();
formData.append('images', fileInput.files[0]);
const response = await fetch('http://localhost:5000/queue/submit', {
  method: 'POST',
  body: formData
});
const jobId = (await response.json()).job_id;

// Monitor
setInterval(async () => {
  const job = await (await fetch(`http://localhost:5000/queue/job/${jobId}`)).json();
  console.log(`Status: ${job.status}, Progress: ${job.progress.processed}/${job.progress.total}`);
}, 2000);
```

### cURL
```bash
# Submit
JOB_ID=$(curl -s -X POST "http://localhost:5000/queue/submit" \
  -F "images=@image.jpg" | jq -r '.job_id')

# Poll status
while true; do
  STATUS=$(curl -s "http://localhost:5000/queue/job/$JOB_ID" | jq -r '.status')
  echo "Status: $STATUS"
  [[ $STATUS == "completed" ]] && break
  sleep 2
done
```

## Configuration Reference

### Worker Settings (in app.py)
```python
# Adjust for your CPU
worker = init_worker(queue_manager, max_concurrent=2)
```

### Database (in queue_manager.py)
```python
queue_manager = QueueManager(db_path="queue.db")
```

### API Server (in __main__)
```python
uvicorn.run(
    app,
    host="0.0.0.0",
    port=5000,
    workers=1,
    log_level="info"
)
```

## Monitoring Checklist

Daily:
- [ ] Check queue stats (`/queue/stats`)
- [ ] Verify worker is running
- [ ] Review completed jobs

Weekly:
- [ ] Clean up old jobs (`cleanup_old_jobs()`)
- [ ] Review failed jobs
- [ ] Check database size

Monthly:
- [ ] Analyze performance metrics
- [ ] Optimize worker configuration
- [ ] Archive old results

## Support & Debugging

### Enable Debug Logging
```python
logging.basicConfig(level=logging.DEBUG)
```

### View Service Logs
```bash
# In terminal where service is running
# Or with systemd
journalctl -u rembg-service -f
```

### Test Health
```bash
curl "http://localhost:5000/health"
curl "http://localhost:5000/queue/stats"
```

### Force Queue Reset
```bash
# Stop service first!
rm queue.db
# Restart service
```
