// Supabase disconnected - using XAMPP MySQL

/**
 * Configuration for background removal services
 */
interface RemovalConfig {
  provider: 'rembg-local' | 'rembg-cloud' | 'removebg-api';
  apiUrl?: string; // For self-hosted rembg or other endpoints
  apiKey?: string; // For remote APIs
}

let removalConfig: RemovalConfig = {
  provider: 'removebg-api', // Default to existing API
};

/**
 * Configure background removal provider
 * Use 'rembg-local' for self-hosted microservice (recommended for bulk processing)
 * 
 * @example
 * configureBackgroundRemoval({
 *   provider: 'rembg-local',
 *   apiUrl: 'http://localhost:5000' // Your rembg microservice URL
 * });
 */
export function configureBackgroundRemoval(config: Partial<RemovalConfig>): void {
  removalConfig = { ...removalConfig, ...config };
  console.log('Background removal configured:', { provider: removalConfig.provider });
}

/**
 * Remove background from an image using the configured provider
 * Supports both cloud APIs and self-hosted rembg microservice
 * 
 * @param imageUrl - URL of the image or data URL
 * @returns Promise<string> - Data URL of the processed image with background removed
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  switch (removalConfig.provider) {
    case 'rembg-local':
    case 'rembg-cloud':
      return removeBackgroundViaRembg(imageUrl);
    case 'removebg-api':
    default:
      return removeBackgroundViaSupabaseEdgeFunction(imageUrl);
  }
}

/**
 * Remove background using the backend proxy endpoint
 * Fallback when rembg microservice is unavailable
 */
async function removeBackgroundViaBackend(imageUrl: string): Promise<string> {
  // Convert URL to blob
  let imageBlob: Blob;
  
  if (imageUrl.startsWith('data:')) {
    const response = await fetch(imageUrl);
    imageBlob = await response.blob();
  } else {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    imageBlob = await response.blob();
  }

  console.log(`[removeBackgroundViaBackend] Sending image to backend:`, {
    blobSize: imageBlob.size,
    blobType: imageBlob.type,
  });

  // Send to backend
  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');

  try {
    const response = await fetch('http://localhost:3001/api/image/remove-bg-queue', {
      method: 'POST',
      body: formData,
    });

    console.log(`[removeBackgroundViaBackend] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[removeBackgroundViaBackend] Backend removal error:', errorText);
      throw new Error('Failed to remove background via backend: ' + (errorText || response.statusText));
    }

    // Convert response to data URL
    const resultBlob = await response.blob();
    console.log(`[removeBackgroundViaBackend] Received response blob:`, {
      size: resultBlob.size,
      type: resultBlob.type
    });

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('[removeBackgroundViaBackend] Successfully converted to data URL');
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(resultBlob);
    });
  } catch (error) {
    console.error('[removeBackgroundViaBackend] Backend error:', error);
    throw error;
  }
}

/**
 * Remove background using self-hosted or cloud rembg microservice
 * Best for high-volume bulk processing (e.g., 500k+ images)
 * Zero cost when self-hosted
 */
async function removeBackgroundViaRembg(imageUrl: string): Promise<string> {
  if (!removalConfig.apiUrl) {
    throw new Error('rembg API URL not configured. Set it via configureBackgroundRemoval()');
  }

  // Convert URL to blob
  let imageBlob: Blob;
  
  if (imageUrl.startsWith('data:')) {
    const response = await fetch(imageUrl);
    imageBlob = await response.blob();
  } else {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    imageBlob = await response.blob();
  }

  console.log(`[removeBackgroundViaRembg] Sending image to ${removalConfig.apiUrl}/remove-bg:`, {
    blobSize: imageBlob.size,
    blobType: imageBlob.type,
    blobName: 'image.png'
  });

  // Send to rembg microservice
  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');

  try {
    const response = await fetch(`${removalConfig.apiUrl}/remove-bg`, {
      method: 'POST',
      body: formData,
      // Let browser handle headers automatically for FormData
      // Don't set Content-Type header manually (browser will set it with boundary)
    });

    console.log(`[removeBackgroundViaRembg] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[removeBackgroundViaRembg] Rembg removal error:', errorText);
      
      // Fallback to backend if rembg microservice is unavailable
      if (response.status === 404 || response.status === 500 || response.status === 503) {
        console.log('[removeBackgroundViaRembg] Rembg service unavailable, falling back to backend');
        return removeBackgroundViaBackend(imageUrl);
      }
      
      throw new Error('Failed to remove background via rembg: ' + (errorText || response.statusText));
    }

    // Convert response to data URL
    const resultBlob = await response.blob();
    console.log(`[removeBackgroundViaRembg] Received response blob:`, {
      size: resultBlob.size,
      type: resultBlob.type
    });

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('[removeBackgroundViaRembg] Successfully converted to data URL');
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(resultBlob);
    });
  } catch (error) {
    console.error('[removeBackgroundViaRembg] Rembg API error:', error);
    throw error;
  }
}

