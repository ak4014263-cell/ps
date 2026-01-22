# Bulk Background Removal - Testing Guide

## Quick Start Test (5 minutes)

### Prerequisites
- [ ] Rembg microservice running on localhost:5000
- [ ] React app running
- [ ] Browser console open (F12)

### Test Steps

1. **Verify Service Health**
   ```bash
   # In terminal
   curl http://localhost:5000/health
   
   # Expected response:
   # {"status":"ok"}
   ```

2. **Open Template Designer**
   - Navigate to the template designer page
   - Click "Upload Photos" button
   - Bulk photo upload dialog should appear

3. **Enable Background Removal**
   - Toggle "Remove Background (Cloudinary AI)" switch
   - Should show enabled state (blue/active)

4. **Upload Test Images**
   - Click "Select Photos"
   - Choose 5-10 test images (JPG, PNG preferred)
   - Note the count in the dialog

5. **Start Upload**
   - Click "Upload N Photos" button
   - Watch the progress bar:
     - 0-50%: Background removal processing
     - 50-100%: Cloudinary upload
   - Total time for 10 images: ~10-30 seconds

6. **Verify Results**
   - Toast notification should show success message
   - Check "Uploaded N photos" count
   - Inspect browser network tab for API calls

### Browser Console Checks

Open browser console (F12) and look for:

✅ **Expected Logs:**
```
✓ Rembg microservice is healthy
Background removal configured: {provider: 'rembg-local'}
Batch processing completed with 0 errors
```

❌ **If You See These Errors:**
```
"Could not connect to rembg microservice"
→ Check if service is running: python launcher.py

"rembg API URL not configured"
→ Check src/main.tsx has configureBackgroundRemoval() call

"Failed to process image"
→ Check rembg service logs for processing errors

"Failed to remove backgrounds"
→ May indicate service overload; retry with smaller batch
```

## Detailed Test Scenarios

### Scenario 1: Single Image Background Removal
**Purpose:** Verify basic functionality works

1. Upload 1 image
2. Enable background removal
3. Click upload
4. **Expected:** Image processed in ~1-2 seconds
5. **Verify:** In database, image URL should exist with transparent background

### Scenario 2: Batch Processing (Medium)
**Purpose:** Test concurrency handling

1. Prepare 50 images in a ZIP file
2. Upload ZIP with background removal enabled
3. Monitor progress
4. **Expected:** 
   - Progress shows both phases (0-50%, 50-100%)
   - Total time: 30-60 seconds
   - ~1-2 images/second throughput
5. **Verify:** Check 5-10 random images in database have URLs

### Scenario 3: Large Batch (Performance Test)
**Purpose:** Test with realistic volume

1. Prepare 500-1000 images
2. Upload with background removal enabled
3. Monitor resource usage (CPU, memory)
4. **Expected:** 
   - Consistent processing rate
   - No memory issues
   - All images processed successfully
5. **Verify:** Count successful uploads in database

### Scenario 4: Mixed Format Images
**Purpose:** Test format compatibility

1. Gather: JPG, PNG, WebP images
2. Put in ZIP file
3. Upload with background removal
4. **Expected:** All formats processed successfully
5. **Verify:** All images in database with correct formats preserved

### Scenario 5: Error Handling
**Purpose:** Test graceful failure

1. Stop rembg microservice (`Ctrl+C`)
2. Try to upload images with background removal enabled
3. **Expected:** 
   - Error toast: "Background removal not available"
   - Dialog stays open
   - Can retry after restarting service
4. **Verify:** Service restart works smoothly

### Scenario 6: Progress Tracking
**Purpose:** Verify progress bar accuracy

1. Upload 100 images
2. Note timestamps at various progress points
3. **Expected:**
   - 50% mark when background removal completes
   - Linear progress during upload phase
   - 100% correlates with completion
4. **Verify:** Math checks out: time/progress ratio consistent

## Network Tab Analysis

Open Browser DevTools → Network tab to see:

### Expected API Calls

1. **Multiple requests to `localhost:5000/remove-bg`**
   - Method: POST
   - Content-Type: multipart/form-data
   - Response: Binary PNG image data
   - Status: 200 OK
   - Count: Number of images being processed

2. **Multiple requests to Cloudinary**
   - Method: POST
   - Via Supabase edge function
   - Response: JSON with URL and publicId
   - Status: 200 OK

3. **Multiple POST requests to Supabase**
   - Updating data_records table
   - Setting photo_url field
   - Status: 200 OK

### Filtering in Network Tab
```
Filter: /remove-bg
→ Should show concurrent requests (up to 5)

Filter: cloudinary
→ Should show upload requests (up to 10 concurrent)

Filter: data_records
→ Should show database updates
```

## Performance Benchmarks

### Single Image (Baseline)
```
Image Size: 5MB (typical photo)
Processing Time: 500-800ms
Upload Time: 200-500ms
Total: ~1-1.5 seconds
```

### Batch of 100 Images
```
Background Removal: ~50 seconds (concurrent: 5)
Upload: ~10-15 seconds (concurrent: 10)
Total: ~60-65 seconds

Rate: ~1.5-2 images/second
```

