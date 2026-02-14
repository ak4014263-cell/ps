# Queue Management - Deployment & Operations Guide

## Prerequisites

- Python 3.8+
- FastAPI and dependencies (see requirements.txt)
- SQLite3 (usually pre-installed)
- Adequate disk space for queue database

## Installation

### 1. Install Dependencies

```bash
cd rembg-microservice
pip install -r requirements.txt
```

**Key packages for queue management:**
- fastapi >= 0.104.0
- uvicorn >= 0.24.0
- pillow >= 10.0.0
- rembg >= 2.0.62

### 2. Verify Installation

```bash
python -c "from queue_manager import QueueManager; from job_worker import JobWorker; print('✓ Queue system ready')"
```

## Deployment

### Development (Single Process)

```bash
# Terminal 1: Start API service
cd rembg-microservice
python -m uvicorn app:app --host 0.0.0.0 --port 5000 --reload

# Terminal 2: Monitor queue
while true; do
  curl -s http://localhost:5000/queue/stats | python -m json.tool
  sleep 5
done
```

### Production (Gunicorn with Workers)

```bash
# Install gunicorn
pip install gunicorn

# Start with multiple workers
cd rembg-microservice
gunicorn app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:5000 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
```

### Production (Systemd Service)

Create `/etc/systemd/system/rembg-service.service`:

```ini
[Unit]
Description=Rembg Background Removal Microservice
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/rembg-microservice
Environment="PATH=/opt/rembg-microservice/venv/bin"
ExecStart=/opt/rembg-microservice/venv/bin/gunicorn app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:5000 \
  --access-logfile /var/log/rembg/access.log \
  --error-logfile /var/log/rembg/error.log
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl enable rembg-service
sudo systemctl start rembg-service
sudo systemctl status rembg-service
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Run service
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
```

Start with Docker:
```bash
# Build
docker build -t rembg-service .

# Run
docker run -d \
  --name rembg-service \
  -p 5000:5000 \
  -v rembg-queue:/app/data \
  rembg-service
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  rembg:
    build: .
    container_name: rembg-service
    ports:
      - "5000:5000"
    volumes:
      - rembg-queue:/app/data
      - rembg-logs:/app/logs
    environment:
      - LOG_LEVEL=info
      - WORKERS=2
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  rembg-queue:
  rembg-logs:
```

Start:
```bash
docker-compose up -d
```

## Monitoring

### Health Check Endpoints

```bash
# Service health
curl http://localhost:5000/health

# Queue status
curl http://localhost:5000/queue/stats

# Job details
curl http://localhost:5000/queue/job/{job_id}
```

### Log Monitoring

```bash
# Systemd logs
sudo journalctl -u rembg-service -f

# Docker logs
docker logs -f rembg-service

# File logs (if configured)
tail -f /var/log/rembg/error.log
tail -f /var/log/rembg/access.log
```

### Queue Monitoring Script

Create `monitor.sh`:

```bash
#!/bin/bash

while true; do
  clear
  echo "=== Rembg Queue Status ==="
  echo "Time: $(date)"
  echo ""
  
  # Get stats
  STATS=$(curl -s http://localhost:5000/queue/stats)
  
  echo "$STATS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
stats = data['stats']
worker = data['worker']

print('Queue Statistics:')
print(f'  Total:       {stats[\"total\"]:3d}')
print(f'  Pending:     {stats[\"pending\"]:3d}')
print(f'  Processing:  {stats[\"processing\"]:3d}')
print(f'  Completed:   {stats[\"completed\"]:3d}')
print(f'  Failed:      {stats[\"failed\"]:3d}')
print(f'  Cancelled:   {stats[\"cancelled\"]:3d}')

print()
print('Worker Status:')
print(f'  Status:      {worker[\"status\"].upper()}')
print(f'  Active:      {worker[\"active_jobs\"]}/{worker[\"max_concurrent\"]}')
"
  
  sleep 5
done
```

Run:
```bash
chmod +x monitor.sh
./monitor.sh
```

### Database Monitoring

