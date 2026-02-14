# Running the Complete System - Command Reference

## 📦 One-Time Setup

```powershell
# Navigate to project
cd rembg-microservice

# Install dependencies (if not already done)
pip install fastapi uvicorn rembg pillow python-multipart aiohttp opencv-python

# For GPU support (optional, requires CUDA)
pip install onnxruntime-gpu
```

---

## 🚀 Start the Service

### Terminal 1: Start API Server

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start the service
python app.py

# Expected output:
# INFO:     Application startup complete - worker initialized
# INFO:     Uvicorn running on http://0.0.0.0:5000
```

Service is now running with:
- ✅ REST API: http://localhost:5000/api
- ✅ WebSocket: ws://localhost:5000/ws/job/{job_id}
- ✅ Health: http://localhost:5000/health
- ✅ Docs: http://localhost:5000/docs (auto-generated)

---

## 🧪 Test the System

### Option 1: Run Full Test Suite (Terminal 2)

```powershell
# From rembg-microservice directory
python test_workflow.py

# This runs:
# 1. Single image test
# 2. Multiple images test
# 3. ZIP file test
# 4. Download tests
# Shows progress and summary
```

**Expected Output:**
```
==========================================================
TEST SUMMARY
==========================================================
single_image         ✅ PASSED
multiple_images      ✅ PASSED
zip_file             ✅ PASSED
==========================================================
```

### Option 2: Use Web Interface (Terminal 2)

```powershell
# Open HTML interface in browser
start http://localhost:5000/upload_interface.html

# Or with Python HTTP server
python -m http.server 8080
# Then visit: http://localhost:8080/upload_interface.html
```

Then:
1. Select photos or ZIP file
2. Choose processing options
3. Click "Process"
4. Watch real-time progress
5. Download results

### Option 3: Use REST API (Terminal 2)

```bash
# Upload photos
curl -X POST http://localhost:5000/api/upload-and-process \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "remove_bg=true" \
  -F "crop_face=true" \
  -F "model=u2net"

# Copy the job_id from response

# Check status
curl http://localhost:5000/api/process-status/JOB_ID_HERE

# Download results
curl http://localhost:5000/api/download-results/JOB_ID_HERE?format=zip -o results.zip
```

### Option 4: Use Python Directly

```python
# quick_test.py
import asyncio
import aiohttp

async def test():
    async with aiohttp.ClientSession() as session:
        # Upload
        data = aiohttp.FormData()
        data.add_field('files', open('photo.jpg', 'rb'), filename='photo.jpg')
        data.add_field('remove_bg', 'true')
        data.add_field('crop_face', 'true')
        
        async with session.post('http://localhost:5000/api/upload-and-process', data=data) as resp:
            result = await resp.json()
            job_id = result['job_id']
            print(f"Job ID: {job_id}")
        
        # Poll status
        async with session.get(f'http://localhost:5000/api/process-status/{job_id}') as resp:
            status = await resp.json()
            print(f"Status: {status['status']}")
            print(f"Progress: {status['progress']}")

asyncio.run(test())
```

---

## 🖥️ Integration Examples

### React App Integration

```powershell
# In your React project
npm install axios

# Copy component
cp PhotoProcessor.jsx src/components/

# Use in your app
```

```jsx
import PhotoProcessor from './components/PhotoProcessor';

export default function App() {
  return <PhotoProcessor />;
}
```

### Custom WebSocket Client

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:5000/ws/job/JOB_ID_HERE');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status:', data.status);
  console.log('Progress:', data.progress.percentage + '%');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};

// Send keep-alive ping
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send('ping');
  }
}, 30000);
```

---

## 📊 Monitoring & Debugging

### Check Service Health

```bash
curl http://localhost:5000/health

# Response:
# {
#   "status": "healthy",
#   "service": "rembg-microservice",
#   "version": "2.0.0"
# }
```

### View API Documentation

Open in browser:
```
http://localhost:5000/docs
```

This shows all endpoints with interactive testing.

### Check Database

```python
from queue_manager import QueueManager

qm = QueueManager()

# Get all jobs
jobs = qm.get_job_stats()
print(f"Total jobs: {jobs['total']}")
print(f"Completed: {jobs['completed']}")
print(f"Pending: {jobs['pending']}")
print(f"Failed: {jobs['failed']}")

# Get specific job
job = qm.get_job("job-id-here")
print(job)
```

### View Logs

```bash
# Server logs appear in terminal where app.py is running

# Common patterns:
# INFO:     Application startup complete - worker initialized
# INFO:     Processing job <id> (batch)
# INFO:     Successfully processed: filename.jpg
# ERROR:    Error processing job <id>: error message
```

---

## 🔧 Configuration Options

### Change Concurrent Workers

```python
# Edit app.py, in startup_event():
# Default is 2
worker = init_worker(queue_manager, max_concurrent=4)
```

**Recommended values:**
- 1: High quality, slow (development/testing)
- 2-4: Balanced (most laptops)
- 4-8: High throughput (powerful servers)

### Change Port

```powershell
# Environment variable
$env:PORT=5001
python app.py

# Or in code:
# app.py will read PORT from environment
```

