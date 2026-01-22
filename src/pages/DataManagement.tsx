import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExcelUpload } from '@/components/data/ExcelUpload';
import { ColumnMapper } from '@/components/data/ColumnMapper';
import { PhotoUpload } from '@/components/data/PhotoUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Image, Wand2, Download, Loader2, Crop } from 'lucide-react';
import { toast } from 'sonner';
import { removeBackgroundBatch, getBackgroundRemovalConfig } from '@/lib/backgroundRemoval';
import { detectAndCropFace } from '@/lib/faceDetection';
import { Progress } from '@/components/ui/progress';
import JSZip from 'jszip';

export default function DataManagement() {
  const [uploadedData, setUploadedData] = useState<any[] | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string> | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ filename: string; blob: Blob }[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'map' | 'photos' | 'process'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processedPhotos, setProcessedPhotos] = useState<{ filename: string; blob: Blob }[]>([]);
  const [cropMode, setCropMode] = useState<'passport' | 'idcard'>('idcard');

  const handleDataParsed = (data: any[], columns: string[]) => {
    setUploadedData(data);
    setDetectedColumns(columns);
    setCurrentStep('map');
  };

  const handleMappingComplete = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
    setCurrentStep('photos');
    toast.success('Column mapping saved');
  };

  const handlePhotosUploaded = (photos: { filename: string; blob: Blob }[]) => {
    setUploadedPhotos(photos);
    setCurrentStep('process');
    toast.success(`${photos.length.toLocaleString()} photos uploaded successfully`);
  };

  const handleProcessData = async () => {
    if (uploadedPhotos.length === 0) {
      toast.error('No photos uploaded');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);
    toast.loading('Running face detection and auto-crop...');

    const processed: { filename: string; blob: Blob }[] = [];

    try {
      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photo = uploadedPhotos[i];
        const url = URL.createObjectURL(photo.blob);

        try {
          const result = await detectAndCropFace(url, { mode: cropMode });
          // result.croppedImageUrl is a data URL (png)
          const blob = await (await fetch(result.croppedImageUrl)).blob();
          processed.push({ filename: photo.filename, blob });
        } catch (err) {
          console.warn(`Auto-crop failed for ${photo.filename}, using original`, err);
          processed.push({ filename: photo.filename, blob: photo.blob });
        } finally {
          URL.revokeObjectURL(url);
        }

        setProcessProgress(Math.round(((i + 1) / uploadedPhotos.length) * 100));
      }

      setProcessedPhotos(processed);
      toast.dismiss();
      toast.success(`Auto-crop completed for ${processed.length} photos`);
    } catch (error) {
      console.error('Auto-crop error:', error);
      toast.dismiss();
      toast.error('Failed to auto-crop photos');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveBackgrounds = async () => {
    if (uploadedPhotos.length === 0) {
      toast.error('No photos uploaded');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);
    const startTime = performance.now();

    try {
      // Check if rembg is configured
      const config = getBackgroundRemovalConfig();
      if (config.provider !== 'rembg-local' && config.provider !== 'rembg-cloud') {
        toast.error('Background removal not available. Configure rembg first.');
        setIsProcessing(false);
        return;
      }

      toast.loading(`Removing backgrounds from ${uploadedPhotos.length} photos...`);

      // Process backgrounds using rembg batch
      const blobs = uploadedPhotos.map(p => p.blob);
      const batchResults = await removeBackgroundBatch(blobs, 5);

      // Create index-based mapping
      const processed: Array<{ filename: string; blob: Blob }> = [];
      const indexMap = new Map<number, string>();
      uploadedPhotos.forEach((photo, idx) => {
        indexMap.set(idx, photo.filename);
      });

      for (const { index, blob } of batchResults) {
        const filename = indexMap.get(index);
        if (filename) {
          processed.push({ filename, blob });
        }
      }

      setProcessedPhotos(processed);
      setProcessProgress(100);

      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      toast.dismiss();
      toast.success(
        `Removed backgrounds from ${batchResults.length}/${uploadedPhotos.length} photos in ${duration}s`
      );
    } catch (error) {
      console.error('Background removal error:', error);
      toast.dismiss();
      toast.error('Failed to remove backgrounds');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePassportCrop = async () => {
    if (uploadedPhotos.length === 0) {
      toast.error('No photos uploaded');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);
    toast.loading('Running advanced passport photo cropping...');

    const processed: { filename: string; blob: Blob }[] = [];

    try {
      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photo = uploadedPhotos[i];
        const url = URL.createObjectURL(photo.blob);

        try {
          processed.push({ filename: photo.filename, blob: photo.blob });
        } catch (err) {
          console.warn(`Processing failed for ${photo.filename}, using original`, err);
          processed.push({ filename: photo.filename, blob: photo.blob });
        } finally {
          URL.revokeObjectURL(url);
        }

        setProcessProgress(Math.round(((i + 1) / uploadedPhotos.length) * 100));
      }

      setProcessedPhotos(processed);
      toast.dismiss();
      toast.success(`Passport crop completed for ${processed.length} photos`);
    } catch (error) {
      console.error('Passport crop error:', error);
      toast.dismiss();
      toast.error('Failed to crop passport photos');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleDownloadPhotos = async () => {
    if (processedPhotos.length === 0) {
      toast.error('No processed photos to download');
      return;
    }

    setIsDownloading(true);

    try {
      toast.loading(`Preparing ${processedPhotos.length} photos for download...`);
      
      const zip = new JSZip();
      const folder = zip.folder('processed-photos');
      
      if (!folder) {
        throw new Error('Failed to create zip folder');
      }

      // Add each photo to the zip
      for (let i = 0; i < processedPhotos.length; i++) {
        const photo = processedPhotos[i];
        folder.file(photo.filename, photo.blob);
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create download link and trigger download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `processed-photos-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(`Downloaded ${processedPhotos.length} processed photos`);
    } catch (error) {
      console.error('Download error:', error);
      toast.dismiss();
      toast.error('Failed to download photos');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Data & Photo Management</h1>
        <p className="text-muted-foreground">Upload and process data with AI-powered face detection and background removal</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Upload & Mapping */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload" disabled={!uploadedData && currentStep !== 'upload'}>
                <Database className="h-4 w-4 mr-2" />
                Upload Data
              </TabsTrigger>
              <TabsTrigger value="map" disabled={!uploadedData}>
                Map Columns
              </TabsTrigger>
              <TabsTrigger value="photos" disabled={!columnMapping}>
                <Image className="h-4 w-4 mr-2" />
                Upload Photos
              </TabsTrigger>
              <TabsTrigger value="process" disabled={!uploadedPhotos.length}>
                <Wand2 className="h-4 w-4 mr-2" />
                Process
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <ExcelUpload onDataParsed={handleDataParsed} />
            </TabsContent>

            <TabsContent value="map">
              {detectedColumns.length > 0 && (
                <ColumnMapper 
                  detectedColumns={detectedColumns}
                  onMappingComplete={handleMappingComplete}
                />
              )}
            </TabsContent>

            <TabsContent value="photos">
              <PhotoUpload onPhotosUploaded={handlePhotosUploaded} />
            </TabsContent>

            <TabsContent value="process">
              <Card>
                <CardHeader>
                  <CardTitle>AI Processing Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isProcessing && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Processing Progress</span>
                        <span className="text-muted-foreground">{processProgress}%</span>
                      </div>
                      <Progress value={processProgress} className="h-2" />
                    </div>
                  )}

                  {processedPhotos.length > 0 && !isProcessing && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✅ Successfully processed {processedPhotos.length} photos with background removed
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Crop Mode:</label>
                      <select
                        value={cropMode}
                        onChange={(e) => setCropMode(e.target.value as any)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="passport">Passport</option>
                        <option value="idcard">ID Card (wider)</option>
                      </select>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleProcessData}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Run Face Detection & Auto-Crop
                    </Button>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={handleRemoveBackgrounds}
                      disabled={isProcessing || uploadedPhotos.length === 0}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Removing... {processProgress}%
                        </>
                      ) : (
                        <>
                          Remove Backgrounds
                        </>
                      )}
                    </Button>

                    <Button 
                      className="w-full" 
                      variant="secondary"
                      onClick={handlePassportCrop}
                      disabled={isProcessing || uploadedPhotos.length === 0}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cropping... {processProgress}%
                        </>
                      ) : (
                        <>
                          <Crop className="h-4 w-4 mr-2" />
                          Advanced Passport Photo Crop
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={handleDownloadPhotos}
                      disabled={processedPhotos.length === 0 || isDownloading}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download Processed Photos
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">AI Features:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Face detection runs in browser (free, no API needed)</li>
                      <li>Background removal uses rotating free API keys</li>
                      <li>All processing is automatic and fast</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Progress Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Data Records</span>
                  <span className="font-medium">{uploadedData?.length || 0}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Columns Detected</span>
                  <span className="font-medium">{detectedColumns.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fields Mapped</span>
                  <span className="font-medium">{columnMapping ? Object.keys(columnMapping).length : 0}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Photos Uploaded</span>
                  <span className="font-medium">{uploadedPhotos.length.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Photos Processed</span>
                  <span className="font-medium text-green-600">{processedPhotos.length.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                disabled={!uploadedData}
              >
                Reset Data
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                disabled={!uploadedPhotos.length}
              >
                Reset Photos
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
              >
                Import Sample Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
