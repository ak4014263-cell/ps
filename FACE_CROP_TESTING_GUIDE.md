# Face Crop Feature - Complete Implementation Guide

## Current Status: ✅ FIXED & READY FOR TESTING

The face crop feature has been fully implemented with all fixes applied.

## What Was Fixed

### Issue 1: 404 Error When Fetching Photos
**Root Cause**: Photos stored as filenames in database, not BLOBs
**Fix**: Updated frontend to construct correct URL path (`/uploads/photos/filename.jpg`)

### Issue 2: Cropped Photos Not Saved Correctly  
**Root Cause**: Backend only saved BLOB, didn't store filename/URL
**Fix**: Backend now saves both BLOB and filename to database

### Issue 3: Wrong Database Column Updated
**Root Cause**: Frontend was updating `photo_url` instead of `cropped_photo_url`
**Fix**: Updated to store in correct `cropped_photo_url` column for face-cropped images

## Architecture

```
Photo Upload Flow:
  User uploads photo → Saved to backend/uploads/photos/ → Filename stored in photo_url

Face Crop Processing:
  1. Frontend fetches from: http://localhost:3001/uploads/photos/[filename]
  2. Sends to: POST /api/image/face-crop with image blob
  3. Backend spawns Python: SchoolIDProcessor with buffalo_l model
  4. Returns cropped base64 image
  5. Frontend sends to: POST /api/image/save-photo
  6. Backend saves to database:
     - BLOB in: cropped_photo_blob column
     - Filename in: cropped_photo_url column
     - Status: face_cropped
  7. Frontend updates record in database with new cropped_photo_url
```

## Testing Instructions

### Step 1: Ensure Backend is Running
```powershell
# Terminal 1: Backend server
cd backend
npm run dev
# Should see: [DEBUG] Server listening on port 3001
```

### Step 2: Ensure Frontend is Running
```powershell
# Terminal 2: Frontend dev server
npm run dev
# Should see: Local: http://localhost:5173
```

### Step 3: Test Face Crop Feature
1. Open browser: `http://localhost:5173`
2. Navigate to Projects → Select a project → Data Records
3. Check the checkbox for any record with a photo
4. Click "Actions" dropdown → "Face Crop (AI)"
5. Monitor browser console (F12 → Console tab)

### Expected Console Output
```
[Face Crop] Button clicked, selectedRecordIds: 1
[Face Crop] Records to process: 1
[Face Crop] Fetching image from: http://localhost:3001/uploads/photos/photo_03c7dcac-3ba4-43cc-8eaf-d3a4286f1296_1768396458885.jpg
[Face Crop] Image blob received: image/jpeg 452909
[Face Crop] Saved cropped photo, URL: /uploads/photos/cropped_[recordId]_[timestamp].jpg
[Face Crop] Updated record [recordId] with cropped_photo_url: /uploads/photos/cropped_[recordId]_[timestamp].jpg
```

### If You See Errors

**Error: "Failed to fetch image (404)"**
- Check: Is backend running? (port 3001)
- Check: Does `/uploads/photos/` directory have files?
- Check: Browser console shows the attempted URL?

**Error: "Failed to crop API error"**
- Check: Python environment is configured
- Check: InsightFace models can download
- Check: Backend console for Python errors

**Error: "Save failed"**
- Check: Backend is accepting POST to /api/image/save-photo
- Check: recordId is valid UUID
- Check: Database connection is working

## Database Verification

### Check Photo Storage
```bash
# Query database
node
> const mysql = require('mysql2/promise');
> const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'id_card'
  });
> const [rows] = await conn.execute(
    'SELECT id, photo_url, cropped_photo_url FROM data_records LIMIT 1'
  );
> console.log(rows[0]);
```

Expected output:
```javascript
{
  id: '03c7dcac-3ba4-43cc-8eaf-d3a4286f1296',
  photo_url: 'photo_03c7dcac-3ba4-43cc-8eaf-d3a4286f1296_1768396458885.jpg',
  cropped_photo_url: 'cropped_03c7dcac-3ba4-43cc-8eaf-d3a4286f1296_1674132891234.jpg'  // ← After face crop
}
```

## File Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| Python Processor | `rembg-microservice/school_id_processor.py` | Runs face detection, background removal |
| Backend Route | `backend/routes/image-tools.js` | Express endpoints for image operations |
| Frontend Handler | `src/pages/ProjectDetails.tsx:786-902` | UI and face crop orchestration |
| Uploaded Photos | `backend/uploads/photos/` | Stored photo files |
| Python CLI | `backend/tools/school_id_processor_cli.py` | Wrapper for spawning Python |

## Python Processor Details

**Model**: InsightFace buffalo_l (lightweight CPU version)
**Processing Steps**:
1. Background removal (rembg u2net)
2. Face detection (InsightFace)
3. Geometric alignment and crop

**Exit Codes**:
- `0`: Success - face found and cropped
- `1`: Error - processing failed
- `2`: No face detected

## Next Steps for Deployment

1. Test with multiple photos to ensure reliability
2. Monitor CPU usage during Python processing
3. Verify all cropped photos are correctly stored
4. Check that original photos are preserved in `original_photo_url`
5. Deploy to production server

## Troubleshooting Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] MySQL database accessible
- [ ] Python environment configured
- [ ] `/uploads/photos/` directory exists
- [ ] Photos accessible via `/uploads/photos/[filename]`
- [ ] Python processor test passes
- [ ] Browser console shows no CORS errors
- [ ] Database has cropped_photo_url values after processing
