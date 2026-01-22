import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Eraser, Download, Loader2, Crop, RotateCcw, Sun, Contrast, Palette, CreditCard, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';


interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  originalPhotoUrl: string | null;
  recordId: string;
  projectId: string;
  recordName: string;
}

// Passport photo sizes in mm (width x height)
const PASSPORT_SIZES = {
  india: { width: 35, height: 45, name: 'Indian Passport (35x45mm)' },
  us: { width: 51, height: 51, name: 'US Passport (51x51mm)' },
  uk: { width: 35, height: 45, name: 'UK Passport (35x45mm)' },
  schengen: { width: 35, height: 45, name: 'Schengen Visa (35x45mm)' },
};

export function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  originalPhotoUrl,
  recordId,
  projectId,
  recordName,
}: ImagePreviewDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isBeautifying, setIsBeautifying] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [beautifyStrength, setBeautifyStrength] = useState(70);  // 0-100, default 70%
  const queryClient = useQueryClient();
  
  // Image adjustment states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset adjustments when dialog opens
  useEffect(() => {
    if (open) {
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setProcessedUrl(null);
    }
  }, [open]);

  const applyFilters = (img: HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    
    // Apply CSS filters via canvas
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/png', 1.0);
  };

  const handleApplyAdjustments = async () => {
    const currentUrl = processedUrl || imageUrl;
    if (!currentUrl) return;

    setIsApplying(true);
    toast.info('Applying adjustments...');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = currentUrl;
      });

      const adjustedDataUrl = applyFilters(img);
      
      // Convert to blob
      const response = await fetch(adjustedDataUrl);
      const resultBlob = await response.blob();

      // Upload to backend (save-photo endpoint)
      const saveFormData = new FormData();
      saveFormData.append('photo', resultBlob, 'adjusted.png');
      saveFormData.append('recordId', recordId);
      saveFormData.append('photoType', 'adjusted');

      const saveResponse = await fetch('http://localhost:3001/api/image/save-photo', {
        method: 'POST',
        body: saveFormData,
      });

      if (!saveResponse.ok) {
        throw new Error(`Failed to save adjusted photo: ${saveResponse.status}`);
      }

      const saveData = await saveResponse.json();
      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save photo');
      }

      const publicUrl = saveData.url;

      // Update the record via API
      await apiService.dataRecordsAPI.update(recordId, {
        photo_url: publicUrl,
        original_photo_url: originalPhotoUrl || imageUrl,
        processing_status: 'processed',
      });

      setProcessedUrl(`http://localhost:3001${publicUrl}`);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success('Adjustments applied successfully!');
    } catch (error) {
      console.error('Apply adjustments failed:', error);
      toast.error('Failed to apply adjustments');
    } finally {
      setIsApplying(false);
    }
  };

  const handlePassportCrop = async (size: keyof typeof PASSPORT_SIZES) => {
    const currentUrl = processedUrl || imageUrl;
    if (!currentUrl) return;

    setIsCropping(true);
    const passportSize = PASSPORT_SIZES[size];
    toast.info(`Cropping to ${passportSize.name}...`);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = currentUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Calculate aspect ratio for passport size
      const targetAspect = passportSize.width / passportSize.height;
      const sourceAspect = img.width / img.height;
      
      let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
      
      if (sourceAspect > targetAspect) {
        // Image is wider than target - crop sides
        sourceWidth = img.height * targetAspect;
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        // Image is taller than target - crop from top (keep face area)
        sourceHeight = img.width / targetAspect;
        sourceY = img.height * 0.1; // Start slightly from top to capture face
      }
      
      // Output at 300 DPI (standard for passport photos)
      const dpi = 300;
      const outputWidth = Math.round((passportSize.width / 25.4) * dpi);
      const outputHeight = Math.round((passportSize.height / 25.4) * dpi);
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      
      // Apply current filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
      
      const croppedDataUrl = canvas.toDataURL('image/png', 1.0);

      // Upload to backend (save-photo endpoint)
      const response = await fetch(croppedDataUrl);
      const resultBlob = await response.blob();

      const saveFormData = new FormData();
      saveFormData.append('photo', resultBlob, `passport_${size}.png`);
      saveFormData.append('recordId', recordId);
      saveFormData.append('photoType', `passport_${size}`);

      const saveResponse = await fetch('http://localhost:3001/api/image/save-photo', {
        method: 'POST',
        body: saveFormData,
      });

      if (!saveResponse.ok) {
        throw new Error(`Failed to save passport photo: ${saveResponse.status}`);
      }

      const saveData = await saveResponse.json();
      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save photo');
      }

      const publicUrl = saveData.url;

      // Update the record via API
      await apiService.dataRecordsAPI.update(recordId, {
        photo_url: publicUrl,
        original_photo_url: originalPhotoUrl || imageUrl,
        processing_status: 'processed',
      });

      setProcessedUrl(`http://localhost:3001${publicUrl}`);

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success(`Cropped to ${passportSize.name}!`);
    } catch (error) {
      console.error('Passport crop failed:', error);
      toast.error('Failed to crop image');
    } finally {
      setIsCropping(false);
    }
  };



  const handleResetToOriginal = async () => {
    if (!originalPhotoUrl) {
      toast.error('No original photo available');
      return;
    }

    setIsResetting(true);
    toast.info('Restoring original photo...');

    try {
      // Update via backend API
      await apiService.dataRecordsAPI.update(recordId, {
        photo_url: originalPhotoUrl,
        background_removed: false,
        face_detected: false,
        cropped_photo_url: null,
        face_crop_coordinates: null,
        processing_status: 'pending',
      });

      setProcessedUrl(null);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success('Photo restored to original!');
    } catch (error) {
      console.error('Reset failed:', error);
      toast.error('Failed to restore original photo');
    } finally {
      setIsResetting(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!imageUrl) return;

    setIsRemoving(true);
    toast.info('Removing background... This may take a moment.');

    try {
      const { removeBackground } = await import('@/lib/backgroundRemoval');
      const resultDataUrl = await removeBackground(imageUrl);

      // Convert data URL to blob
      const response = await fetch(resultDataUrl);
      const resultBlob = await response.blob();

      if (!resultBlob || resultBlob.size === 0) {
        throw new Error('Received empty blob from background removal');
      }

      // Upload to backend (save-photo endpoint)
      const saveFormData = new FormData();
      const file = new File([resultBlob], 'no-bg.png', { type: 'image/png' });
      saveFormData.append('photo', file);
      saveFormData.append('recordId', recordId);
      saveFormData.append('photoType', 'bg_removed');

      console.log('[Remove BG] Uploading background-removed image...');
      const saveResponse = await fetch('http://localhost:3001/api/image/save-photo', {
        method: 'POST',
        body: saveFormData,
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('[Remove BG] Save response error:', errorText);
        throw new Error(`Failed to save processed photo: ${saveResponse.status}`);
      }

      const saveData = await saveResponse.json();
      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save photo');
      }

      const publicUrl = saveData.url;
      console.log('[Remove BG] Successfully saved to:', publicUrl);

      // Display the saved image immediately
      setProcessedUrl(`http://localhost:3001${publicUrl}`);

      // Update database record via API
      await apiService.dataRecordsAPI.update(recordId, {
        photo_url: publicUrl,
        original_photo_url: originalPhotoUrl || imageUrl,
        background_removed: true,
        processing_status: 'processed',
      });

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success('Background removed successfully!');
    } catch (error: any) {
      console.error('Background removal failed:', error);
      toast.error(`Background removal failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleBeautify = async () => {
    const currentUrl = processedUrl || imageUrl;
    if (!currentUrl) return;

    setIsBeautifying(true);
    toast.info('Beautifying image...');

    try {
      // Fetch the image and convert to blob
      const response = await fetch(currentUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      const imageBlob = await response.blob();

      // Create FormData for beautify request with CodeFormer
      const formData = new FormData();
      const file = new File([imageBlob], 'photo.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('strength', String(beautifyStrength / 100));  // Convert 0-100 to 0-1

      // Call beautify endpoint
      const beautifyResponse = await fetch('http://localhost:3001/api/image/beautify', {
        method: 'POST',
        body: formData,
      });

      if (!beautifyResponse.ok) {
        throw new Error(`Beautify API error: ${beautifyResponse.status}`);
      }

      const beautifiedBlob = await beautifyResponse.blob();
      if (!beautifiedBlob || beautifiedBlob.size === 0) {
        throw new Error('Received empty beautified image from server');
      }

      // Upload to backend (save-photo endpoint)
      const saveFormData = new FormData();
      const saveFile = new File([beautifiedBlob], 'beautified.jpg', { type: 'image/jpeg' });
      saveFormData.append('photo', saveFile);
      saveFormData.append('recordId', recordId);
      saveFormData.append('photoType', 'beautified');

      console.log('[Beautify] Uploading beautified image...');
      const saveResponse = await fetch('http://localhost:3001/api/image/save-photo', {
        method: 'POST',
        body: saveFormData,
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('[Beautify] Save response error:', errorText);
        throw new Error(`Failed to save beautified photo: ${saveResponse.status}`);
      }

      const saveData = await saveResponse.json();
      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save photo');
      }

      const publicUrl = saveData.url;
      const fullUrl = publicUrl.startsWith('http') ? publicUrl : `http://localhost:3001${publicUrl}`;
      console.log('[Beautify] Successfully saved to:', fullUrl);

      // Display the saved image immediately
      setProcessedUrl(fullUrl);
      
      // Reset adjustments for the beautified image baseline
      setBrightness(100);
      setContrast(100);
      setSaturation(100);

      // Update database record via API
      await apiService.dataRecordsAPI.update(recordId, {
        photo_url: fullUrl,
        original_photo_url: originalPhotoUrl || imageUrl,
        processing_status: 'beautified',
      });

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success('Image beautified successfully!');
    } catch (error: any) {
      console.error('Beautify failed:', error);
      toast.error(`Beautify failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsBeautifying(false);
    }
  };

  const blobToBase64 = async (blob: Blob): Promise<string> => {
    const reader = new FileReader();
    return await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const res = String(reader.result || '');
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });
  };

  const handleDownload = () => {
    const urlToDownload = processedUrl || imageUrl;
    if (!urlToDownload) return;

    const a = document.createElement('a');
    a.href = urlToDownload;
    a.download = `${recordName}_photo.png`;
    a.click();
  };

  const handleClose = () => {
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl);
      setProcessedUrl(null);
    }
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    onOpenChange(false);
  };

  const displayUrl = processedUrl || imageUrl;
  const hasOriginal = originalPhotoUrl && originalPhotoUrl !== imageUrl;
  const hasAdjustments = brightness !== 100 || contrast !== 100 || saturation !== 100;

  // CSS filter string for preview
  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
  };

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('[ImagePreviewDialog] Opened - imageUrl:', imageUrl, 'displayUrl:', displayUrl);
    }
  }, [open, imageUrl, displayUrl]);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('[ImagePreviewDialog] Dialog state changing to:', newOpen);
      if (!newOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recordName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative flex items-center justify-center bg-muted/30 rounded-lg min-h-[250px] p-4">
            {displayUrl ? (
              <img
                key={displayUrl}
                ref={imageRef}
                src={displayUrl}
                alt={recordName}
                className="max-w-full max-h-[300px] object-contain rounded-lg"
                style={filterStyle}
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error('[ImagePreview] Failed to load image:', displayUrl);
                  console.error('[ImagePreview] Error:', e);
                }}
                onLoad={() => {
                  console.log('[ImagePreview] Image loaded successfully:', displayUrl);
                }}
              />
            ) : (
              <p className="text-muted-foreground">No image available</p>
            )}
          </div>

          {/* Image Adjustments */}
          <div className="grid gap-4 p-4 bg-muted/20 rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Image Adjustments
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Sun className="h-3 w-3" />
                    Brightness
                  </Label>
                  <span className="text-xs text-muted-foreground">{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  min={50}
                  max={150}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Contrast className="h-3 w-3" />
                    Contrast
                  </Label>
                  <span className="text-xs text-muted-foreground">{contrast}%</span>
                </div>
                <Slider
                  value={[contrast]}
                  onValueChange={([v]) => setContrast(v)}
                  min={50}
                  max={150}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    Saturation
                  </Label>
                  <span className="text-xs text-muted-foreground">{saturation}%</span>
                </div>
                <Slider
                  value={[saturation]}
                  onValueChange={([v]) => setSaturation(v)}
                  min={0}
                  max={200}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            {hasAdjustments && (
              <Button
                size="sm"
                onClick={handleApplyAdjustments}
                disabled={isApplying}
                className="w-fit"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply Adjustments'
                )}
              </Button>
            )}
          </div>

          {/* Passport Crop Options */}
          <div className="grid gap-2 p-4 bg-muted/20 rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Passport Size Crop
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PASSPORT_SIZES).map(([key, size]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePassportCrop(key as keyof typeof PASSPORT_SIZES)}
                  disabled={isCropping || !imageUrl}
                >
                  {size.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Beautify Settings */}
          <div className="grid gap-3 p-4 bg-muted/20 rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Beautification Strength
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  Enhancement
                </Label>
                <span className="text-xs text-muted-foreground">{beautifyStrength}%</span>
              </div>
              <Slider
                value={[beautifyStrength]}
                onValueChange={([v]) => setBeautifyStrength(v)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower = more natural, Higher = more pronounced enhancement
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2">
            {hasOriginal && (
              <Button
                variant="outline"
                onClick={handleResetToOriginal}
                disabled={isResetting}
              >
                {isResetting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reset to Original
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!displayUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleRemoveBackground}
              disabled={isRemoving || !imageUrl}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Eraser className="h-4 w-4 mr-2" />
                  Remove BG
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleBeautify}
              disabled={isBeautifying || !imageUrl}
            >
              {isBeautifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Beautifying...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Beautify
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
