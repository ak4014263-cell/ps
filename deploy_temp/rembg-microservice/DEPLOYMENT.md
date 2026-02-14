# Rembg Microservice Deployment Guide

## Overview
Self-hosted background removal service using [rembg](https://github.com/danielgatis/rembg) for zero-cost, unlimited bulk processing of images.

**Key Benefits:**
- ✅ Zero cost (open-source)
- ✅ No API rate limits or unit restrictions
- ✅ Process locally or self-hosted
- ✅ High-volume support (500k+ images)
- ✅ GPU acceleration available (CUDA/ROCm)
- ✅ Batch processing endpoint
- ✅ Multiple AI models (u2net, isnet, sam, etc.)

## Quick Start

### 1. Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

Service will be available at: `http://localhost:5000`
- API Docs: `http://localhost:5000/docs`
- OpenAPI: `http://localhost:5000/openapi.json`

### 2. Configure Frontend

Update your React component to use local rembg:

```typescript
import { configureBackgroundRemoval } from '@/lib/backgroundRemoval';

// On app initialization or settings page:
configureBackgroundRemoval({
  provider: 'rembg-local',
  apiUrl: 'http://localhost:5000' // Or your server URL
});
```

## Deployment Options

### Option 1: Docker Container (Recommended)

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY app.py .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Run service
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
```

Build and run:

```bash
# Build image
docker build -t rembg-service .

# Run container
docker run -d \
  --name rembg \
  -p 5000:5000 \
  --gpus all \
  rembg-service

# For CPU-only:
docker run -d \
  --name rembg \
  -p 5000:5000 \
  rembg-service
```

### Option 2: Systemd Service (Linux)

Create `/etc/systemd/system/rembg.service`:

```ini
[Unit]
Description=Rembg Background Removal Service
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/rembg-service
Environment="PATH=/opt/rembg-service/venv/bin"
ExecStart=/opt/rembg-service/venv/bin/uvicorn app:app --host 0.0.0.0 --port 5000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rembg
sudo systemctl start rembg
sudo systemctl status rembg
```

### Option 3: Cloud Deployment

#### AWS EC2
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and dependencies
sudo apt install -y python3.11 python3-pip python3-venv

# Clone and setup
git clone your-repo /opt/rembg-service
cd /opt/rembg-service/rembg-microservice
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run with Gunicorn
gunicorn app:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:5000
```

#### Google Cloud Run (Container-based)
```bash
# Build and push to Google Container Registry
docker build -t gcr.io/PROJECT_ID/rembg-service .
docker push gcr.io/PROJECT_ID/rembg-service

# Deploy
gcloud run deploy rembg-service \
  --image gcr.io/PROJECT_ID/rembg-service \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2
```

#### Heroku
```bash
# Add Buildpacks
heroku buildpacks:add heroku/python
heroku buildpacks:add https://github.com/apt-buildpack/heroku-buildpack-apt

# Create Aptfile
echo "libopenblas-dev" > Aptfile

# Deploy
git push heroku main
```

## GPU Acceleration

For significant speedup with high-volume processing:

### NVIDIA CUDA Setup

```bash
# Install CUDA-enabled PyTorch and ONNX Runtime
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install onnxruntime-gpu
```

Environment variable:
```bash
export ONNXRUNTIME_PROVIDERS=CUDAExecutionProvider
```

Docker with GPU:

```dockerfile
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# ... rest of Dockerfile
```

### AMD ROCm Setup

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm5.7
```

## API Reference

### Single Image
```bash
curl -X POST -F "image=@test.jpg" http://localhost:5000/remove-bg
```

### Batch Processing
```bash
curl -X POST \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg" \
  http://localhost:5000/remove-bg-batch
```

### Available Models
```bash
curl http://localhost:5000/models
```

## Reverse Proxy Setup (Nginx)

```nginx
upstream rembg_service {
    server localhost:5000;
}

server {
    listen 80;
    server_name your-domain.com;

    location /rembg/ {
        proxy_pass http://rembg_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for image processing
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 120s;
    }
}
```

Update frontend config:

```typescript
configureBackgroundRemoval({
  provider: 'rembg-local',
  apiUrl: 'https://your-domain.com/rembg'
});
```

## Performance Tuning

### For 500k+ Images (Batch Processing)

```bash
# Run with multiple workers and batch processing
gunicorn app:app \
  --workers 8 \
  --worker-class uvicorn.workers.UvicornWorker \
  --worker-connections 1000 \
  --bind 0.0.0.0:5000
```

### Model Selection

| Model | Speed | Quality | File Size | Best For |
|-------|-------|---------|-----------|----------|
| siluette | ⚡⚡⚡ | ⭐⭐ | 167 KB | Quick preview |
| u2netp | ⚡⚡ | ⭐⭐⭐ | 4.7 MB | Default fast option |
| u2net | ⚡ | ⭐⭐⭐⭐ | 176 MB | General purpose |
| isnet-general-use | ⚡ | ⭐⭐⭐⭐⭐ | 123 MB | High quality |
| isnet-anime | ⚡ | ⭐⭐⭐⭐ | 63 MB | Anime/illustrations |

### Estimated Performance

**CPU (Intel i7):**
- siluette: ~2-3 seconds/image
- u2netp: ~5-7 seconds/image
- u2net: ~8-10 seconds/image

**GPU (NVIDIA RTX 3080):**
- siluette: ~0.2 seconds/image
- u2netp: ~0.3 seconds/image
- u2net: ~0.5 seconds/image

**Batch Processing 500k images:**
- GPU: ~2-4 days
- CPU: ~2-3 weeks
- **Cost: $0** (vs $1000+ with remove.bg API)

## Monitoring & Logging

```bash
# View service logs
journalctl -u rembg -f

# Docker logs
docker logs -f rembg

# Monitor performance
curl http://localhost:5000/health
```

## Fallback Strategy

Update frontend to fallback to cloud API if microservice unavailable:

```typescript
import { removeBackground, configureBackgroundRemoval } from '@/lib/backgroundRemoval';

// Try local rembg first
configureBackgroundRemoval({
  provider: 'rembg-local',
  apiUrl: 'http://localhost:5000'
});

try {
  await removeBackground(imageUrl);
} catch (error) {
  // Fallback to cloud remove.bg API
  configureBackgroundRemoval({
    provider: 'removebg-api'
  });
  await removeBackground(imageUrl);
}
```

## Production Checklist

- [ ] Setup reverse proxy (Nginx/Apache)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly (restrict origins)
- [ ] Setup rate limiting
- [ ] Enable request logging
- [ ] Configure backups
- [ ] Setup monitoring/alerts
- [ ] Test failover strategy
- [ ] Load test with expected volume
- [ ] Document rollback procedure

## Troubleshooting

### Service won't start
```bash
# Check Python version (need 3.8+)
python --version

# Check dependencies
pip install -r requirements.txt

# Test import
python -c "from rembg import remove; print('OK')"
```

### Out of memory errors
```bash
# Use lighter model
curl -X POST -F "image=@test.jpg" -F "model=siluette" http://localhost:5000/remove-bg

# Increase swap or reduce worker count
```

### Slow processing
```bash
# Enable GPU acceleration
pip install onnxruntime-gpu
export ONNXRUNTIME_PROVIDERS=CUDAExecutionProvider

# Or use faster model
curl -F "image=@test.jpg" -F "model=u2netp" http://localhost:5000/remove-bg
```

## References

- [Rembg GitHub](https://github.com/danielgatis/rembg)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Uvicorn Documentation](https://www.uvicorn.org/)

## Cost Comparison (500k images)

| Solution | Per Image | Total Cost | Infrastructure |
|----------|-----------|------------|-----------------|
| remove.bg API | $0.002 | $1,000 | Cloud (Simple) |
| **Self-hosted rembg** | **$0** | **$0** | **Server/GPU** |
| Azure Vision AI | $0.005 | $2,500 | Cloud |

**Recommendation:** Self-hosted rembg is optimal for bulk processing with amortized infrastructure costs.
