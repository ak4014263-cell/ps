# Rembg Quick Reference

## Start Microservice

### Docker (Recommended)
```bash
docker-compose up -d
# Access: http://localhost:5000/docs
```

### Python Direct
```bash
cd rembg-microservice
pip install -r requirements.txt
uvicorn app:app --port 5000
```

## Configure App

```typescript
// src/main.tsx or App.tsx
import { configureBackgroundRemoval } from '@/lib/backgroundRemoval';

useEffect(() => {
  configureBackgroundRemoval({
    provider: 'rembg-local',
    apiUrl: 'http://localhost:5000'
  });
}, []);
```

## Use in Components

```typescript
import { removeBackground } from '@/lib/backgroundRemoval';

const noBackgroundImage = await removeBackground(imageUrl);
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/remove-bg` | POST | Single image |
| `/remove-bg-batch` | POST | Multiple images |
| `/health` | GET | Service health |
| `/models` | GET | Available models |
| `/docs` | GET | Interactive API docs |

## Cost Comparison (500k images)

| Method | Cost | Processing Time |
|--------|------|-----------------|
| **rembg (local)** | **$0** | **2-4 days (GPU)** |
| remove.bg API | $1,000 | 1-2 days |

## Environment Variables

```env
# .env or .env.local
REACT_APP_REMBG_URL=http://localhost:5000    # Development
# REACT_APP_REMBG_URL=https://api.yourdomain.com/rembg  # Production
```

## Common Models

- **u2net** - Best quality (176 MB, ~0.5-10 sec/image)
- **u2netp** - Fast quality (4.7 MB, ~0.3-7 sec/image)
- **siluette** - Super fast (167 KB, ~0.2-3 sec/image)
- **isnet-anime** - For anime/illustrations (63 MB)

## Batch Processing

```bash
curl -X POST \
  -F "images=@1.jpg" \
  -F "images=@2.jpg" \
  -F "images=@3.jpg" \
  http://localhost:5000/remove-bg-batch
```

## Health Check

```bash
curl http://localhost:5000/health
# Returns: {"status":"healthy","service":"rembg-microservice"}
```

## Fallback to Cloud API

```typescript
try {
  await removeBackground(url); // Uses configured provider
} catch (error) {
  // Fallback logic handled automatically
}
```

## Files Created/Updated

✅ **Updated:**
- `src/lib/backgroundRemoval.ts` - Multi-provider support

✅ **Created:**
- `rembg-microservice/app.py` - FastAPI service
- `rembg-microservice/requirements.txt` - Dependencies
- `rembg-microservice/Dockerfile` - Container image
- `rembg-microservice/README.md` - Setup guide
- `rembg-microservice/DEPLOYMENT.md` - Full deployment
- `docker-compose.yml` - Docker setup
- `src/lib/rembgIntegration.example.tsx` - React examples
- `REMBG_IMPLEMENTATION.md` - Complete documentation

## Next: Deploy

See [DEPLOYMENT.md](./rembg-microservice/DEPLOYMENT.md) for:
- AWS/GCP/Heroku setup
- GPU acceleration
- Reverse proxy config
- Production monitoring

## Test It

1. Start service: `docker-compose up -d`
2. Visit: `http://localhost:5000/docs`
3. Upload image to `/remove-bg` endpoint
4. See result in browser

---

**Status: ✅ Complete | No TypeScript Errors | Zero Cost Bulk Processing Enabled**
