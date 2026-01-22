# Passport Crop Button on Image Preview - Implementation Complete

## Summary
Successfully added "Passport Crop" button to the Image Preview Dialog, allowing users to apply advanced passport photo cropping directly from the image preview interface.

## Changes Made

### 1. Component Import
**File**: `src/components/project/ImagePreviewDialog.tsx`
- Added import: `import { cropPassportPhoto } from '@/lib/faceDetection';`

### 2. Component State
- Added new state: `const [isPassportCropping, setIsPassportCropping] = useState(false);`
- Tracks the passport cropping loading state

### 3. Handler Function
**Function**: `handlePassportCrop()`
- Location: Added after `handleFaceCrop()` function
- Functionality:
  - Calls `cropPassportPhoto()` from faceDetection library
  - Converts cropped image URL to blob
  - Uploads to backend via `/api/image/save-photo` endpoint
  - Saves result with photoType: 'passport_cropped'
  - Updates database record with processing status
  - Shows success/error toast notifications
  - Invalidates React Query cache for data records

### 4. UI Button
**Location**: Image Preview Dialog action buttons section
- **Position**: Between "Face Crop" and "Remove BG" buttons
- **Variant**: Secondary (grey background)
- **Icon**: Crop icon from lucide-react
- **Label**: "Passport Crop"
- **Disabled**: When `isPassportCropping` is true or no image URL
- **Loading State**: Shows spinner and "Passport Cropping..." text during processing

## Button Flow

```
User View Image → Click "Passport Crop" Button
    ↓
Frontend: cropPassportPhoto(imageUrl, { mode: 'passport', finalSize: 600 })
    ↓
Backend: POST /api/image/passport-crop (base64 image)
    ↓
Python: passport_crop_2026.py runs face detection
    ↓
Backend: Returns cropped JPEG blob
    ↓
Frontend: Uploads blob to /api/image/save-photo
    ↓
Backend: Saves in database, returns URL
    ↓
Frontend: Updates displayed image, invalidates cache
    ↓
Database: Records updated with status 'passport_cropped'
```

## Integration with Existing Features

### Alongside Other Image Operations
The new button works alongside existing image processing:
- **Face Crop**: Simple face-centric cropping
- **Passport Crop**: Advanced cropping with InsightFace (NEW)
- **Remove Background**: BG removal with rembg
- **Beautify**: Face enhancement with CodeFormer
- **Passport Size Crop**: Manual aspect ratio cropping

### Database Storage
Saves with metadata:
- `photoType`: 'passport_cropped' 
- `processing_status`: 'passport_cropped'
- Records both `photo_url` and `cropped_photo_url`

### Real-time Updates
- Uses React Query `useQueryClient` to invalidate cache
- Updates immediately refresh the data records table
- No page reload needed

## User Experience

### Visual Feedback
1. **Before**: "Passport Crop" button visible
2. **During**: Button shows spinner + "Passport Cropping..." text, disabled
3. **After**: 
   - Image preview updates to show cropped version
   - Toast notification: "Passport photo cropped successfully!"
   - Button returns to normal state

### Error Handling
- Network errors: "Passport crop failed: [error message]"
- Image issues: Graceful fallback with error messaging
- Backend unavailable: Clear error toast

## Features

### Advanced Passport Cropping Algorithm
- **Face Detection**: InsightFace with 106-point landmarks
- **Hair Protection**: Multi-layer safety checks
- **Shoulder Visibility**: Guaranteed top-of-shoulders in frame
- **Head Positioning**: Eyes at optimal 40% from top
- **Child Detection**: Automatic padding adjustment for small faces
- **Output**: 600x600px JPEG (configurable)

### Seamless Integration
- Uses same backend endpoint as DataManagement batch processor
- Consistent styling with existing buttons
- Respects image adjustments (brightness/contrast/saturation)
- Works with both uploaded and database-sourced images

## Files Modified

1. ✅ `src/components/project/ImagePreviewDialog.tsx` 
   - Added import for `cropPassportPhoto`
   - Added `isPassportCropping` state
   - Added `handlePassportCrop()` function
   - Added UI button in actions section

## Testing Checklist

- [ ] Open image preview dialog from data records
- [ ] Click "Passport Crop" button
- [ ] Verify progress spinner shows
- [ ] Wait for processing to complete
- [ ] Confirm image updates with cropped version
- [ ] Check database record updated (cropped_photo_url)
- [ ] Verify toast notification appears
- [ ] Test with various image sizes
- [ ] Test with children photos (small faces)
- [ ] Download cropped image to verify quality
- [ ] Test error cases (network issues, invalid image)
- [ ] Check data records table refreshes automatically

## Related Components

### Connected Files
1. **Backend Endpoint**: `backend/routes/image-tools.js` - `/api/image/passport-crop`
2. **Python Script**: `backend/passport_crop_2026.py`
3. **Frontend Function**: `src/lib/faceDetection.ts` - `cropPassportPhoto()`
4. **Data Layer**: `src/lib/api.ts` - DataRecords API
5. **UI Components**: Existing dialog/button components

### API Flow
```
ImagePreviewDialog
    ↓ cropPassportPhoto()
src/lib/faceDetection.ts
    ↓ fetch POST /api/image/passport-crop
backend/routes/image-tools.js
    ↓ spawn python process
backend/passport_crop_2026.py
    ↓ insightface + opencv
    ↓ returns JPEG blob
backend/routes/image-tools.js
    ↓ fetch POST /api/image/save-photo
    ↓ saves to MySQL database
src/components/project/ImagePreviewDialog.tsx
    ↓ update UI + invalidate cache
```

## Performance Considerations

- **Async Processing**: Non-blocking UI updates
- **Progress Indication**: User sees spinner during 1-5 second processing
- **Memory Efficient**: Uses blob conversion instead of full canvas
- **Database**: Record updated immediately, no polling needed

## Security

- Image data sent as base64 in JSON (safer than direct file upload in this context)
- Backend validates file size and type
- Database credentials never exposed to frontend
- Temporary files cleaned up automatically on server

## Future Enhancements

- [ ] Batch passport crop for multiple images
- [ ] Crop preview before saving (add confirmation dialog)
- [ ] Adjustable crop parameters (size, padding)
- [ ] Multiple passport standards selection
- [ ] Quality metrics feedback
- [ ] Comparison view (before/after)

---
**Implementation Date**: January 21, 2026
**Status**: ✅ Complete and Ready for Testing
**Component**: ImagePreviewDialog (formerly named in project)