```bash
# Connect to database
sqlite3 queue.db

# Common queries
SELECT status, COUNT(*) as count FROM jobs GROUP BY status;
SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10;
SELECT AVG(CAST((julianday(completed_at) - julianday(created_at)) AS FLOAT)) as avg_duration FROM jobs WHERE status = 'completed';
```

## Performance Tuning

### 1. Worker Configuration

```python
# In app.py startup_event()

# Low-power server
worker = init_worker(queue_manager, max_concurrent=1)

# Standard server (4 cores)
worker = init_worker(queue_manager, max_concurrent=2)

# High-power server (8+ cores)
worker = init_worker(queue_manager, max_concurrent=4)
```

### 2. Model Selection

**Speed vs Quality Trade-off:**

```
siluette         u2netp          u2net           isnet-general
0.5s/img    <-   1.0s/img    <-  2-3s/img   <-   1.5s/img
~167 KB         ~4.7 MB         ~176 MB         ~167 MB
Fastest         Fast            Standard        High Quality
```

### 3. Database Optimization

```python
# Regular cleanup (in background task)
async def cleanup_task():
    while True:
        await asyncio.sleep(86400)  # Once per day
        queue_manager.cleanup_old_jobs(days=7)
```

### 4. Resource Limits

```python
# In app startup, limit thread pool
executor = ThreadPoolExecutor(max_workers=4)

# Graceful shutdown
@app.on_event("shutdown")
async def shutdown():
    executor.shutdown(wait=True)
    await stop_worker()
```

## Scaling

### Vertical Scaling (Single Server)

```bash
# Increase worker concurrency
worker = init_worker(queue_manager, max_concurrent=8)

# Use faster model for processing
# Increase server CPU/RAM
```

### Horizontal Scaling (Multiple Servers)

For multiple server instances, migrate to:

1. **Redis Queue**
```python
import redis
redis_client = redis.Redis(host='redis-server', port=6379)
```

2. **RabbitMQ**
```python
from celery import Celery
app = Celery('rembg', broker='amqp://rabbitmq')
```

3. **AWS SQS**
```python
import boto3
sqs = boto3.client('sqs')
```

## Maintenance

### Daily Tasks

```bash
# Check service status
systemctl status rembg-service

# Monitor logs for errors
journalctl -u rembg-service -n 50

# Check queue health
curl http://localhost:5000/queue/stats | jq '.stats'
```

### Weekly Tasks

```bash
# Cleanup old jobs
python3 -c "
from queue_manager import QueueManager
qm = QueueManager('queue.db')
deleted = qm.cleanup_old_jobs(days=7)
print(f'Deleted {deleted} old jobs')
"

# Review failed jobs
sqlite3 queue.db "
SELECT id, error_message, created_at 
FROM jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
"
```

### Monthly Tasks

```bash
# Backup database
cp queue.db queue.db.backup.$(date +%Y%m%d)

# Analyze performance
sqlite3 queue.db "
SELECT 
  COUNT(*) as total_jobs,
  AVG(CAST((julianday(completed_at) - julianday(created_at)) * 1440 AS FLOAT)) as avg_time_minutes,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM jobs 
WHERE created_at > datetime('now', '-30 days');
"

# Check database size
du -sh queue.db
```

## Backup & Recovery

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR=/backups/rembg
mkdir -p $BACKUP_DIR
cp /opt/rembg-microservice/queue.db \
   $BACKUP_DIR/queue.db.$(date +%Y%m%d_%H%M%S)

# Keep only last 30 days
find $BACKUP_DIR -name "queue.db.*" -mtime +30 -delete
```

### Recovery

```bash
# Stop service
systemctl stop rembg-service

# Restore backup
cp /backups/rembg/queue.db.20260115_120000 /opt/rembg-microservice/queue.db

# Verify
sqlite3 /opt/rembg-microservice/queue.db "SELECT COUNT(*) FROM jobs;"

# Start service
systemctl start rembg-service
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
journalctl -u rembg-service -n 100

