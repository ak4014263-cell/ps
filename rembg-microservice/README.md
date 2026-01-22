# Quick Start Guide

## For Development

### Step 1: Start Rembg Service
```bash
cd rembg-microservice
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 5000
```

Visit `http://localhost:5000/docs` to test API

### Step 2: Configure React App

In your main React component (e.g., App.tsx or main.tsx):

```typescript
import { configureBackgroundRemoval, initBackgroundRemover } from '@/lib/backgroundRemoval';

// Configure on app start
useEffect(() => {
  // Use local rembg microservice
  configureBackgroundRemoval({
    provider: 'rembg-local',
    apiUrl: 'http://localhost:5000'
  });
  
  // Verify connection
  initBackgroundRemover();
}, []);
```

### Step 3: Use in Components

```typescript
import { removeBackground } from '@/lib/backgroundRemoval';

// Remove background from image
const processedImageUrl = await removeBackground(imageUrl);
```

## For Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Docker containerization
- Cloud deployment (AWS, Google Cloud, Heroku)
- GPU acceleration setup
- Performance tuning for 500k+ images
- Reverse proxy configuration
- Monitoring and fallback strategies

## Available Models

```bash
curl http://localhost:5000/models
```

Returns:
```json
{
  "available_models": [
    "u2net",
    "u2netp",
    "u2net_human_seg",
    "siluette",
    "isnet-anime",
    "isnet-general-use",
    "sam"
  ]
}
```

Use different models:
```typescript
// In your component
const processImage = async (imageUrl: string) => {
  // Try fast model first (siluette)
  const result = await fetch('http://localhost:5000/remove-bg', {
    method: 'POST',
    body: formData,
    headers: {
      'model': 'siluette'
    }
  });
};
```

## Cost Analysis

**Processing 500k images:**

| Method | Cost | Processing Time | Infrastructure |
|--------|------|-----------------|-----------------|
| remove.bg API | $1,000 | 1-2 days | Cloud |
| **Self-hosted (CPU)** | **$0** | **2-3 weeks** | **On-premises server** |
| **Self-hosted (GPU)** | **$0** | **2-4 days** | **Server with GPU** |

**Result:** Zero cost with rembg vs $1000+ with cloud APIs

## Batch Processing Example

```bash
# Process multiple images at once
curl -X POST \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg" \
  http://localhost:5000/remove-bg-batch
```

Returns:
```json
{
  "total": 3,
  "successful": 3,
  "failed": 0,
  "results": [
    {
      "index": 0,
      "filename": "image1.jpg",
      "dataUrl": "data:image/png;base64,iVBORw0KGgo...",
      "success": true
    }
  ]
}
```

## Fallback to Cloud API

If microservice is down, automatically fallback to remove.bg:

```typescript
import { removeBackground, configureBackgroundRemoval, getBackgroundRemovalConfig } from '@/lib/backgroundRemoval';

const processWithFallback = async (imageUrl: string) => {
  try {
    // Try local rembg first
    return await removeBackground(imageUrl);
  } catch (error) {
    console.warn('Local rembg failed, falling back to cloud API:', error);
    
    // Fallback to cloud
    configureBackgroundRemoval({ provider: 'removebg-api' });
    return await removeBackground(imageUrl);
  }
};
```

## Troubleshooting

**Service won't start:**
```bash
pip install -r requirements.txt --upgrade
python -c "from rembg import remove; print('OK')"
```

**Slow processing:**
```bash
# Use faster model
pip install onnxruntime-gpu  # Enable GPU if available
```

**CORS errors:**
Update `app.py` CORS origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Your frontend URLs
)
```

## Next Steps

1. ✅ Start microservice locally (`uvicorn app:app --port 5000`)
2. ✅ Configure React app with `configureBackgroundRemoval()`
3. ✅ Test API at `http://localhost:5000/docs`
4. ✅ Implement in your background removal features
5. ✅ Deploy to production (see DEPLOYMENT.md)
6. ✅ Monitor and optimize performance
