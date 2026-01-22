import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RotateCw } from 'lucide-react';
import { cropImageToBlob, createPassportCrop, createIdCardCrop, CropArea } from '@/lib/cropUtils';

export interface ImageCropDialogProps {
  open: boolean;
  imageUrl: string;
  mode?: 'passport' | 'idcard';
  onCropComplete: (cropData: {
    blob: Blob;
    dataUrl: string;
    croppedDimensions: CropArea;
  }) => void;
  onCancel: () => void;
}

export function ImageCropDialog({
  open,
  imageUrl,
  mode = 'passport',
  onCropComplete,
  onCancel
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const aspectRatio = mode === 'passport' ? 35 / 45 : 85 / 54;

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onCroppedAreaPixelsChange = useCallback((croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleImageLoad = (imageSize: { width: number; height: number }) => {
    setImageDimensions(imageSize);
    // Set initial crop to suggested size
    const initialCrop = mode === 'passport' 
      ? createPassportCrop(imageSize.width, imageSize.height)
      : createIdCardCrop(imageSize.width, imageSize.height);
    setCroppedAreaPixels(initialCrop);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    if (imageDimensions) {
      const initialCrop = mode === 'passport'
        ? createPassportCrop(imageDimensions.width, imageDimensions.height)
        : createIdCardCrop(imageDimensions.width, imageDimensions.height);
      setCroppedAreaPixels(initialCrop);
    }
  };

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      // Use the imageUrl directly to crop (will reload image)
      console.log('Cropping image with area:', croppedAreaPixels);
      const result = await cropImageToBlob(imageUrl, croppedAreaPixels, aspectRatio);
      console.log('Crop result:', result);
      onCropComplete(result);
      // Reset state after success
      handleReset();
    } catch (error) {
      console.error('Error cropping image:', error);
      alert(`Failed to crop image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="crop-dialog-desc">
        <DialogHeader>
          <DialogTitle>
            Crop Image ({mode === 'passport' ? 'Passport' : 'ID Card'})
          </DialogTitle>
          <span id="crop-dialog-desc" className="sr-only">
            Interactive image cropping tool. Adjust zoom and rotation, then click Crop & Save to apply.
          </span>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cropper */}
          <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden" style={{ height: '400px' }}>
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              cropShape="rect"
              showGrid={true}
              onCropChange={onCropChange}
              onCropComplete={onCroppedAreaPixelsChange}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onMediaLoaded={handleImageLoad}
              restrictPosition={false}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Control */}
            <div className="space-y-2">
              <Label htmlFor="zoom-slider">Zoom: {(zoom * 100).toFixed(0)}%</Label>
              <Slider
                id="zoom-slider"
                min={1}
                max={3}
                step={0.1}
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
              />
            </div>

            {/* Rotation Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotateLeft}
                disabled={isProcessing}
              >
                <RotateCw className="h-4 w-4 mr-2 transform -scale-x-100" />
                Rotate Left
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotateRight}
                disabled={isProcessing}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate Right
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isProcessing}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Aspect Ratio Info */}
          <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded">
            Aspect ratio: {(aspectRatio * 100).toFixed(0)}% 
            {mode === 'passport' && ' (Passport 35mm x 45mm)'}
            {mode === 'idcard' && ' (ID Card 85mm x 54mm)'}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={isProcessing}>
            {isProcessing ? 'Cropping...' : 'Crop & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
