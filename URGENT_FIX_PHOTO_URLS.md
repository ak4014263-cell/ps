# URGENT FIX - Photo URLs Loading from Wrong Port

## Problem
Photos are being requested from `:8080` (frontend) instead of `:3001` (backend):
```
❌ http://localhost:8080/uploads/project-photos/...  (WRONG - 404 Error)
✅ http://localhost:3001/uploads/project-photos/...  (CORRECT)
```

## Root Cause
The code changes need the dev server to restart to take effect. Vite's Hot Module Replacement (HMR) doesn't always pick up changes to environment variable usage.

## Quick Fix (2 steps)

### Step 1: Hard Refresh Browser
Press **Ctrl + Shift + R** (or **Cmd + Shift + R** on Mac)

This will:
- Clear the browser cache
- Reload all JavaScript modules
- Pick up the latest code changes

### Step 2: If Step 1 Doesn't Work - Restart Dev Server

**Option A: Restart in same terminal**
1. In the terminal running `npm run dev`
2. Press `Ctrl + C` to stop
3. Run `npm run dev` again
4. Wait for "ready" message
5. Refresh browser

**Option B: Quick restart command**
```powershell
# Stop the current dev server (Ctrl+C in the terminal)
# Then run:
npm run dev
```

## Verification

After refreshing/restarting, check browser console:

### ✅ Good (Working):
```
[BatchPDF] Resolved photo URL for record xxx: http://localhost:3001/uploads/...
[Preview] Loading photo for field "photo": http://localhost:3001/uploads/...
```

### ❌ Bad (Still broken):
```
Failed to load resource: http://localhost:8080/uploads/...
```

## What Was Fixed

1. **Changed hardcoded URL to use environment variable**
   ```typescript
   // Before:
   const backendBase = 'http://localhost:3001';
   
   // After:
   const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
   ```

2. **Fixed photo URL mapping**
   - Now all photo fields (photo, profilePic, photo_url, cropped_photo_url) use the resolved URL
   - Added logging to track URL resolution

3. **Added comprehensive URL resolution**
   - Handles relative paths: `/uploads/...` → `http://localhost:3001/uploads/...`
   - Handles partial paths: `photo.jpg` → `http://localhost:3001/uploads/project-photos/[id]/photo.jpg`
   - Preserves absolute URLs and data URLs

## Testing After Fix

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Load project data** in Batch PDF panel
4. **Look for logs** like:
   ```
   [BatchPDF] Resolved photo URL for record abc123: http://localhost:3001/uploads/...
   ```
5. **Check Network tab**
   - Should see requests to `localhost:3001` (not 8080)
   - Should get 200 OK responses (not 404)

## Still Not Working?

### Check 1: Environment Variable
Verify `.env.local` has:
```
VITE_API_URL=http://localhost:3001
```

### Check 2: Backend is Running
Verify backend is running on port 3001:
```powershell
# Should see "Server running on port 3001"
```

### Check 3: Photos Exist
Check if photos actually exist:
```
backend/uploads/project-photos/[project-id]/[photo-file].jpg
```

### Check 4: Clear All Caches
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Check 5: Restart Everything
```powershell
# Terminal 1 - Stop and restart frontend
Ctrl+C
npm run dev

# Terminal 2 - Stop and restart backend  
Ctrl+C
npm start
```

## Why This Happened

The original code had:
- Hardcoded `localhost:3001` in one place
- But the photo URLs weren't being fully resolved when loaded from database
- The browser defaulted to using the current origin (8080) for relative URLs

The fix ensures:
- ✅ All URLs use the environment variable
- ✅ All photo URLs are fully resolved with backend base
- ✅ Comprehensive logging for debugging
- ✅ Consistent URL handling across all photo types

## Next Steps

1. **Hard refresh browser** (Ctrl+Shift+R)
2. **Check console logs** for `[BatchPDF]` messages
3. **Verify photos load** from `localhost:3001`
4. **If still broken**, restart dev server
5. **If still broken**, check the troubleshooting steps above
