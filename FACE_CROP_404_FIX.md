# Face Crop Feature - 404 Error Fix

## Problem
The face crop feature was failing with a 404 error when trying to fetch photos from the database.

### Root Cause
The frontend code was trying to fetch photos from an `/api/image/get-photo/:recordId` endpoint that expected photos to be stored as **BLOBs** in the MySQL database. However, in reality:
- Photos are stored as **filenames** in the `photo_url` column (e.g., `photo_03c7dcac-3ba4-43cc-8eaf-d3a4286f1296_1768396458885.jpg`)
- Photos are stored as **files** in `backend/uploads/photos/` directory, NOT as BLOBs
- The BLOB columns (`photo_blob`, `cropped_photo_blob`) are all **NULL** in the database

### Error Flow
1. Frontend fetches record with `photo_url = "photo_03c7dcac-3ba4-...jpg"`
2. Frontend tried to access `/api/image/get-photo/:recordId` endpoint
3. Endpoint tried to query `photo_blob` column (NULL) → returned 404
4. Face crop feature failed before even starting

## Solution
Updated [src/pages/ProjectDetails.tsx](src/pages/ProjectDetails.tsx#L805-L825) to construct the correct file path:

### Changes Made

**Before:**
```typescript
let photoUrl = record.photo_url!;
if (!photoUrl.startsWith('http')) {
  if (!photoUrl.startsWith('/')) {
    photoUrl = '/' + photoUrl;
  }
  photoUrl = `http://localhost:3001${photoUrl}`;
}
```

**After:**
```typescript
let photoUrl = record.photo_url!;
if (!photoUrl.startsWith('http')) {
  // If it's just a filename, prepend the uploads path
  if (!photoUrl.includes('/')) {
    photoUrl = `/uploads/photos/${photoUrl}`;
  }
  if (!photoUrl.startsWith('/')) {
    photoUrl = '/' + photoUrl;
  }
  photoUrl = `http://localhost:3001${photoUrl}`;
}
```

### Key Improvements
1. **Detects filename-only format**: If `photo_url` is just a filename (no `/`), automatically prepends `/uploads/photos/`
2. **Constructs correct URL**: Results in `http://localhost:3001/uploads/photos/photo_[id]_[timestamp].jpg`
3. **Uses existing static server**: Leverages the Express static middleware already configured in `backend/server.js:87` for `/uploads` directory
4. **Enhanced logging**: Added logging showing both the database value and constructed URL for debugging

## Verification

### ✅ Photo Accessibility
```
Photo accessible at /uploads/photos/photo_03c7dcac-3ba4-43cc-8eaf-d3a4286f1296_1768396458885.jpg
Size: 452909 bytes
```

### ✅ Python Processor Works
```
Python process exited with code: 0
Face crop processed successfully
Output file created: 413434 bytes
```

### ✅ Database Schema
```
Record ID: 03c7dcac-3ba4-43cc-8eaf-d3a4286f1296
photo_url: photo_03c7dcac-3ba4-43cc-8eaf-d3a4286f1296_1768396458885.jpg
cropped_photo_url: (NULL)
photo_blob: (NULL)
cropped_photo_blob: (NULL)
```

## Testing Instructions

1. **Access the project** in the browser at `http://localhost:5173`
2. **Select a photo** by checking the checkbox next to any record with a photo
3. **Click "Face Crop (AI)"** in the Actions dropdown menu
4. **Monitor console** (F12 → Console tab) for logs:
   - Should see: `[Face Crop] Fetching image from: http://localhost:3001/uploads/photos/...`
   - Should NOT see: `Failed to fetch image (404)` error

## Files Modified
- [src/pages/ProjectDetails.tsx](src/pages/ProjectDetails.tsx#L805-L825) - Fixed photo URL construction in `handleFaceCropImages` function

## Next Steps if Still Failing
1. Check browser console (F12) for exact error message
2. Verify `/uploads/photos/` directory has photos: `ls backend/uploads/photos/`
3. Test direct photo access: `curl http://localhost:3001/uploads/photos/[photoName].jpg`
4. Check backend logs for CORS or file serving errors
