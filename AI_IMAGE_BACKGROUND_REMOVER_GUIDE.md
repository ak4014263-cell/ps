# AI Image Background Remover - Troubleshooting Guide

## Overview
The "AI Image Background Remover" feature in the Data Records dropdown menu removes backgrounds from selected photos and uploads processed images.

---

## Feature Added ✅

The "AI Image Background Remover" menu item is now in the **Selected Actions** dropdown:

1. Select one or more records with photos
2. Click **Selected Actions** dropdown
3. Choose **AI Image Background Remover**
4. Processing starts automatically

---

## How It Works

### Processing Pipeline:
```
1. Validate selections
   ├─ Check if rembg is configured
   └─ Check if rembg service is running
   
2. Fetch photos from records
   ├─ Get photo URL or data URL
   └─ Validate photo exists
   
3. Auto-crop faces (ID card mode)
   ├─ Detect faces using AI
   ├─ Crop to 600x400 pixels
   └─ Upload cropped to Cloudinary
   
4. Remove backgrounds
   ├─ Send to rembg microservice
   ├─ Receive PNG with transparency
   └─ Show progress
   
5. Upload processed photos
   ├─ Save to Cloudinary
   ├─ Update database record
   └─ Display results
```

---

## Prerequisites

### 1. Rembg Microservice Running
The microservice must be running on `localhost:5000`:

```bash
cd rembg-microservice
python -m uvicorn app:app --reload --port 5000
```

### 2. Verify Health
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "rembg-microservice",
  "version": "1.0.0"
}
```

### 3. Cloudinary Configured
Ensure Cloudinary API key and URL are set in environment variables.

### 4. Records with Photos
- Records must have photo URLs or photo data
- Photos should be valid image files (JPEG, PNG, etc.)

---

## Troubleshooting

### Issue: Menu Item Not Showing
**Cause:** No records selected

**Solution:**
1. Click checkbox to select one or more records
2. Make sure selected records have photos
3. Click "Selected Actions" dropdown again

---

### Issue: "Background removal service not available"
**Cause:** Rembg microservice not running

**Solution:**
1. Start rembg microservice:
   ```bash
   cd rembg-microservice
   python -m uvicorn app:app --reload --port 5000
   ```
2. Wait 5 seconds for startup
3. Try again

---

### Issue: "Selected records have no photos"
**Cause:** Records don't have photo URLs

**Solution:**
1. Upload photos to records first
2. Verify photo URLs exist in database
3. Check browser console for photo URLs
4. Reload page and try again

---

### Issue: Processing starts but stops
**Cause:** Error during face detection or cropping

**Solution:**
1. Check browser console (F12 > Console tab)
2. Look for logs starting with `[BG Removal]`
3. Check if error mentions face detection
4. Try with simpler/clearer images
5. Check Cloudinary upload errors

---

### Issue: "Failed to remove backgrounds: ..."
**Cause:** Various possible causes

**Check These:**

#### 1. Check Rembg Service Logs
```bash
# Terminal where rembg is running
# Look for error messages
```

#### 2. Check Browser Console Logs
- Open DevTools: F12
- Go to Console tab
- Look for `[BG Removal]` messages
- Check error details

#### 3. Verify Image Format
- Ensure photos are valid JPEG/PNG
- Try with a known good image
- Check image file size

#### 4. Check Network in DevTools
- Open DevTools: F12
- Go to Network tab
- Look for POST requests to `/remove-bg`
- Check response status and body

---

## Debugging Steps

### Enable Detailed Logging

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Click "AI Image Background Remover"**
4. **Watch for logs:**

```
[BG Removal] Config: {provider: 'rembg-local', apiUrl: 'http://localhost:5000'}
[BG Removal] Rembg service is healthy
[BG Removal] Starting for X records with photos
[BG Removal] Successfully fetched X/X photos
[BG Removal] Processing X photos with removeBackgroundBatch...
[BG Removal] Received X processed blobs from rembg
[BG Removal] Uploading processed photo for record ...
[BG Removal] Uploaded to Cloudinary: https://...
[BG Removal] Updated record ... (X/X)
[BG Removal] SUCCESS: X/X photos processed
```

### Checking Microservice Logs

In the terminal where rembg is running, look for:

```
[/remove-bg] Received request: filename=..., content_type=..., size=...
[/remove-bg] Processing image with model=u2net, size=... bytes
[/remove-bg] Successfully processed image: ..., output_size=... bytes
```

---

## Configuration

### Change Rembg API URL
Edit `src/main.tsx`:

```typescript
configureBackgroundRemoval({
  provider: 'rembg-local',
  apiUrl: 'http://your-server:5000'  // Change this
});
```

### Change Crop Mode
The feature currently uses **ID Card mode** (600x400):

To change, edit `handleRemoveBackgroundBulk` in DataRecordsTable.tsx:

```typescript
mode: bulkCropMode  // Change to 'passport' for different aspect ratio
```

---

## Performance

- **Single image:** ~1-2 seconds (crop + BG removal + upload)
- **Batch of 10:** ~15-20 seconds
- **Batch of 100:** ~2-3 minutes

Progress bar shows real-time progress.

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Background removal not available" | Rembg not configured | Check rembg config in src/main.tsx |
| "service not available" | Rembg not running | Start microservice on port 5000 |
| "health check failed" | Service unhealthy | Check microservice logs |
| "No photos" | Records have no photos | Upload photos first |
| "Empty image file" | Photo blob is empty | Check photo URL is valid |
| "Failed to fetch photo" | Photo URL unreachable | Verify photo URL/path |
| "Upload failed" | Cloudinary error | Check Cloudinary API key |
| "CORS error" | Browser CORS policy | Check server CORS headers |

---

## Verification Checklist

- [ ] Rembg microservice running: `curl http://localhost:5000/health`
- [ ] Records have photos uploaded
- [ ] Cloudinary configured and API key set
- [ ] Browser console shows no errors
- [ ] Network requests show 200 status codes
- [ ] Progress bar updates during processing
- [ ] Toast notifications appear on success/error

---

## Advanced Debugging

### Test Individual Components

1. **Test Rembg Service:**
   ```bash
   curl -X POST -F "image=@test.jpg" http://localhost:5000/remove-bg -o result.png
   ```

2. **Test Cloudinary Upload:**
   - Go to Cloudinary dashboard
   - Check recent uploads
   - Verify credentials

3. **Test Face Detection:**
   - Use different images with clear faces
   - Try passport photos
   - Try ID card style photos

---

## Logs to Share for Support

If you need help, please provide:

1. **Browser Console Logs** (F12 > Console)
   - All `[BG Removal]` messages
   - Any error messages

2. **Microservice Logs**
   - Terminal output where rembg runs
   - All `[/remove-bg]` messages

3. **Error Description**
   - What you were trying to do
   - What error appeared
   - Which records/photos affected

---

## Feature Status

✅ Menu item added to Selected Actions dropdown
✅ Background removal function implemented
✅ Progress tracking with percentage
✅ Detailed error logging
✅ Cloudinary integration
✅ Database update after processing

