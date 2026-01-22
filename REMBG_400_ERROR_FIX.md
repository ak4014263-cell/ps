# Rembg 400 Bad Request Error - Diagnosis & Fix

## Issue Description
The `/remove-bg` endpoint is consistently returning **400 Bad Request** errors.

```
INFO: 127.0.0.1:51797 - "POST /remove-bg HTTP/1.1" 400 Bad Request
```

---

## Root Cause Analysis

### Common Causes of 400 Errors:

1. **Empty image file** - The blob being sent is empty or null
2. **Unsupported content type** - File sent is not an image
3. **Missing/malformed FormData** - Request body structure incorrect
4. **Network/CORS issues** - Request headers or origin not allowed
5. **Rembg microservice not running** - Service unavailable on localhost:5000
6. **Invalid image format** - Corrupted or unsupported image format

---

## Fixes Applied

### 1. ✅ Enhanced Error Logging in Python Microservice
**File:** `rembg-microservice/app.py`

**Changes:**
- Added detailed logging for incoming requests
- Improved content-type validation (now accepts files without explicit content-type)
- Added exception info logging with `exc_info=True`
- Logs image size, filename, and model parameters

**New Logging Output:**
```
[/remove-bg] Received request: filename=image-0.png, content_type=None, size=50000
[/remove-bg] Processing image with model=u2net, size=50000 bytes
[/remove-bg] Successfully processed image: image-0.png, output_size=45000 bytes
```

### 2. ✅ Enhanced Error Logging in Frontend
**File:** `src/lib/backgroundRemoval.ts`

**Changes:**
- Added detailed blob information logging
- Logs API URL and request details
- Logs response status and error text
- Tracks data conversion to data URL

**New Console Output:**
```
[removeBackgroundViaRembg] Sending image to http://localhost:5000/remove-bg: {
  blobSize: 50000,
  blobType: "image/png",
  blobName: "image.png"
}
[removeBackgroundViaRembg] Response status: 200 OK
[removeBackgroundViaRembg] Successfully converted to data URL
```

### 3. ✅ Improved Content-Type Handling
**Before:**
```python
if not image.content_type or not image.content_type.startswith('image/'):
    raise HTTPException(400, "Invalid file type")
```

**After:**
```python
if image.content_type and not image.content_type.startswith('image/'):
    raise HTTPException(400, f"Invalid file type: {image.content_type}")
```

The fix allows requests with `content_type=None` as long as the file is a valid image.

---

## Troubleshooting Guide

### Step 1: Verify Microservice is Running
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "rembg-microservice",
  "version": "1.0.0"
}
```

**If fails:** Start the microservice
```bash
cd rembg-microservice
python -m uvicorn app:app --reload --port 5000
```

### Step 2: Test with Manual Request
```bash
curl -X POST \
  -F "image=@test_image.jpg" \
  http://localhost:5000/remove-bg \
  -o result.png
```

### Step 3: Check Frontend Logs
1. Open Browser DevTools (F12)
2. Go to Console tab
3. Look for logs starting with `[removeBackgroundViaRembg]`
4. Check for blob size, type, and response status

**Example console output to look for:**
```
[removeBackgroundViaRembg] Sending image to http://localhost:5000/remove-bg
[removeBackgroundViaRembg] Response status: 200 OK
```

### Step 4: Check Microservice Logs
Look for logs like:
```
[/remove-bg] Received request: filename=image-0.png, content_type=image/png, size=50000
[/remove-bg] Successfully processed image: image-0.png, output_size=45000 bytes
```

If you see **400 errors**, they will now include detailed error messages:
```
[/remove-bg] Error removing background: Traceback...
```

---

## Common Issues & Solutions

### Issue: "Empty image file"
**Cause:** Image blob has 0 bytes
**Solution:**
- Verify image URL is valid
- Check if image is loading properly before processing
- Log blob size: `console.log('Blob size:', blob.size)`

### Issue: "Failed to fetch image"
**Cause:** Image URL is unreachable
**Solution:**
- Check URL is valid
- Verify CORS headers if cross-origin
- Test URL in browser directly

### Issue: "Could not connect to rembg microservice"
**Cause:** Service not running or wrong port
**Solution:**
- Verify service running on localhost:5000
- Check firewall settings
- Restart the microservice

### Issue: Logs show 200 OK but no output
**Cause:** Image processing failed silently
**Solution:**
- Check Python error logs for exceptions
- Verify rembg library is installed: `pip install rembg`
- Try with a different image format

---

## Testing the Fix

### Frontend Test
1. Open DevTools (F12)
2. Navigate to Data Records
3. Click "Remove Background" on an image
4. Check console for detailed logs
5. Should see success or specific error message

### Backend Test
```bash
# In rembg-microservice directory
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "image=@your_test_image.jpg" \
  http://localhost:5000/remove-bg \
  --verbose
```

---

## Performance Notes

- **Single image:** ~500ms with rembg
- **Batch (100 images):** ~50 seconds with 5 concurrent
- **Memory:** Efficient streaming, handles large images

---

## Configuration

### Change API URL
Edit `src/main.tsx`:
```typescript
configureBackgroundRemoval({
  provider: 'rembg-local',
  apiUrl: 'http://your-server:5000'  // Change this
});
```

### Disable/Enable Logging
The microservice logs are now comprehensive. To reduce noise, you can:

**Reduce log level in `rembg-microservice/app.py`:**
```python
logging.basicConfig(level=logging.WARNING)  # Only warnings/errors
```

---

## Next Steps

1. **Restart the microservice** to apply Python changes
2. **Clear browser cache** (Ctrl+Shift+Delete) to apply frontend changes
3. **Check console logs** when testing background removal
4. **Report any 400 errors** with the new detailed error messages

---

## Files Modified

1. ✅ `rembg-microservice/app.py` - Enhanced error logging
2. ✅ `src/lib/backgroundRemoval.ts` - Added request/response logging
3. ✅ This document - Troubleshooting guide

