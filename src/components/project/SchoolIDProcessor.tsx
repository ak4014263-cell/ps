import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Loader2, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface SchoolIDProcessorProps {
  open: boolean;
  imageUrl?: string;
  imageBase64?: string;
  onProcessComplete: (processedImageBase64: string) => void;
  onCancel: () => void;
}

export function SchoolIDProcessor({
  open,
  imageUrl,
  imageBase64,
  onProcessComplete,
  onCancel
}: SchoolIDProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ image: string; filename: string } | null>(null);
  const [size, setSize] = useState(1024);

  const handleProcess = async () => {
    setError(null);
    setResult(null);
    setIsProcessing(true);

    try {
      let imageData = imageBase64;

      // If imageUrl is provided but not base64, fetch it
      if (!imageData && imageUrl) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
          reader.readAsDataURL(blob);
        });
      }

      if (!imageData) {
        throw new Error('No image data provided');
      }

      const response = await fetch('/api/school-id/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageData,
          size
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Processing failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      setResult({
        image: data.image,
        filename: data.filename
      });

      // Auto-complete with result
      onProcessComplete(data.image);
    } catch (err) {
      console.error('School ID processing error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result?.image) return;

    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${result.image}`;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && handleClose()}>
      <DialogContent className="max-w-md" aria-describedby="school-id-dialog-desc">
        <DialogHeader>
          <DialogTitle>Process School ID Photo</DialogTitle>
          <span id="school-id-dialog-desc" className="sr-only">
            Process and standardize student photo for school ID card
          </span>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {(imageUrl || imageBase64) && !result && (
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '200px' }}>
              <img
                src={imageUrl || (imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : '')}
                alt="Preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {/* Result Preview */}
          {result && (
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '300px' }}>
              <img
                src={`data:image/jpeg;base64,${result.image}`}
                alt="Processed School ID"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {/* Size Control */}
          {!result && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Output Size: <span className="font-semibold">{size}×{size}px</span>
              </label>
              <div className="flex gap-2">
                {[512, 768, 1024, 1280].map((s) => (
                  <Button
                    key={s}
                    variant={size === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSize(s)}
                    disabled={isProcessing}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Processing Steps Info */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>✓ Loading image</p>
                <p>→ Removing background</p>
                <p>→ Detecting face & landmarks</p>
                <p>→ Aligning & standardizing</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {result && !isProcessing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✓ School ID processed successfully!
              </p>
              <p className="text-xs text-green-700 mt-1">
                File: {result.filename}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleProcess} disabled={isProcessing || !imageUrl && !imageBase64}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing
                  </>
                ) : (
                  'Process Photo'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SchoolIDProcessor;