### Batch of 1000 Images
```
Background Removal: ~500 seconds (8 minutes)
Upload: ~100-150 seconds (2-2.5 minutes)
Total: ~10-11 minutes

Rate: ~1.5-2 images/second (consistent)
```

## Debugging Checklist

Before reporting issues, verify:

- [ ] Rembg service is running and responding to health check
- [ ] React app is configured with correct rembg API URL
- [ ] Images are in supported format (JPG, PNG, WebP)
- [ ] Browser console shows "Rembg microservice is healthy"
- [ ] Network tab shows successful `/remove-bg` requests
- [ ] Cloudinary uploads are succeeding
- [ ] Database records are being updated
- [ ] Sufficient disk space and memory available
- [ ] No firewall blocking localhost connections

## Common Issues & Solutions

### Issue: "TypeError: Cannot read property 'removeBackgroundBatch'"

**Cause:** Function not imported or exported correctly

**Solution:**
1. Check `src/lib/backgroundRemoval.ts` has `export` keyword
2. Check `PhotoMatchDialog.tsx` imports function
3. Rebuild: Ctrl+Shift+P → "TypeScript: Restart TS Server"

### Issue: Progress bar jumps to 100% immediately

**Cause:** Background removal is skipped or very fast

**Check:**
1. Is "Remove Background" toggle enabled?
2. Check browser console for configuration
3. Is rembg service actually processing?

### Issue: Only first few images process then stops

**Cause:** Concurrent request limit or timeout

**Solution:**
1. Reduce `maxConcurrent` from 5 to 3
2. Increase request timeout in code
3. Check service logs for errors

### Issue: Images upload but backgrounds not removed

**Cause:** Background removal function not being called

**Debug:**
1. Check browser console for errors
2. Enable verbose logging in backgroundRemoval.ts
3. Check network tab for `/remove-bg` requests
4. Verify `removeBackground` toggle is ON

## Manual Testing Script

```javascript
// Paste in browser console to test:

// Test 1: Verify configuration
const config = (await import('/src/lib/backgroundRemoval.ts')).getBackgroundRemovalConfig();
console.log('Config:', config);

// Test 2: Test single image batch
const { removeBackgroundBatch } = await import('/src/lib/backgroundRemoval.ts');
const testBlob = await fetch('https://via.placeholder.com/100').then(r => r.blob());
const result = await removeBackgroundBatch([testBlob]);
console.log('Result:', result);

// Test 3: Check service health
const health = await fetch('http://localhost:5000/health').then(r => r.json());
console.log('Service health:', health);
```

## Monitoring Tools

### Check Rembg Service Status
```bash
# Terminal 1: Run service
cd rembg-microservice
python launcher.py

# Terminal 2: Monitor requests
# Look for "POST /remove-bg" in logs
# Check for "200 OK" responses
```

### Monitor Browser Performance
1. DevTools → Performance tab
2. Record while processing
3. Look for:
   - Network requests (peaks at file boundaries)
   - JavaScript execution (should be <16ms per frame)
   - Memory (should not spike > 500MB)

## Success Criteria

✅ **Test Passed If:**
- [ ] 0-50% phase shows background removal processing
- [ ] 50-100% phase shows upload progress
- [ ] Success toast displays uploaded count
- [ ] Network tab shows `/remove-bg` requests
- [ ] Database records updated with photo URLs
- [ ] No errors in browser console
- [ ] Processing rate is 1-2 images/second
- [ ] All images have transparent backgrounds

❌ **Test Failed If:**
- [ ] Background removal toggle doesn't work
- [ ] No network requests to `/remove-bg`
- [ ] Error toast displayed
- [ ] Database records not updated
- [ ] Images don't have transparent backgrounds

## Performance Optimization

If processing seems slow:

1. **Check Rembg Service CPU Usage**
   ```bash
   # On Windows, open Task Manager
   # Look for "Python" process using rembg-microservice
   # Should use 80-100% CPU during processing
   ```

2. **Check Network Bottleneck**
   - Look at response times in Network tab
   - Each request should complete in <1-2 seconds
   - If slower, check network connection

3. **Optimize Batch Size**
   - Try reducing `maxConcurrent` to 3
   - Or increasing to 8 if CPU is available

4. **Image Quality vs Speed**
   - Compress images before uploading
   - Reduce image dimensions if possible
   - This speeds up processing ~2x

## Logs to Enable Debugging

Add to `src/lib/backgroundRemoval.ts`:

```typescript
// Add verbose logging
if (removalConfig.provider === 'rembg-local') {
  console.log(`[REMBG] Processing batch of ${blobs.length} images, max concurrent: ${maxConcurrent}`);
  console.log(`[REMBG] API URL: ${removalConfig.apiUrl}/remove-bg`);
}
```

## Next Steps

After passing tests:

1. ✅ Read [BULK_BACKGROUND_REMOVAL.md](BULK_BACKGROUND_REMOVAL.md) for full documentation
2. ✅ Check [REMBG_IMPLEMENTATION.md](REMBG_IMPLEMENTATION.md) for architecture
3. ✅ Review [rembg-microservice/README.md](rembg-microservice/README.md) for service details
4. ✅ Monitor production usage for performance metrics