### Change Upload Directory

```python
# In job_worker.py
worker.upload_base_dir = "C:/custom/path/uploads"
```

### Enable Debug Logging

```python
# In app.py
logging.basicConfig(level=logging.DEBUG)  # Changed from INFO
```

---

## 🛑 Stopping the Service

### Graceful Shutdown

```powershell
# In Terminal 1 (where app.py is running)
Ctrl+C

# Service will:
# 1. Stop accepting new jobs
# 2. Wait for processing jobs to complete
# 3. Shutdown worker gracefully
# 4. Close database connection

# Output:
# INFO:     Shutting down
# INFO:     Application shutdown complete
```

---

## 🚨 Troubleshooting

### Problem: "Address already in use"

```powershell
# Port 5000 is in use

# Option 1: Kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Option 2: Use different port
$env:PORT=5001
python app.py
```

### Problem: "ModuleNotFoundError: No module named 'rembg'"

```bash
pip install rembg
```

### Problem: "ModuleNotFoundError: No module named 'cv2'"

```bash
pip install opencv-python
# Face cropping will gracefully skip if unavailable
```

### Problem: "WebSocket connection refused"

```bash
# Make sure app.py is running with version 2.0.0+
# Check: python app.py should show startup message

# If using older version:
# - Restart with new app.py
# - Or use polling instead of WebSocket
```

### Problem: "Out of memory"

```python
# Reduce concurrent workers in app.py
worker = init_worker(queue_manager, max_concurrent=1)

# Or use faster model
# In web UI: select "Siluette" model instead of u2net
```

### Problem: Jobs stuck in "processing"

```python
from queue_manager import QueueManager

qm = QueueManager()

# Get stuck job
job = qm.get_job("job-id-here")
print(job)

# Cancel it
qm.update_job_status(job['id'], 'cancelled')
```

---

## 📈 Performance Commands

### Batch Process 1000 Images

```bash
# Create test images
python -c "
from PIL import Image
import os
os.makedirs('test_images', exist_ok=True)
for i in range(1000):
    img = Image.new('RGB', (300, 300), color=(255, 100, i % 256))
    img.save(f'test_images/image_{i:04d}.jpg')
"

# Create ZIP
python -m zipfile -c test_images.zip test_images/

# Upload and process
curl -X POST http://localhost:5000/api/upload-and-process \
  -F "files=@test_images.zip" \
  -F "model=siluette" \
  -F "crop_face=false"

# Monitor progress
# Takes ~8-10 minutes with 4 concurrent workers and siluette model
```

### Monitor Processing Speed

```python
import time
from queue_manager import QueueManager

qm = QueueManager()

# Check job progress every 5 seconds
job_id = "your-job-id-here"
start = time.time()

while True:
    job = qm.get_job(job_id)
    elapsed = time.time() - start
    progress = job.get('progress', {})
    processed = progress.get('processed', 0)
    
    if processed > 0:
        rate = processed / (elapsed / 60)  # images per minute
        print(f"Processing rate: {rate:.1f} images/minute")
    
    if job['status'] in ['completed', 'failed']:
        break
    
    time.sleep(5)
```

---

## 📝 Common Workflows

### Workflow 1: Quick Testing

```bash
# Terminal 1
python app.py

# Terminal 2
python test_workflow.py

# Result: All tests pass in 5-10 minutes
```

### Workflow 2: Web Interface Testing

```bash
# Terminal 1
python app.py

# Terminal 2
start http://localhost:5000/upload_interface.html

# Then: Use web UI to upload and process
```

### Workflow 3: API Integration Testing

```bash
# Terminal 1
python app.py

# Terminal 2
# Run curl commands or custom Python script
python custom_test.py
```

### Workflow 4: Deployment to Server

```powershell
# Terminal 1 (on server)
pip install gunicorn
gunicorn -w 1 -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:5000

# Terminal 2 (from client)
curl http://server-ip:5000/api/upload-and-process ...
```

---

## 🎯 Quick Command Summary

```bash
# Start service
python app.py

# Run tests
python test_workflow.py

# Check health
curl http://localhost:5000/health

# View docs
# http://localhost:5000/docs

# Upload file
curl -X POST http://localhost:5000/api/upload-and-process \
  -F "files=@photo.jpg"

# Check status
curl http://localhost:5000/api/process-status/JOB_ID

# Download results
curl http://localhost:5000/api/download-results/JOB_ID?format=zip -o results.zip

# Cancel job
curl -X POST http://localhost:5000/api/cancel-job/JOB_ID
```

---

## 📚 Documentation Files

Read these for detailed information:
- `QUICKSTART.md` - 2-minute quick start
- `COMPLETE_INTEGRATION_GUIDE.md` - Full setup & deployment guide
- `IMPLEMENTATION_COMPLETE_SUMMARY.md` - What was implemented
- `app.py` - Main service code with docstrings
- `test_workflow.py` - Test examples

---

## ✅ You're Ready to Go!

1. Start the service: `python app.py`
2. Test the system: `python test_workflow.py`
3. Use the web interface or API
4. Read documentation for deployment

**Enjoy your photo processing system!** 🚀
