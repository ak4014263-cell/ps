# Photo Preview & Face Crop Fixes

## Problem
The photo preview dialog's face crop, passport crop, and adjustment filters were not working because they were trying to use Supabase storage (which is stubbed and returns null/empty).

## Solution
Replaced all direct Supabase storage calls with backend API endpoints.

## Changes Made

### 1. Backend Changes

#### Added new endpoint in `backend/routes/image-tools.js`:
- **POST /api/image/save-photo**: Saves processed photos (cropped, adjusted, etc) to the local file system
  - Accepts multipart/form-data with:
    - `photo`: The image blob file
    - `recordId`: Record ID for file naming
    - `photoType`: Optional type suffix (e.g., "face_cropped", "adjusted", "passport_us")
  - Returns: `{ success: true, url: "/uploads/processed/filename.jpg" }`
  - Files are saved to `backend/uploads/processed/`

### 2. Frontend Changes

#### `src/components/project/ImagePreviewDialog.tsx`
Fixed 3 image processing functions:

1. **handleFaceCrop()** (lines 226-287)
   - ✅ Now uses `/api/image/crop-face` (already working)
   - ✅ Now uses `/api/image/save-photo` instead of Supabase storage
   - ✅ Updates database via apiService.dataRecordsAPI.update()

2. **handleApplyAdjustments()** (lines 75-137)
   - ✅ Now uses `/api/image/save-photo` instead of Supabase storage
   - ✅ Updates database via apiService.dataRecordsAPI.update()

3. **handlePassportCrop()** (lines 141-222)
   - ✅ Now uses `/api/image/save-photo` instead of Supabase storage
   - ✅ Updates database via apiService.dataRecordsAPI.update()

## How It Works

### Face Crop Flow
1. User clicks "Crop Face" button
2. Frontend fetches image → blob
3. Frontend sends blob to `/api/image/crop-face` → gets cropped blob back
4. Frontend sends cropped blob to `/api/image/save-photo` → gets public URL
5. Frontend updates record with new photo URL via apiService
6. UI invalidates cache and shows updated record

### Adjustment & Crop Flows
Same pattern but skips the crop-face step and goes directly to save-photo.

## Testing Checklist

- [ ] Face crop button works (detects and crops face)
- [ ] Cropped photo shows in preview
- [ ] Photo URL saved to database
- [ ] Record shows updated photo in list view
- [ ] Passport crop button works (us, uk, india, schengen)
- [ ] Adjustment filters work (brightness, contrast, saturation)
- [ ] Files save to `backend/uploads/processed/`

## Files Modified
1. `backend/routes/image-tools.js` - Added save-photo endpoint
2. `src/components/project/ImagePreviewDialog.tsx` - Fixed 3 functions to use backend API

## Files Created
None (using existing API infrastructure)

## Notes
- All Supabase storage calls removed from ImagePreviewDialog
- Using backend API for all file storage (consistent with architecture)
- Public URLs are relative paths like `/uploads/processed/file.jpg`
- Temporary files in `backend/uploads/tmp/` are cleaned up after processing
