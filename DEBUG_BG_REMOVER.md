# AI Image Background Remover - Debug Checklist

## Fixed Issues ✅

1. **Removed complex face detection/cropping** - This was causing failures
2. **Simplified processing** - Now just removes backgrounds directly
3. **Better error handling** - More detailed error messages
4. **API URL validation** - Checks config before attempting connection

---

## Step-by-Step Testing

### Step 1: Verify Rembg Service

Open **PowerShell/Terminal** and run:

```powershell
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "rembg-microservice",
  "version": "1.0.0"
}
```

**If fails:** Start rembg service:
```bash
cd rembg-microservice
python -m uvicorn app:app --reload --port 5000
```

---

### Step 2: Open Browser DevTools

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Leave this open during testing

---

### Step 3: Test the Feature

1. Go to **Data Records** tab in app
2. **Select 1 record** with a photo (check the checkbox)
3. Click **Selected Actions** dropdown
4. Choose **AI Image Background Remover**

---

### Step 4: Read Console Logs

Look for logs in this order. **Copy the output and share it.**

```
[BG Removal] Config: {...}
[BG Removal] Testing connection to http://localhost:5000/health
[BG Removal] Rembg service is healthy: {...}
[BG Removal] Starting for 1 records with photos
[BG Removal] Successfully fetched 1/1 photos
[BG Removal] Processing 1 photos with removeBackgroundBatch...
[BG Removal] Received 1 processed blobs from rembg
[BG Removal] Uploading processed photo for record ...
[BG Removal] Uploaded to Cloudinary: https://...
[BG Removal] Updated record ... (1/1)
[BG Removal] SUCCESS: 1/1 photos processed
```

---

## Common Issues & Quick Fixes

### Issue 1: "Background removal service not available"

**Cause:** Rembg microservice not running

**Fix:**
```bash
cd rembg-microservice
python -m uvicorn app:app --reload --port 5000
# Wait 5 seconds, then try again in app
```

---

### Issue 2: "Selected records have no photos"

**Cause:** Records don't have photo URLs

**Fix:**
1. Click on a record
2. Check if it has a photo displayed
3. If no photo, upload one first
4. Reload the page
5. Try again

---

### Issue 3: "Could not fetch photos from ... records"

**Cause:** Photo URLs are broken or unreachable

**Fix:**
1. Check browser console (F12 > Network tab)
2. Look for failed image requests
3. Verify photos are uploaded to backend/Cloudinary
4. Try with a different record

---

### Issue 4: Error message in toast

**What to do:**
1. **Copy the error message**
2. **Check browser console (F12)** for [BG Removal] logs
3. **Share both** the error and console logs

---

### Issue 5: Toast shows but nothing happens

**Possible causes:**
1. Rembg not running
2. Photos not fetching
3. API call failed silently

**Check:**
1. Open Network tab (F12 > Network)
2. Look for POST requests to `/remove-bg`
3. Check if they succeed (200 status)
4. Check response for errors

---

## Debug Information to Provide

When reporting "not working", please provide:

### 1. Console Logs (F12 > Console Tab)
```
Copy all logs that start with [BG Removal]
```

### 2. Network Requests (F12 > Network Tab)
```
- Look for requests to localhost:5000/remove-bg
- Check status codes
- Check response body
```

### 3. Toast Error Message
```
Screenshot of the error toast
```

### 4. Browser Info
```
- Browser: Chrome/Firefox/Safari
- OS: Windows/Mac/Linux
```

### 5. Test Image Details
```
- Image format: JPEG/PNG
- Image size: (width x height)
- Photo quality: Clear/Blurry/Partially visible
```

---

## What Was Changed

### Simplified Processing

**Before:** 
```
Photos → Face Detection → Crop → Background Removal → Upload
```

**Now:**
```
Photos → Background Removal → Upload
```

This removes the complex face detection step that was causing issues.

---

## Test With These Records

Try these in order:

1. **Passport photo** - Head shots work best
2. **Clear ID card photo** - Professional photos
3. **Any photo** - Test with any existing photo

---

## Configuration Check

### In Browser Console, run:

```javascript
// Check if rembg is configured
import { getBackgroundRemovalConfig } from '@/lib/backgroundRemoval';
const config = getBackgroundRemovalConfig();
console.log('Config:', config);
```

**Expected output:**
```
Config: {
  provider: 'rembg-local',
  apiUrl: 'http://localhost:5000'
}
```

---

## Manual API Test

In **PowerShell**, test the endpoint directly:

```powershell
# Download a test image first (or use existing file)
$image = 'C:\path\to\test_image.jpg'

# Send to rembg
curl -X POST `
  -F "image=@$image" `
  http://localhost:5000/remove-bg `
  -o result.png `
  -v
```

If this works, the microservice is functioning.

---

## Next Steps

1. **Verify rembg is running** (Step 1)
2. **Test with 1 record** (Step 3)
3. **Check console logs** (Step 4)
4. **Share the logs/errors** in your response

---

## Quick Reference

| Component | Status | Check |
|-----------|--------|-------|
| Rembg service | ? | `curl http://localhost:5000/health` |
| Records with photos | ? | Can you see photos in Data Records? |
| Menu item visible | ? | Does Selected Actions show the option? |
| Processing starts | ? | Does it show loading toast? |
| Logs in console | ? | F12 > Console > [BG Removal] logs |

