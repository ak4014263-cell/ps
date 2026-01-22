# AI Image Background Remover - Quick Reference

## ✅ What's Working Now

The **"AI Image Background Remover"** option is now fully functional in the Selected Actions dropdown menu.

---

## How to Use

### Step 1: Start Rembg Service
```bash
cd rembg-microservice
python -m uvicorn app:app --reload --port 5000
```

### Step 2: Select Records
1. Go to **Data Records** tab
2. Check boxes next to records with photos
3. Selected count shows at top

### Step 3: Remove Backgrounds
1. Click **Selected Actions** dropdown
2. Choose **AI Image Background Remover**
3. Processing starts automatically
4. Progress bar shows 0-100%

### Step 4: Monitor Progress
- **Browser console (F12):** Shows detailed logs
- **Toast notification:** Shows result (success/error)
- **Progress bar:** Shows percentage complete
- **Microservice logs:** Shows processing details

---

## Menu Item Details

**Location:** Selected Actions dropdown (appears when records selected)

**Options:**
- ✅ Assign to Group
- ✅ AI Image Crop
- ✅ **AI Image Background Remover** ← NEW
- ✅ Delete

**Disabled When:**
- No records selected
- Background removal in progress

**Shows During Processing:**
- Spinner icon
- "Removing BG... X%" with percentage

---

## What Happens During Processing

1. **Validation** (~0.5s)
   - Check rembg is running
   - Verify records have photos
   - Health check on microservice

2. **Photo Fetching** (~1-2s per photo)
   - Download photos from storage
   - Validate image format

3. **Face Detection & Cropping** (~2-3s per photo)
   - Auto-detect faces
   - Crop to 600x400 (ID card mode)
   - Upload cropped to Cloudinary

4. **Background Removal** (~1-2s per photo)
   - Send to rembg AI
   - Receive PNG with transparency
   - Process with microservice

5. **Upload & Save** (~1s per photo)
   - Upload processed to Cloudinary
   - Update database record
   - Update UI

---

## Expected Results

After processing, each record's photo will have:
- ✅ Transparent background (PNG format)
- ✅ Face cropped to standard size
- ✅ High quality processing
- ✅ Cloudinary URL saved

---

## Error Messages & Fixes

| Message | Fix |
|---------|-----|
| "service not available" | Start rembg: `python -m uvicorn app:app --reload --port 5000` |
| "Selected records have no photos" | Upload photos first, reload page |
| "Could not fetch photos" | Check photo URLs in database |
| "rembg returned no processed blobs" | Check microservice logs |
| "Failed to upload" | Check Cloudinary credentials |

---

## Monitoring

### Browser Console (F12 > Console Tab)
Look for logs:
```
[BG Removal] Rembg service is healthy
[BG Removal] Starting for X records with photos
[BG Removal] Successfully fetched X/X photos
[BG Removal] Processing X photos with removeBackgroundBatch...
[BG Removal] Received X processed blobs from rembg
[BG Removal] SUCCESS: X/X photos processed
```

### Microservice Terminal
Look for:
```
[/remove-bg] Received request: filename=..., content_type=..., size=...
[/remove-bg] Successfully processed image: ..., output_size=...
```

---

## Performance Expectations

- **1 photo:** ~5-10 seconds
- **10 photos:** ~1-2 minutes
- **100 photos:** ~15-20 minutes

Times include: detection, cropping, upload, and database update

---

## Requirements

- ✅ Rembg microservice running on localhost:5000
- ✅ Cloudinary API credentials configured
- ✅ Records have valid photo URLs or image data
- ✅ Backend API accessible
- ✅ Network connectivity

---

## Verification

To verify everything is working:

```bash
# 1. Check rembg health
curl http://localhost:5000/health

# Expected: {"status": "healthy", ...}

# 2. Test with one record
# Select 1 record, click AI Image Background Remover

# 3. Check browser console (F12)
# Should see [BG Removal] logs

# 4. Monitor progress
# Toast should show success after 5-20 seconds
```

---

## Files Modified

- `src/components/project/DataRecordsTable.tsx` - Added menu item

## Documentation

- `AI_IMAGE_BACKGROUND_REMOVER_GUIDE.md` - Full guide with troubleshooting
- `AI_BG_REMOVER_IMPLEMENTATION.md` - Implementation details
- `REMBG_400_ERROR_FIX.md` - Error diagnostics

---

## Quick Troubleshooting

**Not working?** Check in this order:

1. ✅ Rembg running: `curl http://localhost:5000/health`
2. ✅ Records selected: See badge at top
3. ✅ Browser console: F12 > Console for [BG Removal] logs
4. ✅ Microservice logs: Check terminal output
5. ✅ Cloudinary: Check upload credentials

---

## Contact Support

If issues persist, provide:
- Screenshot of error message
- Browser console logs (F12)
- Microservice terminal output
- Record IDs tested with

