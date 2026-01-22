import { configureBackgroundRemoval, initBackgroundRemover, removeBackground } from '@/lib/backgroundRemoval';
import { useEffect } from 'react';

/**
 * REMBG Integration Guide for React App
 * 
 * This example shows how to integrate self-hosted rembg background removal
 * into your React application with fallback to cloud API.
 */

// ============================================================================
// 1. SETUP: Initialize rembg on app startup
// ============================================================================

export function useRemBgSetup() {
  useEffect(() => {
    // Try to connect to local rembg microservice
    const initializeBackgroundRemoval = async () => {
      try {
        // Configure to use local rembg (self-hosted)
        configureBackgroundRemoval({
          provider: 'rembg-local',
          apiUrl: process.env.REACT_APP_REMBG_URL || 'http://localhost:5000'
        });

        // Verify the service is running
        await initBackgroundRemover();
        console.log('✓ Background removal service initialized (rembg-local)');
      } catch (error) {
        console.warn(
          'Local rembg service unavailable, will fallback to cloud API:',
          error
        );

        // Fallback to cloud API
        configureBackgroundRemoval({
          provider: 'removebg-api'
        });
        console.log('⚠ Falling back to cloud API (remove.bg)');
      }
    };

    initializeBackgroundRemoval();
  }, []);
}

// ============================================================================
// 2. USAGE: In your component
// ============================================================================

/**
 * Example: Background removal in a photo editor component
 */
export async function removeImageBackground(imageUrl: string): Promise<string> {
  try {
    console.log('Removing background from image...');

    // Call the unified removeBackground function
    // It automatically uses configured provider (local rembg or cloud API)
    const processedUrl = await removeBackground(imageUrl);

    console.log('✓ Background removed successfully');
    return processedUrl;
  } catch (error) {
    console.error('Failed to remove background:', error);
    throw new Error('Failed to remove background. Please try again.');
  }
}

// ============================================================================
// 3. ADVANCED: With retry and fallback logic
// ============================================================================

/**
 * Remove background with automatic fallback
 * Tries local rembg first, falls back to cloud if needed
 */
export async function removeBackgroundWithFallback(
  imageUrl: string
): Promise<string> {
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Removing background...`);

      const processedUrl = await removeBackground(imageUrl);

      console.log('✓ Background removed successfully');
      return processedUrl;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      // On first failure, try fallback to cloud
      if (attempt === 1) {
        console.log('Local service failed, trying cloud API...');

        try {
          // Switch to cloud provider
          configureBackgroundRemoval({
            provider: 'removebg-api'
          });

          // Try again with cloud
          const processedUrl = await removeBackground(imageUrl);
          console.log('✓ Background removed via cloud API');
          return processedUrl;
        } catch (cloudError) {
          console.error('Cloud API also failed:', cloudError);
          // Continue to final error below
        }
      }
    }
  }

  // All attempts exhausted
  throw new Error('All background removal attempts failed');
}

// ============================================================================
// 4. BATCH: Process multiple images
// ============================================================================

/**
 * Process multiple images with progress tracking
 * Useful for bulk import/processing workflows
 */
export async function removeBackgroundBatch(
  imageUrls: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const url = imageUrls[i];
      const processed = await removeBackground(url);
      results.push(processed);

      onProgress?.(i + 1, imageUrls.length);
    } catch (error) {
      console.error(`Failed to process image ${i}:`, error);
      // Continue with next image instead of stopping
      results.push(imageUrls[i]); // Keep original if processing fails
    }
  }

  return results;
}

// ============================================================================
// 5. ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Add to your .env file:
 * 
 * # Local rembg microservice URL (for development)
 * REACT_APP_REMBG_URL=http://localhost:5000
 * 
 * # Production rembg URL (through reverse proxy)
 * # REACT_APP_REMBG_URL=https://api.yourdomain.com/rembg
 */

// ============================================================================
// 6. COMPONENT EXAMPLE: Photo Editor with Background Removal
// ============================================================================

/*
Example component using rembg:

import React, { useState } from 'react';
import { removeBackground } from '@/lib/backgroundRemoval';
import { toast } from 'sonner';

export function PhotoEditor() {
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleRemoveBackground = async () => {
    if (!image) return;

    setProcessing(true);
    try {
      const processedImage = await removeBackground(image);
      setImage(processedImage);
      toast.success('Background removed');
    } catch (error) {
      toast.error('Failed to remove background');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <img src={image} alt="Preview" />
      <button
        onClick={handleRemoveBackground}
        disabled={processing}
      >
        {processing ? 'Processing...' : 'Remove Background'}
      </button>
    </div>
  );
}
*/

// ============================================================================
// 7. CONFIGURATION: Available Options
// ============================================================================

/**
 * Switch between providers:
 * 
 * // Use local self-hosted rembg (recommended for bulk processing)
 * configureBackgroundRemoval({
 *   provider: 'rembg-local',
 *   apiUrl: 'http://your-server:5000'
 * });
 * 
 * // Use cloud remove.bg API (for individual images, has unit cost)
 * configureBackgroundRemoval({
 *   provider: 'removebg-api'
 * });
 * 
 * // Use cloud rembg (if deployed to cloud)
 * configureBackgroundRemoval({
 *   provider: 'rembg-cloud',
 *   apiUrl: 'https://your-cloud-server.com'
 * });
 */

// ============================================================================
// 8. PERFORMANCE METRICS
// ============================================================================

/**
 * Expected processing times:
 * 
 * Local rembg (CPU):
 * - u2net: 8-10 seconds/image
 * - u2netp: 5-7 seconds/image
 * - siluette: 2-3 seconds/image
 * 
 * Local rembg (GPU - NVIDIA RTX 3080):
 * - u2net: 0.5 seconds/image
 * - u2netp: 0.3 seconds/image
 * - siluette: 0.2 seconds/image
 * 
 * 500,000 images:
 * - GPU: ~2-4 days
 * - CPU: ~2-3 weeks
 * - Cost: $0 (vs $1000+ with cloud API)
 */

// ============================================================================
// 9. MONITORING & DEBUGGING
// ============================================================================

import { getBackgroundRemovalConfig } from '@/lib/backgroundRemoval';

/**
 * Check current configuration and service status
 */
export function checkBackgroundRemovalStatus() {
  const config = getBackgroundRemovalConfig();
  console.log('Background Removal Status:', {
    provider: config.provider,
    apiUrl: config.apiUrl,
    configured: true
  });

  // Health check
  if (config.apiUrl) {
    fetch(`${config.apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => {
        console.log('✓ Service healthy:', data);
      })
      .catch((error) => {
        console.error('✗ Service unavailable:', error);
      });
  }
}

/**
 * Export for debugging
 */
export const RemBgDebug = {
  checkStatus: checkBackgroundRemovalStatus,
  removeBackground,
  removeBackgroundWithFallback,
  removeBackgroundBatch
};

// Usage in browser console:
// window.RemBgDebug.checkStatus()
// window.RemBgDebug.removeBackground(imageUrl)
