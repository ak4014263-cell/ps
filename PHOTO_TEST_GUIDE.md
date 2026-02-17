# Quick Test Guide - Photo Display Fix

## What Was Fixed

✅ **Template Designer Preview Mode** - Photos now display correctly when you preview data
✅ **Batch PDF Generation** - Photos now appear in generated PDFs
✅ **All Photo Types Supported**:
   - Variable photos ({{photo}})
   - Photo placeholders
   - Masked photos (circle, rounded-rect, etc.)

## How to Test

### Test 1: Template Designer Preview (5 minutes)

1. **Open Template Designer**
   - Go to Dashboard → Templates
   - Create new template or edit existing one

2. **Add Photo Elements**
   - Add a photo placeholder from Elements panel
   - Or add a text variable with {{photo}} syntax
   - Or add a masked photo with custom shape

3. **Load Preview Data**
   - Click on "Data Preview" panel (database icon)
   - Select "Database" tab
   - Choose a project with photos
   - Click "Apply Preview"

4. **Verify Photos Display**
   - Photos should appear on the template
   - Check browser console (F12) for `[Preview]` logs
   - Should see: "Successfully loaded photo for field..."

### Test 2: Batch PDF Generation (5 minutes)

1. **Open Batch PDF Panel**
   - In template designer, click "Batch PDF" icon
   - Or go to Projects → Select Project → Generate PDFs

2. **Load Data**
   - Click "Load from Project" button
   - Select a project with photo data
   - Verify data is loaded (should see record count)

3. **Generate Preview PDF**
   - Click "Preview" button (generates first page only)
   - PDF should open in new tab
   - Verify photos appear correctly

4. **Check Console Logs**
   - Open browser console (F12)
   - Look for `[Batch]` logs
   - Should see: "Waiting for X images to load..."
   - Should see: "All images loaded successfully"

### Test 3: Different Photo Sources (Optional)

Test with photos from different sources:

1. **Uploaded Photos**
   - Upload photos via project data upload
   - Verify they display in preview and PDF

2. **Cropped Photos**
   - Use photos that were cropped in the system
   - Verify cropped versions display correctly

3. **Different Shapes**
   - Test circle masks
   - Test rounded rectangles
   - Test regular rectangles

## What to Look For

### ✅ Success Indicators
- Photos appear in preview mode
- Photos appear in generated PDFs
- Console shows successful loading messages
- No 404 errors in Network tab

### ❌ Failure Indicators
- Photos don't appear (blank spaces)
- Console shows error messages
- Network tab shows 404 errors for image URLs
- PDF has blank spaces where photos should be

## Troubleshooting

### Photos Still Not Showing?

1. **Check Backend is Running**
   ```
   Backend should be running on http://localhost:3001
   ```

2. **Check Photo URLs in Database**
   - Open browser console
   - Look for `[Preview]` or `[Batch]` logs
   - Verify URLs are correct
   - Example: `http://localhost:3001/uploads/project-photos/...`

3. **Check CORS Settings**
   - Backend must allow CORS from frontend
   - Check backend console for CORS errors

4. **Check Environment Variables**
   - Verify `.env` or `.env.local` has:
     ```
     VITE_API_URL=http://localhost:3001
     ```

5. **Check Photo Files Exist**
   - Navigate to backend uploads folder
   - Verify photo files are actually there
   - Path: `backend/uploads/project-photos/[project-id]/`

### Console Logs to Check

**Good logs (working):**
```
[Preview] Loading photo for field "photo": http://localhost:3001/uploads/...
[Preview] Successfully loaded and applied photo for field "photo"

[Batch] Photo placeholder "photo" resolved URL: http://localhost:3001/...
[Batch] Successfully loaded photo for placeholder "photo"
[Batch] Waiting for 3 images to load...
[Batch] All images loaded successfully
```

**Bad logs (not working):**
```
[Preview] Failed to load photo for field "photo": Error: ...
[Batch] No photo URL found for placeholder: photo
Failed to load image: 404 Not Found
```

## Quick Fixes

### If photos still don't show:

1. **Hard Refresh Browser**
   - Press Ctrl+Shift+R (Windows/Linux)
   - Or Cmd+Shift+R (Mac)

2. **Clear Browser Cache**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

3. **Restart Backend**
   ```bash
   cd backend
   npm start
   ```

4. **Restart Frontend**
   ```bash
   npm run dev
   ```

## Need Help?

If photos still don't display after following this guide:

1. Open browser console (F12)
2. Copy all `[Preview]` or `[Batch]` log messages
3. Check Network tab for failed image requests
4. Take screenshot of the issue
5. Share logs and screenshots for further debugging

## Summary

The fix ensures that:
- ✅ All photo URLs are properly resolved with backend base URL
- ✅ All photo types (variable, placeholder, masked) are supported
- ✅ Comprehensive error logging helps debug issues
- ✅ Both preview mode and batch PDF generation work correctly