async function removeBackgroundViaSupabaseEdgeFunction(imageUrl: string): Promise<string> {
  // Supabase edge function disabled - backend not yet implemented
  // TODO: Create POST /api/remove-bg endpoint
  console.log('[STUB] Background removal via edge function (disabled)');
  throw new Error('Background removal not yet implemented - use rembg microservice instead');
}

/**
 * Initialize background remover
 * For rembg, this verifies connectivity to the microservice
 */
export async function initBackgroundRemover(): Promise<void> {
  if (removalConfig.provider.startsWith('rembg')) {
    if (!removalConfig.apiUrl) {
      console.warn('Rembg provider selected but no API URL configured');
      return;
    }
    
    try {
      const response = await fetch(`${removalConfig.apiUrl}/health`, {
        method: 'GET',
      });
      if (response.ok) {
        console.log('✓ Rembg microservice is healthy');
      } else {
        console.warn('Rembg microservice health check failed');
      }
    } catch (error) {
      console.warn('Could not connect to rembg microservice:', error);
    }
  }
}

/**
 * Get current background removal configuration
 */
export function getBackgroundRemovalConfig(): RemovalConfig {
  return { ...removalConfig };
}

/**
 * Result of batch background removal with index tracking
 */
export interface BatchProcessResult {
  index: number;
  blob: Blob;
}

/**
 * Remove background from multiple images in batch
 * Optimized for bulk processing with rembg microservice
 * Returns results with original indices so caller can track which images succeeded
 * 
 * @param blobs - Array of image blobs to process
 * @param maxConcurrent - Maximum concurrent requests (default: 5)
 * @returns Promise<BatchProcessResult[]> - Array of {index, blob} for successfully processed images
 */
