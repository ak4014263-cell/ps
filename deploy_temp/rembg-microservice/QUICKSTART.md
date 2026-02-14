# 🚀 Quick Start Guide - Photo Processor

## ⚡ Start in 2 Minutes

### Step 1: Start the Service (Terminal 1)

```powershell
cd rembg-microservice

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start service
python app.py

# You should see:
# ✅ Application startup complete - worker initialized
# ✅ Uvicorn running on http://0.0.0.0:5000
```

### Step 2: Open Frontend (Terminal 2)

**Option A: HTML/JavaScript (Recommended for testing)**
```bash
start http://localhost:5000/upload_interface.html
```

**Option B: Python Test Suite**
```bash
python test_workflow.py
```

That's it! Your system is running. 🎉

---

## 📸 Using the Photo Processor

### Through Web Interface

1. **Open** http://localhost:5000/upload_interface.html
2. **Drag & Drop** photos or zip file
3. **Select options:**
   - ☑️ Remove Background
   - ☑️ Crop Face
   - 📋 Select Model (u2net recommended)
4. **Click** "🚀 Process"
5. **Watch** real-time progress
6. **Download** results when complete

### Through Python Test

```bash
python test_workflow.py
```

This tests:
- ✅ Single image upload
- ✅ Multiple images upload
- ✅ ZIP file upload
- ✅ Download as ZIP and individual files

### Through REST API

```bash
# 1. Upload photos
curl -X POST http://localhost:5000/api/upload-and-process \
  -F "files=@photo.jpg" \
  -F "remove_bg=true" \
  -F "crop_face=true"

# Returns: {"job_id": "uuid-here"}

# 2. Check status
curl http://localhost:5000/api/process-status/uuid-here

# 3. Download results
curl http://localhost:5000/api/download-results/uuid-here?format=zip -o results.zip
```

---

## 🛠️ What's Running

| Component | Purpose | Location |
|-----------|---------|----------|
| **FastAPI Server** | REST API + WebSocket | http://localhost:5000 |
| **Job Queue** | Task management | queue.db (SQLite) |
| **Image Processor** | BG removal + face crop | image_processor.py |
| **Job Worker** | Background processing | job_worker.py |
| **Upload Handlers** | File management | upload_api.py |

---

## 📊 System Features

✅ **Automatic Processing** - Upload once, process in background
✅ **Real-time Updates** - WebSocket for live progress
✅ **Batch Processing** - Handle multiple images or ZIP files
✅ **Queue Management** - Jobs are stored and processed in order
✅ **Error Recovery** - Graceful handling of failures
✅ **Multiple Models** - Fast (siluette) or High Quality (isnet)
✅ **Face Detection** - Optional face cropping with OpenCV
✅ **Download Results** - ZIP or individual images

---

## 🔧 Configuration

### Processing Models

```
siluette       → 🚀 Fast (0.5s/image) - Good for previews
u2net          → ⚡ Balanced (2-3s/image) - RECOMMENDED
isnet-general  → 🎨 High Quality (1.5s/image) - Best results
```

### Concurrent Jobs

Edit `app.py`:
```python
worker = init_worker(queue_manager, max_concurrent=2)  # Change this
```

Default is 2 (safe for most laptops). Increase for more powerful hardware.

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app.py` | Main FastAPI application |
| `job_worker.py` | Background processing worker |
| `image_processor.py` | Image processing pipeline |
| `queue_manager.py` | Job storage & management |
| `upload_api.py` | Upload endpoints |
| `websocket_manager.py` | Real-time updates |
| `upload_interface.html` | Web frontend |
| `PhotoProcessor.jsx` | React component |
| `test_workflow.py` | Integration tests |
| `queue.db` | SQLite database (auto-created) |

---

## ✅ Checklist

- [ ] Python 3.8+ installed
- [ ] Dependencies installed: `pip install fastapi uvicorn rembg pillow python-multipart opencv-python`
- [ ] `python app.py` is running
- [ ] Web interface opens at `http://localhost:5000/upload_interface.html`
- [ ] Can upload test images
- [ ] Can see real-time progress
- [ ] Can download results

---

## 🐛 Troubleshooting

**Problem:** Module not found errors
```bash
pip install rembg pillow opencv-python python-multipart
```

**Problem:** Port 5000 already in use
```bash
# Use a different port:
python app.py --port 5001
```

**Problem:** WebSocket not connecting
- Check browser console for errors
- Ensure app.py version 2.0.0+
- Fallback to polling is automatic

**Problem:** Out of memory
- Reduce concurrent workers: `max_concurrent=1`
- Use faster model: `siluette` instead of `u2net`

---

## 📈 Next Steps

1. **Test with your images** - Upload some real photos
2. **Customize frontend** - Edit HTML/CSS or use React component
3. **Deploy** - Follow production setup in COMPLETE_INTEGRATION_GUIDE.md
4. **Integrate** - Add to your app via REST API or WebSocket

---

## 📚 Documentation

For detailed information, see:
- `COMPLETE_INTEGRATION_GUIDE.md` - Full setup & deployment
- `QUEUE_README.md` - Queue system details
- `ARCHITECTURE_GUIDE.md` - System architecture

---

## 🎯 Common Tasks

### Process a single image
```bash
curl -X POST http://localhost:5000/api/upload-and-process \
  -F "files=@image.jpg"
```

### Process entire folder
```bash
# Create ZIP and upload
tar czf images.zip images/
curl -X POST http://localhost:5000/api/upload-and-process \
  -F "files=@images.zip"
```

### Monitor processing
```bash
# Watch job status in real-time
watch -n 1 'curl http://localhost:5000/api/process-status/job-id-here'
```

### Cancel a job
```bash
curl -X POST http://localhost:5000/api/cancel-job/job-id-here
```

---

## 🎉 You're Ready!

Your photo processing system is complete. Start with the web interface for quick testing, then integrate via API for production use.

**Happy processing! 📸**
