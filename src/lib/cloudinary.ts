// Supabase disconnected - using XAMPP MySQL

interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
}

interface CloudinaryError {
  error: string;
  details?: unknown;
}

/**
 * Convert a File or Blob to base64 string
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a file to Cloudinary via edge function
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options?: {
    folder?: string;
    publicId?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    removeBackground?: boolean;
    autoCrop?: boolean;
    cropWidth?: number;
    cropHeight?: number;
    cropGravity?: 'face' | 'auto' | 'center';
  }
): Promise<CloudinaryUploadResult> {
  const base64 = await fileToBase64(file);

  // Supabase/Cloudinary backend integration not active yet.
  // This stub pretends upload succeeded and returns a tiny inline image
  // so the UI can render without calling any external domains.
  return {
    publicId: `cloudinary-stub-${Date.now()}`,
    // Use the original file as a data URL so the real photo appears in the UI
    // (no external network request needed)
    url: base64,
  } as CloudinaryUploadResult;
}

/**
 * Delete a file from Cloudinary via edge function
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> {
  // Supabase function calls disabled - backend not yet implemented
  // TODO: Create DELETE /api/cloudinary/:id endpoint
  console.log('[STUB] Deleting from Cloudinary:', {
    publicId,
    resourceType,
  });

  return true;
}

/**
 * Get Cloudinary image URL with optional transformations
 */
export function getCloudinaryUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'crop';
    quality?: number | 'auto';
    format?: 'auto' | 'jpg' | 'png' | 'webp';
  }
): string {
  // Extract cloud name from existing URL if publicId is a full URL
  if (publicId.startsWith('http')) {
    return publicId;
  }

  // Build transformation string
  const transforms: string[] = [];
  
  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  if (options?.crop) transforms.push(`c_${options.crop}`);
  if (options?.quality) transforms.push(`q_${options.quality}`);
  if (options?.format) transforms.push(`f_${options.format}`);

  // We need the cloud name - stored in the returned URL from upload
  // For now, return the publicId as the URL should be stored from upload
  return publicId;
}

/**
 * Get optimized thumbnail URL from Cloudinary
 */
export function getCloudinaryThumbnail(
  url: string,
  size: number = 200
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // Insert transformation before the upload path
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const beforeUpload = url.substring(0, uploadIndex + 8);
  const afterUpload = url.substring(uploadIndex + 8);
  
  return `${beforeUpload}c_fill,w_${size},h_${size},q_auto,f_auto/${afterUpload}`;
}

/**
 * Get optimized image URL with automatic format and quality
 */
export function getOptimizedCloudinaryUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  }
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const beforeUpload = url.substring(0, uploadIndex + 8);
  const afterUpload = url.substring(uploadIndex + 8);

  const transforms: string[] = ['q_auto', 'f_auto'];
  
  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  if (options?.crop) transforms.push(`c_${options.crop}`);

  return `${beforeUpload}${transforms.join(',')}/${afterUpload}`;
}

/**
 * Get Cloudinary URL with background removal transformation
 * Note: Requires Cloudinary AI Background Removal add-on
 */
export function getBackgroundRemovedUrl(url: string): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const beforeUpload = url.substring(0, uploadIndex + 8);
  const afterUpload = url.substring(uploadIndex + 8);

  return `${beforeUpload}e_background_removal/${afterUpload}`;
}

/**
 * Get Cloudinary URL with auto-crop (face detection) transformation
 */
export function getAutoCroppedUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    gravity?: 'face' | 'auto' | 'center';
  }
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const beforeUpload = url.substring(0, uploadIndex + 8);
  const afterUpload = url.substring(uploadIndex + 8);

  const width = options?.width || 400;
  const height = options?.height || 400;
  const gravity = options?.gravity || 'face';

  return `${beforeUpload}c_thumb,g_${gravity},w_${width},h_${height},q_auto,f_auto/${afterUpload}`;
}

/**
 * Get Cloudinary URL with both background removal and auto-crop
 */
export function getProcessedPhotoUrl(
  url: string,
  options?: {
    removeBackground?: boolean;
    autoCrop?: boolean;
    width?: number;
    height?: number;
    gravity?: 'face' | 'auto' | 'center';
  }
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const beforeUpload = url.substring(0, uploadIndex + 8);
  const afterUpload = url.substring(uploadIndex + 8);

  const transforms: string[] = [];
  
  if (options?.removeBackground) {
    transforms.push('e_background_removal');
  }
  
  if (options?.autoCrop) {
    const width = options.width || 400;
    const height = options.height || 400;
    const gravity = options.gravity || 'face';
    transforms.push(`c_thumb,g_${gravity},w_${width},h_${height}`);
  }

  transforms.push('q_auto', 'f_auto');

  return `${beforeUpload}${transforms.join('/')}/${afterUpload}`;
}

/**
 * Extract public ID from a Cloudinary URL
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return null;

  let path = url.substring(uploadIndex + 8);
  
  // Remove version if present (e.g., v1234567890/)
  if (path.match(/^v\d+\//)) {
    path = path.replace(/^v\d+\//, '');
  }

  // Remove file extension
  const lastDot = path.lastIndexOf('.');
  if (lastDot !== -1) {
    path = path.substring(0, lastDot);
  }

  return path;
}
