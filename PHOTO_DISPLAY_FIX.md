# Photo Display Fix - Template Designer & Batch PDF Generation

## Issue Summary
Photos were not displaying in:
1. Template Designer Preview Mode
2. Batch PDF Generation

## Root Causes Identified

### 1. **Incomplete URL Resolution**
- Photo URLs from the database were often relative paths (e.g., `/uploads/project-photos/...`)
- The code was not properly prepending the backend base URL
- This caused image loading to fail with 404 errors

### 2. **Missing Photo Placeholder Support in Preview**
- Preview mode only handled "variable" type photos
- Photo placeholders (non-variable type) were not being processed
- Masked photos were not being handled in preview mode

### 3. **Insufficient Error Handling**
- No logging to help debug photo loading failures
- Silent failures made it difficult to identify the issue

## Changes Made

### File 1: `DesignerBatchPDFPanel.tsx`

#### Change 1: Added URL Resolution Helper Function
**Lines 648-662**
```typescript
// Helper function to resolve photo URL with proper backend base
const resolvePhotoUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // If already absolute URL or data URL, return as is
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  
  // Otherwise prepend backend base URL
  const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  if (url.startsWith('/')) {
    return `${backendBase}${url}`;
  }
  return `${backendBase}/${url}`;
};
```

#### Change 2: Enhanced Photo Placeholder Handling
**Lines 689-730**
- Added URL resolution for all photo placeholders
- Improved error handling with detailed console logs
- Added null checks for scaleX, scaleY, originX, originY, angle
- Better logging for debugging

#### Change 3: Enhanced Image Variable Handling
**Lines 732-760**
- Added URL resolution for image variables
- Improved error handling
- Better logging

#### Change 4: Enhanced Masked Photo Handling
**Lines 762-806**
- Added URL resolution for masked photos
- Improved error handling with field-specific logging
- Added width/height defaults for MaskedPhotoObject
- Better logging for debugging
- Added selectable: false, evented: false to prevent interaction

#### Change 5: Added Summary Logging
**Lines 808-812**
- Added logging to show how many images are being loaded
- Added confirmation when all images are loaded successfully

### File 2: `AdvancedTemplateDesigner.tsx`

#### Change 1: Fixed URL Resolution in Preview Mode
**Lines 3488-3498**
```typescript
// Normalize URL if it's a relative path (common with proxied uploads)
if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
  const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  if (url.startsWith('/')) {
    url = `${backendBase}${url}`;
  } else {
    url = `${backendBase}/${url}`;
  }
}

console.log(`[Preview] Loading photo for field "${fieldName}":`, url);
```

#### Change 2: Enhanced Error Logging
**Lines 3633-3640**
- Added success logging when photos load correctly
- Improved error messages with field names and URLs
- Better fallback error handling

#### Change 3: Added Photo Placeholder Support
**Lines 3783-3889**
- Added complete handling for photo placeholders (non-variable type)
- Supports all shape types (circle, rounded-rect, rect)
- Proper URL resolution
- Comprehensive error handling and logging

#### Change 4: Added Masked Photo Support
**Lines 3890-4000**
- Added complete handling for masked photos in preview mode
- Supports all mask shapes from config
- Proper URL resolution
- Comprehensive error handling and logging
- Respects mask configuration (shape, dimensions)

## Testing Recommendations

### 1. Template Designer Preview Mode
1. Create a template with:
   - Variable photo fields ({{photo}})
   - Photo placeholders
   - Masked photos with different shapes
2. Load data from project with photo URLs
3. Enable preview mode
4. Verify all photos display correctly
5. Check browser console for `[Preview]` logs

### 2. Batch PDF Generation
1. Create a template with multiple photo types
2. Load CSV data or project data with photos
3. Generate batch PDF
4. Verify all photos appear in the PDF
5. Check browser console for `[Batch]` logs

### 3. Different Photo URL Formats
Test with:
- Absolute URLs: `http://localhost:3001/uploads/...`
- Relative URLs: `/uploads/project-photos/...`
- Data URLs: `data:image/jpeg;base64,...`
- URLs from uploaded photos
- URLs from project records

## Console Logging

The fix adds comprehensive logging with prefixes:
- `[Preview]` - Template designer preview mode
- `[Batch]` - Batch PDF generation

Example logs:
```
[Preview] Loading photo for field "photo": http://localhost:3001/uploads/project-photos/abc123/photo.jpg
[Preview] Successfully loaded and applied photo for field "photo"

[Batch] Photo placeholder "photo" resolved URL: http://localhost:3001/uploads/...
[Batch] Successfully loaded photo for placeholder "photo"
[Batch] Waiting for 3 images to load...
[Batch] All images loaded successfully
```

## Environment Variables

The fix uses the `VITE_API_URL` environment variable:
- If set: Uses the configured backend URL
- If not set: Defaults to `http://localhost:3001`

Make sure `.env` or `.env.local` contains:
```
VITE_API_URL=http://localhost:3001
```

## Known Limitations

1. CORS issues may still occur if:
   - Backend doesn't send proper CORS headers
   - Photos are hosted on different domain without CORS
   
2. The fallback fetch mechanism in preview mode helps with CORS but adds latency

3. Very large images may take time to load in batch PDF generation

## Future Improvements

1. Add image caching to avoid re-downloading same photos
2. Add progress indicators for batch PDF generation
3. Add image optimization/compression before adding to PDF
4. Support for more mask shapes in preview mode
5. Better handling of missing photos (show placeholder icon)
