import { pipeline, env } from '@huggingface/transformers';

// Configure transformers to use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_DIMENSION = 1024;

// Passport photo size: 35mm x 45mm (Indian standard)
const PASSPORT_ASPECT_RATIO = 35 / 45;
const PASSPORT_OUTPUT_WIDTH = 413; // 35mm at 300 DPI
const PASSPORT_OUTPUT_HEIGHT = 531; // 45mm at 300 DPI

let faceDetector: any = null;
let initPromise: Promise<any> | null = null;

export async function initFaceDetector() {
  if (faceDetector) return faceDetector;
  if (initPromise) return initPromise; // Prevent multiple concurrent initializations
  
  initPromise = (async () => {
    try {
      console.log('[FaceDetection] Initializing face detector...');
      // Try WebGPU first (faster)
      try {
        faceDetector = await pipeline(
          'object-detection',
          'Xenova/detr-resnet-50',
          { device: 'webgpu' }
        );
        console.log('[FaceDetection] Face detector initialized with WebGPU');
        return faceDetector;
      } catch (webgpuError) {
        console.warn('[FaceDetection] WebGPU failed, falling back to WASM:', webgpuError);
        
        // Fall back to WASM (will be slower but works universally)
        faceDetector = await pipeline(
          'object-detection',
          'Xenova/detr-resnet-50'
        );
        console.log('[FaceDetection] Face detector initialized with WASM');
        return faceDetector;
      }
    } catch (error) {
      console.error('[FaceDetection] Failed to initialize face detector:', error);
      // Even if initialization fails, we can still do center crop
      faceDetector = 'FAILED';
      throw error;
    } finally {
      initPromise = null;
    }
  })();
  
  return initPromise;
}

export async function detectAndCropFace(imageUrl: string, options?: { mode?: 'passport' | 'idcard'; outputWidth?: number; outputHeight?: number }): Promise<{
  croppedImageUrl: string;
  coordinates: { x: number; y: number; width: number; height: number };
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        console.log('[FaceDetection] Image loaded, starting face detection...');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        let width = img.width;
        let height = img.height;
        let scale = 1;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            scale = MAX_DIMENSION / width;
            height = Math.round(height * scale);
            width = MAX_DIMENSION;
          } else {
            scale = MAX_DIMENSION / height;
            width = Math.round(width * scale);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        let cropX: number, cropY: number, cropWidth: number, cropHeight: number;

        const mode = options?.mode || 'passport';
        // Much more conservative expansion: only 10-20% beyond detected face
        const expandFactor = mode === 'idcard' ? 1.15 : 1.25;
        const targetAspect = PASSPORT_ASPECT_RATIO;

        // Try to detect face/person using the model
        let detectionSucceeded = false;
        try {
          console.log('[FaceDetection] Initializing detector...');
          const detector = await initFaceDetector();
          
          // Skip if detector failed to initialize
          if (detector === 'FAILED') {
            throw new Error('Face detector failed to initialize');
          }

          console.log('[FaceDetection] Running detection on image...');
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          const results = await detector(imageData);
          
          console.log('[FaceDetection] Detection results:', {
            count: results?.length || 0,
            results: results?.slice(0, 3).map((r: any) => ({ label: r.label, score: r.score }))
          });

          // Filter for person OR face detections
          const personResults = results.filter((r: any) => {
            const label = (r.label || '').toString().toLowerCase();
            return (label.includes('person') || label.includes('face') || label.includes('head')) && r.score > 0.45;
          });

          if (personResults.length > 0) {
            const detection = personResults.reduce((prev: any, curr: any) => curr.score > prev.score ? curr : prev);
            const box = detection.box;

            console.log('[FaceDetection] Best detection:', {
              label: detection.label,
              score: detection.score,
              box: { x: Math.round(box.xmin), y: Math.round(box.ymin), w: Math.round(box.width), h: Math.round(box.height) }
            });

            // Expand detection slightly to include head + shoulders
            const detectionCenterX = box.xmin + box.width / 2;
            const detectionCenterY = box.ymin + box.height / 2;

            cropHeight = box.height * expandFactor;
            cropWidth = cropHeight * targetAspect;

            cropX = detectionCenterX - cropWidth / 2;
            cropY = detectionCenterY - cropHeight / 2.5; // Bias towards head

            // Clamp to canvas bounds
            cropX = Math.max(0, Math.min(cropX, width - cropWidth));
            cropY = Math.max(0, Math.min(cropY, height - cropHeight));
            cropWidth = Math.min(cropWidth, width - cropX);
            cropHeight = Math.min(cropHeight, height - cropY);

            // If the computed crop covers almost the whole image, skip cropping (return at 70% threshold)
            const coverRatio = (cropWidth * cropHeight) / (width * height);
            console.log('[FaceDetection] Crop ratio:', coverRatio.toFixed(2));
            
            if (coverRatio > 0.70) {
              console.warn('[FaceDetection] Crop would cover 70%+ of image, using full image instead');
              const outCanvas = document.createElement('canvas');
              outCanvas.width = options?.outputWidth || PASSPORT_OUTPUT_WIDTH;
              outCanvas.height = options?.outputHeight || PASSPORT_OUTPUT_HEIGHT;
              const outCtx = outCanvas.getContext('2d')!;
              outCtx.fillStyle = '#FFFFFF';
              outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
              outCtx.drawImage(img, 0, 0, outCanvas.width, outCanvas.height);
              resolve({
                croppedImageUrl: outCanvas.toDataURL('image/png', 1.0),
                coordinates: { x: 0, y: 0, width: img.width, height: img.height }
              });
              return;
            }
            
            detectionSucceeded = true;
          } else {
            throw new Error('No person detected in image');
          }
        } catch (modelError) {
          console.warn('[FaceDetection] Model detection failed, falling back to center crop:', modelError);

          // Fallback: Very conservative center crop (60% of image only)
          const cropPercent = 0.60;
          if (width / height > targetAspect) {
            cropHeight = height * cropPercent;
            cropWidth = cropHeight * targetAspect;
          } else {
            cropWidth = width * cropPercent;
            cropHeight = cropWidth / targetAspect;
          }

          cropX = (width - cropWidth) / 2;
          cropY = (height - cropHeight) / 2 - height * 0.1; // Slight bias towards top
        }

        // Create output canvas
        const outW = options?.outputWidth || PASSPORT_OUTPUT_WIDTH;
        const outH = options?.outputHeight || PASSPORT_OUTPUT_HEIGHT;
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d')!;
        cropCanvas.width = outW;
        cropCanvas.height = outH;

        // Fill with white background
        cropCtx.fillStyle = '#FFFFFF';
        cropCtx.fillRect(0, 0, outW, outH);

        // Draw cropped and scaled image
        console.log('[FaceDetection] Drawing crop to output canvas:', {
          sourceRegion: { x: Math.round(cropX), y: Math.round(cropY), w: Math.round(cropWidth), h: Math.round(cropHeight) },
          targetSize: { w: outW, h: outH },
          detectionSucceeded
        });
        
        cropCtx.drawImage(
          canvas,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, outW, outH
        );

        const result = {
          croppedImageUrl: cropCanvas.toDataURL('image/png', 1.0),
          coordinates: {
            x: cropX / scale,
            y: cropY / scale,
            width: cropWidth / scale,
            height: cropHeight / scale
          }
        };
        
        console.log('[FaceDetection] Face crop completed successfully');
        resolve(result);
      } catch (error) {
        console.error('[FaceDetection] Error during face crop:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      const error = new Error(`Failed to load image from URL: ${imageUrl}`);
      console.error('[FaceDetection]', error);
      reject(error);
    };
    
    img.src = imageUrl;
  });
}

