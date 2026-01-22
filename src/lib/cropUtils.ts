/**
 * Utility functions for image cropping and manipulation
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert a cropped area and image to a canvas blob
 */
export async function cropImageToBlob(
  imageUrl: string,
  cropArea: CropArea,
  aspectRatio?: number
): Promise<{ blob: Blob; dataUrl: string; croppedDimensions: CropArea }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        console.log('Image loaded. Dimensions:', img.width, 'x', img.height);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        // Set canvas size to the cropped dimensions
        canvas.width = Math.round(cropArea.width);
        canvas.height = Math.round(cropArea.height);
        console.log('Canvas created:', canvas.width, 'x', canvas.height);

        // Draw the cropped region
        ctx.drawImage(
          img,
          Math.round(cropArea.x),
          Math.round(cropArea.y),
          Math.round(cropArea.width),
          Math.round(cropArea.height),
          0,
          0,
          Math.round(cropArea.width),
          Math.round(cropArea.height)
        );
        console.log('Image drawn to canvas');

        canvas.toBlob(
          (blob) => {
            if (!blob) throw new Error('Failed to create blob from canvas');
            const dataUrl = canvas.toDataURL('image/png');
            console.log('Blob created. Size:', blob.size, 'bytes');
            resolve({
              blob,
              dataUrl,
              croppedDimensions: cropArea
            });
          },
          'image/png',
          1.0
        );
      } catch (error) {
        console.error('Error in canvas processing:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image from URL:', imageUrl);
      reject(new Error('Failed to load image'));
    };

    console.log('Loading image from URL:', imageUrl);
    img.src = imageUrl;
  });
}

/**
 * Scale crop area from one size to another (used when preview size differs from original)
 */
export function scaleCropArea(
  crop: CropArea,
  fromWidth: number,
  toWidth: number
): CropArea {
  const scale = toWidth / fromWidth;
  return {
    x: crop.x * scale,
    y: crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale
  };
}

/**
 * Create a passport-sized crop (35mm x 45mm at 300 DPI)
 */
export function createPassportCrop(imageWidth: number, imageHeight: number): CropArea {
  const aspectRatio = 35 / 45; // width/height

  let cropWidth = imageWidth;
  let cropHeight = cropWidth / aspectRatio;

  // If height exceeds image, adjust
  if (cropHeight > imageHeight) {
    cropHeight = imageHeight;
    cropWidth = cropHeight * aspectRatio;
  }

  const x = (imageWidth - cropWidth) / 2;
  const y = (imageHeight - cropHeight) / 2;

  return { x, y, width: cropWidth, height: cropHeight };
}

/**
 * Create an ID card sized crop (with gentler aspect ratio)
 */
export function createIdCardCrop(imageWidth: number, imageHeight: number): CropArea {
  const aspectRatio = 85 / 54; // Standard ID card ratio (wider)

  let cropWidth = imageWidth;
  let cropHeight = cropWidth / aspectRatio;

  if (cropHeight > imageHeight) {
    cropHeight = imageHeight;
    cropWidth = cropHeight * aspectRatio;
  }

  const x = (imageWidth - cropWidth) / 2;
  const y = (imageHeight - cropHeight) / 2;

  return { x, y, width: cropWidth, height: cropHeight };
}