# Verify Python
python3 -c "from queue_manager import QueueManager"

# Check permissions
ls -la /opt/rembg-microservice/queue.db
sudo chown www-data:www-data /opt/rembg-microservice/queue.db
```

### Queue Backing Up

```bash
# Check worker status
curl http://localhost:5000/queue/stats

# Increase concurrency
# OR use faster model
# OR add more server resources

# Monitor in real-time
watch -n 2 'curl -s http://localhost:5000/queue/stats | python -m json.tool'
```

### Database Issues

```bash
# Check integrity
sqlite3 queue.db "PRAGMA integrity_check;"

# Vacuum (optimize)
sqlite3 queue.db "VACUUM;"

# Rebuild if corrupted
sqlite3 queue.db ".dump" > queue.sql
rm queue.db
sqlite3 queue.db < queue.sql
```

## Performance Metrics

### Expected Performance

```
Single Server (4-core CPU, u2net model):
- Queue capacity: ~1000 jobs
- Throughput: ~1-2 images/second
- Memory: ~500MB - 2GB
- Database size: ~1-5MB for 1000 jobs

High-Load Server (16-core CPU, multiple workers):
- Queue capacity: ~10,000 jobs
- Throughput: ~4-8 images/second
- Memory: ~2GB - 8GB
- Database size: ~5-50MB for 10,000 jobs
```

### Monitoring Script

```python
import time
import requests

BASE_URL = "http://localhost:5000"

def monitor():
    start_time = time.time()
    last_completed = 0
    
    while True:
        stats = requests.get(f"{BASE_URL}/queue/stats").json()
        current_completed = stats['stats']['completed']
        elapsed = time.time() - start_time
        
        throughput = (current_completed - last_completed) / (elapsed / 60)
        
        print(f"Completed: {current_completed} | "
              f"Processing: {stats['stats']['processing']} | "
              f"Pending: {stats['stats']['pending']} | "
              f"Throughput: {throughput:.1f} jobs/min")
        
        time.sleep(30)

if __name__ == "__main__":
    monitor()
```

## Alerts & Notifications

### Email Alerts (on failure)

```python
import smtplib
from email.mime.text import MIMEText

def send_alert(subject, message):
    msg = MIMEText(message)
    msg['Subject'] = subject
    msg['From'] = 'alerts@example.com'
    msg['To'] = 'admin@example.com'
    
    with smtplib.SMTP_SSL('smtp.example.com') as server:
        server.login('user', 'pass')
        server.send_message(msg)

# Monitor and alert
async def failure_monitor():
    while True:
        job = queue_manager.get_pending_jobs(limit=1)
        if len(job) > 100:  # Too many pending
            send_alert("Queue Alert", "Queue backup detected!")
        await asyncio.sleep(300)
```

## Security Considerations

### API Authentication

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthCredentials

security = HTTPBearer()

@app.post("/queue/submit")
async def submit_to_queue(
    images: list[UploadFile],
    credentials: HTTPAuthCredentials = Depends(security)
):
    if credentials.credentials != "your-secret-token":
        raise HTTPException(status_code=401)
    # ... rest of function
```

### Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/queue/submit")
@limiter.limit("10/minute")
async def submit_to_queue(...):
    # ... limited to 10 requests per minute
```

### HTTPS/SSL

```bash
# Generate self-signed cert
openssl req -x509 -newkey rsa:4096 -nodes \
  -out cert.pem -keyout key.pem -days 365

# Start with SSL
uvicorn app:app \
  --ssl-keyfile=key.pem \
  --ssl-certfile=cert.pem \
  --host 0.0.0.0 \
  --port 5000
```

## Support & Resources

- Documentation: [QUEUE_MANAGEMENT.md](./QUEUE_MANAGEMENT.md)
- Quick Reference: [QUEUE_QUICK_REF.md](./QUEUE_QUICK_REF.md)
- CLI Tool: [queue_example.py](./queue_example.py)
- FastAPI Docs: http://localhost:5000/docs
- OpenAPI Schema: http://localhost:5000/openapi.json
