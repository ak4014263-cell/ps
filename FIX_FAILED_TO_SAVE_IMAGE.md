# "Failed to Save Image" - Troubleshooting Guide

## What Changed ✅

I've improved error handling to **separate upload errors from save errors**:

- **Cloudinary upload errors** → Shows specific upload problem
- **Database save errors** → Shows specific database problem  
- **Blob validation** → Checks size and type before upload
- **Better logging** → Shows exactly which step failed

---

## How to Diagnose

### Step 1: Open Browser Console
- Press **F12**
- Go to **Console** tab
- Keep it open during processing

### Step 2: Start Background Removal
1. Select a record with photo
2. Click **Selected Actions** → **AI Image Background Remover**
3. Watch console output

### Step 3: Find the Error

Look for logs in this pattern:

```
[BG Removal] Uploading processed photo for record ... (blob size: ... bytes)
[BG Removal] Successfully uploaded to Cloudinary: https://...
[BG Removal] Saving to database: record ...
[BG Removal] Successfully saved to database: record ...
```

**If it fails**, you'll see which step:

#### **Cloudinary Upload Failed:**
```
[BG Removal] Uploading processed photo for record ... (blob size: ... bytes)
[BG Removal] Cloudinary upload failed for record ...: <error details>
```

#### **Database Save Failed:**
```
[BG Removal] Successfully uploaded to Cloudinary: https://...
[BG Removal] Saving to database: record ...
[BG Removal] Database update failed for record ...: <error details>
```

---

## Common Issues & Fixes

### Issue 1: "Cloudinary upload failed"

**Possible causes:**
1. Cloudinary API key not configured
2. Cloudinary credentials invalid
3. Network error
4. File too large

**How to fix:**
1. Check `.env` file for Cloudinary credentials
2. Verify Cloudinary account is active
3. Check file size is under 100MB
4. Try uploading directly from Cloudinary dashboard

**Check Cloudinary:**
```bash
# In terminal, check if API key is set
echo $CLOUDINARY_URL
# or
echo $REACT_APP_CLOUDINARY_*
```

---

### Issue 2: "Database update failed"

**Possible causes:**
1. Backend API not running
2. Database connection issue
3. Invalid record ID
4. Missing database field

**How to fix:**
1. Start backend: `cd backend && npm start`
2. Check database is running (MySQL)
3. Verify record exists in database
4. Check apiService.dataRecordsAPI works

**Test API:**
```bash
curl http://localhost:3001/api/health
```

Should return something like `{"status": "ok"}`

---

### Issue 3: "Blob is empty"

**Possible causes:**
1. Background removal returned empty result
2. rembg microservice failed
3. Memory issue

**How to fix:**
1. Check rembg is running: `curl http://localhost:5000/health`
2. Check console for rembg error logs
3. Try with a different image
4. Restart rembg service

---

### Issue 4: Processing shows progress then stops

**Possible causes:**
1. Timeout waiting for upload
2. Network interruption
3. Cloudinary rate limit
4. Backend crashed

**How to fix:**
1. Check Network tab (F12 > Network)
2. Look for stalled/failed requests
3. Try with 1 record only
4. Increase timeout if needed

---

## Step-by-Step Debugging

### 1. Check Rembg Service
```bash
# Terminal
curl http://localhost:5000/health
# Should show: {"status": "healthy", ...}
```

### 2. Check Backend API
```bash
# Terminal
curl http://localhost:3001/api/health
# Should respond successfully
```

### 3. Check Cloudinary Config
```bash
# In browser console:
import { apiService } from '@/lib/api';
console.log('API Service loaded');
```

### 4. Test with Single Record
1. Select **only 1 record**
2. Choose **AI Image Background Remover**
3. Watch console for detailed logs
4. Share the console output

---

## What to Share for Help

If "failed to save image" still appears, please provide:

### 1. Console Logs
```
Copy all logs starting with [BG Removal]
Especially the last 10-20 lines
```

### 2. Error Message
```
Screenshot of the toast error
Or copy the exact error text
```

### 3. Network Tab
```
Open F12 > Network tab
Retry the operation
Look for failed requests (red)
Share details of failed requests
```

### 4. Details
```
- Which record did you test with?
- Does it have a photo?
- What's the photo format? (JPG/PNG)
- What's the photo size?
```

---

## Verification Checklist

Before testing, verify all components:

- [ ] Rembg running: `curl http://localhost:5000/health` ✅
- [ ] Backend running: `curl http://localhost:3001/api/health` ✅
- [ ] Cloudinary credentials in .env ✅
- [ ] Database running (MySQL) ✅
- [ ] Record has photo ✅
- [ ] Internet connection OK ✅

---

## Error Message Examples

### ✅ Success
```
[BG Removal] Completed for record abc123 (1/1)
[BG Removal] SUCCESS: 1/1 photos processed
Toast: "Removed backgrounds from 1 photos"
```

### ❌ Cloudinary Error
```
[BG Removal] Cloudinary upload failed: Invalid API key
Toast: "Background removal failed... Cloudinary upload failed: Invalid API key"
```

### ❌ Database Error
```
[BG Removal] Database update failed: Connection timeout
Toast: "Background removal failed... Database update failed: Connection timeout"
```

### ❌ Rembg Error
```
[BG Removal] Background removal batch failed: rembg service returned empty
Toast: "Failed to remove backgrounds: rembg returned no processed blobs"
```

---

## Quick Fixes

| Error | Quick Fix |
|-------|-----------|
| "Cloudinary upload failed" | Check `.env` has Cloudinary credentials |
| "Database update failed" | Restart backend: `cd backend && npm start` |
| "Blob is empty" | Restart rembg: `python -m uvicorn app:app --reload --port 5000` |
| "Network error" | Check internet connection |
| "Timeout" | Try with single record |

---

## Next Test

1. **Ensure all services running:**
   - Rembg: port 5000
   - Backend: port 3001
   - Frontend: port 5173 (or similar)

2. **Select 1 record with clear photo**

3. **Open console (F12)**

4. **Click AI Image Background Remover**

5. **Copy console logs and share them**

The improved error messages will show exactly where it's failing!

