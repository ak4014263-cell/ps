# Face Crop 404 Fix - Root Cause Analysis

## Problem
Face crop feature was failing with 404 error when trying to fetch photos.

## Root Cause (Finally!)
Photos are **not stored in a flat `uploads/photos/` directory**. They are organized by project:

```
❌ WRONG: /uploads/photos/photo_[id]_[timestamp].jpg → 404 (directory doesn't have photos)
✓ CORRECT: /uploads/project-photos/[projectId]/photo_[id]_[timestamp].jpg
```

## Investigation Path
1. ✓ Initially fixed URL construction (assumed flat directory)
2. ✓ Backend save endpoint updated
3. ✗ Still getting 404 on specific records
4. **Found the issue**: Photos stored in project-specific subdirectories!
   - Query found: `photo_d5856e69...jpg` exists in `project-photos/89248ef9-cedd.../`
   - Was looking in wrong location: `photos/` (which only had older test files)

## Changes Made

### Frontend: [src/pages/ProjectDetails.tsx](src/pages/ProjectDetails.tsx#L810-L820)
**Before:**
```typescript
if (!photoUrl.includes('/')) {
  photoUrl = `/uploads/photos/${photoUrl}`;  // ❌ Wrong directory
}
```

**After:**
```typescript
if (!photoUrl.includes('/')) {
  const projId = record.project_id || projectId;
  photoUrl = `/uploads/project-photos/${projId}/${photoUrl}`;  // ✓ Project-specific
}
```

### Backend: [backend/routes/image-tools.js](backend/routes/image-tools.js#L240-L255)
**Before:**
```javascript
const publicUrl = `/uploads/photos/${photoFileName}`;  // ❌ Flat directory
```

**After:**
```javascript
const projectId = projectIdResults[0].project_id;
const publicUrl = `/uploads/project-photos/${projectId}/${photoFileName}`;  // ✓ Project-scoped
```

## Verification
```
✓ Photo accessible: http://localhost:3001/uploads/project-photos/89248ef9-.../photo_d5856e69...jpg
✓ Size: 61069 bytes
✓ Status: 200 OK
```

## Key Insight
The application uses a **multi-tenant architecture** where each project has its own storage:
- Each project has a UUID as the project ID
- Photos for a project stored in `/uploads/project-photos/[projectId]/`
- This allows easy per-project backups, migrations, and access control

## Now Working
The face crop feature should now:
1. ✓ Fetch photos from correct project directory
2. ✓ Process them with InsightFace
3. ✓ Save processed images to same project directory
4. ✓ Update database with correct URLs

## Test It
1. Go to a project with photos
2. Select a photo and click "Face Crop (AI)"
3. Check browser console - should see correct path logged:
   ```
   [Face Crop] Fetching image from: http://localhost:3001/uploads/project-photos/[projectId]/photo_...jpg
   ```
4. Should process without 404 error