/**
 * Detect faces and crop using InsightFace SCRFD buffalo_l
 * Returns cropped face image with customizable padding and size
 */
export async function cropFaceWithSCRFD(
  imageUrl: string,
  options?: {
    padding?: number; // 0.0-1.0, default 0.2
    height?: number;  // pixels, default 300
    width?: number;   // pixels, default 300
  }
): Promise<{
  croppedImageUrl: string;
  success: boolean;
  message: string;
}> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('[FaceDetectionSCRFD] Starting face crop with InsightFace SCRFD...');
      
      let imageBase64: string;
      
      // Handle different URL types
      if (imageUrl.startsWith('blob:')) {
        console.log('[FaceDetectionSCRFD] Detected blob URL, fetching...');
        const blobResponse = await fetch(imageUrl);
        const blob = await blobResponse.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else if (imageUrl.startsWith('http')) {
        console.log('[FaceDetectionSCRFD] Detected URL, fetching...');
        const urlResponse = await fetch(imageUrl);
        const blob = await urlResponse.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Data URL or canvas
        console.log('[FaceDetectionSCRFD] Using canvas approach...');
        imageBase64 = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('Failed to get canvas context');
              
              ctx.drawImage(img, 0, 0);
              const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
              const base64 = imageDataUrl.split(',')[1];
              
              if (!base64) throw new Error('Failed to convert to base64');
              resolve(base64);
            } catch (error) {
              reject(error);
            }
          };
          
          img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
          img.src = imageUrl;
        });
      }
      
      if (!imageBase64) {
        throw new Error('Failed to convert image to base64');
      }
      
      console.log('[FaceDetectionSCRFD] Sending to backend for SCRFD face crop...');
      
      // Send to backend API
      const response = await fetch('http://localhost:3001/api/image/face-crop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          padding: options?.padding || 0.2,
          height: options?.height || 300,
          width: options?.width || 300,
        }),
      });
      
      console.log('[FaceDetectionSCRFD] Backend response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FaceDetectionSCRFD] Error response:', errorText);
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          // Not JSON
        }
        throw new Error((errorData as any)?.error || `Server returned ${response.status}`);
      }
      
      // Get cropped image as blob
      const croppedBlob = await response.blob();
      console.log('[FaceDetectionSCRFD] Received cropped blob, size:', croppedBlob.size);
      
      if (croppedBlob.size === 0) {
        throw new Error('Received empty blob from server');
      }
      
      const croppedUrl = URL.createObjectURL(croppedBlob);
      
      console.log('[FaceDetectionSCRFD] Success! Cropped image URL:', croppedUrl);
      
      resolve({
        croppedImageUrl: croppedUrl,
        success: true,
        message: 'Face detected and cropped successfully',
      });
    } catch (error) {
      console.error('[FaceDetectionSCRFD] Error:', error);
      reject(error);
    }
  });
}
