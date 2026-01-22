# Testing Photo Preview & Face Crop Fixes

## Setup
1. Ensure backend is running on `http://localhost:5000`
2. Ensure MySQL database is accessible
3. Ensure `/uploads` and `/uploads/processed` directories exist in backend

## Test Cases

### Test 1: Face Crop Button
1. Navigate to a project with photos
2. Click on a photo record to open image preview dialog
3. Click "Crop Face" button
4. Verify:
   - ✅ Face detection runs (see "Detecting and cropping face..." toast)
   - ✅ Cropped face appears in preview
   - ✅ Success message appears "Face cropped successfully!"
   - ✅ Record updates with new photo URL in table view
   - ✅ Photo file appears in `backend/uploads/processed/`

### Test 2: Brightness/Contrast/Saturation Adjustments
1. Open photo in preview dialog
2. Adjust brightness, contrast, or saturation sliders
3. Click "Apply Adjustments" button
4. Verify:
   - ✅ Adjusted preview shows updated filters
   - ✅ "Adjustments applied successfully!" message appears
   - ✅ Record updates in table view
   - ✅ Photo file saved to `backend/uploads/processed/`

### Test 3: Passport Crop
1. Open photo in preview dialog
2. Click "Passport Photo" dropdown and select a size (e.g., "US Passport (51x51mm)")
3. Click the size button
4. Verify:
   - ✅ Image crops to correct aspect ratio
   - ✅ Success toast appears (e.g., "Cropped to US Passport (51x51mm)!")
   - ✅ Record updates with cropped photo URL
   - ✅ File saved to `backend/uploads/processed/`

### Test 4: Multiple Operations in Sequence
1. Open photo
2. Apply adjustment filters
3. Crop face
4. Verify all operations complete successfully and database updates correctly

## Expected Behavior Changes

### Before Fix
- Face crop button: Click but nothing happens, or error in console
- Adjustments: Sliders work but apply fails silently
- Passport crop: Shows preview but doesn't save
- No files created in `backend/uploads/processed/`

### After Fix
- Face crop button: Works end-to-end, updates database, creates file
- Adjustments: Apply immediately, database updates, file created
- Passport crop: Works end-to-end, file saved with correct dimensions
- All processed files visible in `backend/uploads/processed/`

## Troubleshooting

### Issue: "Failed to save photo" error
- Check that `/api/image/save-photo` endpoint is accessible
- Verify `backend/uploads/processed/` directory exists
- Check backend console for detailed error messages

### Issue: Photos not persisting after refresh
- Verify database update is successful (check MySQL for photo_url field)
- Check that apiService.dataRecordsAPI.update() is working
- Look at React Query cache invalidation

### Issue: Files not appearing in backend/uploads/processed/
- Check directory permissions
- Verify backend/uploads/ directory structure exists
- Check backend console for file save errors

## Database Verification

After successful face crop, the data_records table should have:
```sql
SELECT id, name, photo_url, face_detected, processing_status 
FROM data_records 
ORDER BY updated_at DESC 
LIMIT 1;
```

Expected values:
- `photo_url`: `/uploads/processed/[recordId]_[photoType]_[timestamp].jpg`
- `face_detected`: 1 (for face crop)
- `processing_status`: 'face_cropped' (or 'processed')

## Performance Notes

- Face crop typically takes 2-5 seconds (Python face detection)
- Adjustments apply instantly (canvas-based)
- Passport crop applies instantly (canvas-based)
- File I/O is quick (< 1 second)
- Database updates are instant