export async function removeBackgroundBatch(
  blobs: Blob[],
  maxConcurrent: number = 5
): Promise<BatchProcessResult[]> {
  if (removalConfig.provider !== 'rembg-local' && removalConfig.provider !== 'rembg-cloud') {
    throw new Error('Batch background removal only supported with rembg provider');
  }

  if (!removalConfig.apiUrl) {
    throw new Error('rembg API URL not configured. Set it via configureBackgroundRemoval()');
  }

  console.log(`[removeBackgroundBatch] Processing ${blobs.length} images with ${maxConcurrent} concurrent requests`);

  // Prefer the microservice batch endpoint which accepts multiple files in one request.
  try {
    const formData = new FormData();
    blobs.forEach((blob, idx) => {
      formData.append('images', blob, `image-${idx}.png`);
    });

    console.log(`[removeBackgroundBatch] Sending to ${removalConfig.apiUrl}/remove-bg-batch`);

    const resp = await fetch(`${removalConfig.apiUrl}/remove-bg-batch`, {
      method: 'POST',
      body: formData,
    });

    console.log(`[removeBackgroundBatch] Batch response status: ${resp.status} ${resp.statusText}`);

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[removeBackgroundBatch] Batch endpoint error: ${text || resp.statusText}`);
      throw new Error(`Batch endpoint failed: ${text || resp.statusText}`);
    }

    const json = await resp.json();
    console.log(`[removeBackgroundBatch] Batch response received:`, {
      total: json.total,
      successful: json.successful,
      failed: json.failed,
      resultsLength: json.results?.length
    });

    // Process results array - the microservice returns results with their original indices
    const results: BatchProcessResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    if (Array.isArray(json.results) && json.results.length > 0) {
      const fetchPromises = json.results.map(async (r: any) => {
        try {
          if (r && r.dataUrl && typeof r.index === 'number') {
            const bresp = await fetch(r.dataUrl);
            if (!bresp.ok) {
              throw new Error(`Failed to fetch blob: ${bresp.statusText}`);
            }
            const blob = await bresp.blob();
            if (!blob || blob.size === 0) {
              throw new Error('Received empty blob');
            }
            successCount++;
            console.log(`[removeBackgroundBatch] Successfully converted result at index ${r.index} (${blob.size} bytes)`);
            return { success: true, index: r.index, blob };
          } else {
            throw new Error(`Missing dataUrl or index in result`);
          }
        } catch (fetchErr) {
          const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          console.error(`[removeBackgroundBatch] Failed to fetch blob for index ${r?.index}: ${errMsg}`);
          errorCount++;
          return { success: false, index: r?.index };
        }
      });

      const fetchResults = await Promise.all(fetchPromises);
      for (const result of fetchResults) {
        if (result.success && result.blob !== undefined) {
          results.push({ index: result.index, blob: result.blob });
        }
      }
    }

    // Log errors if any were reported by microservice
    if (Array.isArray(json.errors) && json.errors.length > 0) {
      console.warn(`[removeBackgroundBatch] Microservice reported ${json.errors.length} errors:`, json.errors);
      errorCount += json.errors.length;
    }

    console.log(`[removeBackgroundBatch] Processing complete: ${successCount} succeeded, ${errorCount} failed out of ${blobs.length} total`);

    if (results.length === 0) {
      throw new Error(`No images were successfully processed (0/${blobs.length})`);
    }

    console.log(`[removeBackgroundBatch] Returning ${results.length}/${blobs.length} processed blobs`);
    return results;
  } catch (err) {
    // Fallback: previous per-file approach (keeps existing behavior if batch endpoint unavailable)
    console.warn('[removeBackgroundBatch] Batch endpoint failed, falling back to per-file requests:', err);

    const results: BatchProcessResult[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < blobs.length; i += maxConcurrent) {
      const batchBlobs = blobs.slice(i, i + maxConcurrent);
      const batchPromises = batchBlobs.map(async (blob, index) => {
        try {
          const formData = new FormData();
          formData.append('image', blob, `image-${i + index}.png`);

          const response = await fetch(`${removalConfig.apiUrl}/remove-bg`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`${errText || response.statusText}`);
          }

          const resultBlob = await response.blob();
          if (!resultBlob || resultBlob.size === 0) {
            throw new Error('Received empty blob from rembg');
          }
          console.log(`[removeBackgroundBatch-fallback] Successfully processed image at index ${i + index} (${resultBlob.size} bytes)`);
          return { success: true, blob: resultBlob, index: i + index };
        } catch (error) {
          const err = error instanceof Error ? error.message : String(error);
          errors.push(new Error(`Image ${i + index}: ${err}`));
          console.error(`[removeBackgroundBatch-fallback] Error processing image ${i + index}: ${err}`);
          return { success: false, error: err, index: i + index };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const result of batchResults) {
        if (result.success && result.blob) {
          results.push({ index: result.index, blob: result.blob });
        }
      }
    }

    if (errors.length > 0) {
      console.warn(`[removeBackgroundBatch-fallback] Batch processing completed with ${errors.length} errors out of ${blobs.length} total`);
    }

    console.log(`[removeBackgroundBatch-fallback] Returning ${results.length}/${blobs.length} processed blobs`);

    if (results.length === 0) {
      throw new Error(`All ${blobs.length} images failed to process in fallback mode`);
    }

    return results;
  }
}

/**
 * Remove background from multiple image blobs and convert to data URLs
 * Convenience function for UI components that need data URLs
 * 
 * @param blobs - Array of image blobs
 * @param maxConcurrent - Maximum concurrent requests
 * @returns Promise<{index: number, dataUrl: string}[]> - Array of {index, dataUrl} for successfully processed images
 */
export async function removeBackgroundBatchDataUrls(
  blobs: Blob[],
  maxConcurrent: number = 5
): Promise<{index: number, dataUrl: string}[]> {
  const processedBlobs = await removeBackgroundBatch(blobs, maxConcurrent);
  
  return Promise.all(
    processedBlobs.map(({ index, blob }) => 
      new Promise<{index: number, dataUrl: string}>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ index, dataUrl: reader.result as string });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
    )
  );
}

