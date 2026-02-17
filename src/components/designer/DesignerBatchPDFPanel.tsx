import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  Grid3X3,
  ImageIcon,
  FolderArchive,
  Database,
  Triangle,
  Hexagon,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import JSZip from 'jszip';
import jsPDF from 'jspdf'; // Added jsPDF
import {
  Canvas as FabricCanvas,
  Image as FabricImage,
  Circle,
  Rect,
  Polygon,
  Path,
  Ellipse
} from 'fabric'; // Added Fabric imports
import { apiService } from '@/lib/api';
import { MaskedPhotoObject } from './PhotoMaskingModule';
import { VDPText } from '@/lib/vdpText';

interface DesignerBatchPDFPanelProps {
  canvas: any;
  backCanvas?: any;
  templateName: string;
  hasBackSide: boolean;
  widthMm: number;
  heightMm: number;
  designJson: any;
  backDesignJson?: any;
  category: string;
  projectId?: string;
  vendorId?: string;
  onPreviewRecord?: (record: Record<string, string>) => void;
  onClose: () => void;
}

const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
};

const BATCH_SIZE = 25;

export function DesignerBatchPDFPanel({
  canvas,
  backCanvas,
  templateName,
  hasBackSide,
  widthMm,
  heightMm,
  designJson,
  backDesignJson,
  category,
  projectId,
  vendorId,
  onPreviewRecord,
  onClose,
}: DesignerBatchPDFPanelProps) {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [generatedPDFs, setGeneratedPDFs] = useState<{ side: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [photoFieldName, setPhotoFieldName] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const effectiveProjectId = projectId || selectedProjectId;

  const { data: projectsData } = useQuery({
    queryKey: ['available-projects-batch', vendorId],
    queryFn: () => apiService.projectsAPI.getAll({ vendor_id: vendorId }),
    enabled: !projectId, // Only fetch if no project context
  });

  const availableProjects = projectsData?.data || [];


  // Photo field mapping state - maps template photo placeholders to CSV columns
  const [photoFieldMappings, setPhotoFieldMappings] = useState<Record<string, string>>({});

  const [options, setOptions] = useState({
    includeBleed: true,
    includeCropMarks: true,
    pageSize: 'A4' as 'A4' | 'A3' | 'Letter' | 'card',
    orientation: 'portrait' as 'portrait' | 'landscape',
    cardsPerRow: 0,
    cardsPerColumn: 0,
    cardSpacing: 5,
    pageMarginTop: 10,
    pageMarginBottom: 10,
    pageMarginLeft: 10,
    pageMarginRight: 10,
    separateFrontBack: false,
    side: 'both' as 'front' | 'back' | 'both',
    showSerialNumbers: true,
    serialNumberPrefix: '',
    startingSerialNumber: 1,
    showPageNumbers: true,
  });

  // Extract photo placeholders from template design
  const templatePhotoPlaceholders = useMemo(() => {
    const placeholders: string[] = [];

    const extractFromDesign = (design: any) => {
      if (!design?.objects) return;
      design.objects.forEach((obj: any) => {
        if (obj.data?.isPhotoPlaceholder ||
          obj.data?.type === 'photo-placeholder' ||
          obj.data?.type === 'preview-photo' ||
          (obj.data?.type === 'variable' && obj.data?.isPhoto)) {
          const name = obj.data?.field || obj.data?.name || obj.data?.fieldName || 'photo';
          if (!placeholders.includes(name)) {
            placeholders.push(name);
          }
        }
        // Also check for image objects with variable names
        if (obj.type === 'image' && obj.data?.variableName) {
          const name = obj.data.variableName;
          if (!placeholders.includes(name)) {
            placeholders.push(name);
          }
        }
        // Check for Masked Photo Objects
        if ((obj.type === 'masked-photo' || obj.maskedPhoto) && (obj.maskConfig?.variableBinding || obj.variableBinding)) {
          const binding = obj.maskConfig?.variableBinding || obj.variableBinding;
          const name = typeof binding === 'string' ? binding : binding.field;
          if (name && !placeholders.includes(name)) {
            placeholders.push(name);
          }
        }
      });
    };

    extractFromDesign(designJson);
    if (backDesignJson) extractFromDesign(backDesignJson);

    // Add default photo placeholder
    if (placeholders.length === 0) {
      placeholders.push('photo');
    }

    return placeholders;
  }, [designJson, backDesignJson]);

  // 🔥 Auto-load project data when panel opens if projectId exists
  useEffect(() => {
    if (projectId && csvData.length === 0 && !isProcessing) {
      handleLoadFromProject();
    }
  }, [projectId]);


  const previewInfo = useMemo(() => {
    if (csvData.length === 0) return null;

    const cardWidthMm = widthMm || 85.6;
    const cardHeightMm = heightMm || 54;
    const bleedMm = options.includeBleed ? 3 : 0;
    const cardWidthWithBleed = cardWidthMm + bleedMm * 2;
    const cardHeightWithBleed = cardHeightMm + bleedMm * 2;

    if (options.pageSize === 'card') {
      return {
        cardsPerRow: 1,
        cardsPerColumn: 1,
        cardsPerPage: 1,
        totalPages: csvData.length,
        pageWidth: cardWidthWithBleed,
        pageHeight: cardHeightWithBleed,
      };
    }

    const pageDimensions = PAGE_SIZES[options.pageSize] || PAGE_SIZES.A4;
    let pageWidth = options.orientation === 'landscape' ? pageDimensions.height : pageDimensions.width;
    let pageHeight = options.orientation === 'landscape' ? pageDimensions.width : pageDimensions.height;

    const marginT = options.pageMarginTop;
    const marginB = options.pageMarginBottom;
    const marginL = options.pageMarginLeft;
    const marginR = options.pageMarginRight;
    const spacingMm = options.cardSpacing;

    const availableWidth = pageWidth - marginL - marginR;
    const availableHeight = pageHeight - marginT - marginB;

    let cardsPerRow = options.cardsPerRow || Math.floor((availableWidth + spacingMm) / (cardWidthWithBleed + spacingMm));
    let cardsPerColumn = options.cardsPerColumn || Math.floor((availableHeight + spacingMm) / (cardHeightWithBleed + spacingMm));

    cardsPerRow = Math.max(1, cardsPerRow);
    cardsPerColumn = Math.max(1, cardsPerColumn);

    const cardsPerPage = cardsPerRow * cardsPerColumn;
    const totalPages = Math.ceil(csvData.length / cardsPerPage);

    return {
      cardsPerRow,
      cardsPerColumn,
      cardsPerPage,
      totalPages,
      pageWidth,
      pageHeight,
    };
  }, [csvData.length, widthMm, heightMm, options]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCSV = file.name.endsWith('.csv');
    if (!isCSV) {
      setError('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;

      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          let cols = results.meta.fields || [];
          cols = cols.map((col, index) => {
            if (index === 0) {
              return col.replace(/^\ufeff/, '').replace(/^\xef\xbb\xbf/, '');
            }
            return col;
          });

          const data = results.data as any[];

          if (cols.length === 0 || data.length === 0) {
            setError('No data found in file');
            setIsProcessing(false);
            return;
          }

          setColumns(cols);
          setCsvData(data);
          toast.success(`Loaded ${data.length} records with ${cols.length} columns`);
          setIsProcessing(false);
        },
        error: (error) => {
          setError(`Failed to parse CSV: ${error.message}`);
          setIsProcessing(false);
        },
      });
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleLoadFromProject = async () => {
    if (!effectiveProjectId) {
      toast.error('No project selected');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await apiService.dataRecordsAPI.getByProject(effectiveProjectId, { limit: 1000 });
      const records = response?.data || response || [];

      if (records.length === 0) {
        setError('No data records found for this project');
        setIsProcessing(false);
        return;
      }


      // Extract column names from the first record's data_json
      const first = records[0];
      const dataJson = typeof first.data_json === 'string' ? JSON.parse(first.data_json) : first.data_json;
      const cols = Object.keys(dataJson || {});

      if (cols.length === 0) {
        setError('Records contain no data fields');
        setIsProcessing(false);
        return;
      }

      // Map records to a flat object structure
      const mappedData = records.map((record: any) => {
        const data = typeof record.data_json === 'string' ? JSON.parse(record.data_json) : record.data_json;
        const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

        let photoUrl = record.cropped_photo_url || record.photo_url || data.profilePic || data.photo || data.image;

        // Resolve absolute URL
        if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
          if (photoUrl.startsWith('/')) {
            photoUrl = `${backendBase}${photoUrl}`;
          } else {
            // Assume it's a file in project-photos
            photoUrl = `${backendBase}/uploads/project-photos/${effectiveProjectId}/${photoUrl}`;
          }
        }

        console.log(`[BatchPDF] Resolved photo URL for record ${record.id}:`, photoUrl);

        return {
          ...data,
          photo: photoUrl, // Standard field for placeholders
          profilePic: photoUrl,
          photo_url: photoUrl,
          cropped_photo_url: photoUrl,
          recordId: record.id
        };
      });

      setColumns(cols);
      setCsvData(mappedData);

      // 🔥 Auto-map photo placeholders to relevant fields
      const newMappings: Record<string, string> = {};
      templatePhotoPlaceholders.forEach(placeholder => {
        // Look for fields that might contain photos for this placeholder
        const possibleFields = ['profilePic', 'photo', 'image', 'picture', 'photo_url', 'student_image', 'roll_no', 'id'];
        const match = cols.find(c =>
          c.toLowerCase() === placeholder.toLowerCase() ||
          possibleFields.some(pf => c.toLowerCase().includes(pf.toLowerCase()))
        );
        if (match) {
          newMappings[placeholder] = match;
        }
      });
      if (Object.keys(newMappings).length > 0) {
        setPhotoFieldMappings(prev => ({ ...prev, ...newMappings }));
      }

      toast.success(`Loaded ${mappedData.length} records from project`);
    } catch (err: any) {
      console.error('Failed to load project records:', err);
      setError(`Failed to load records: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearData = () => {
    setCsvData([]);
    setColumns([]);
    setGeneratedPDFs([]);
    setProgress(0);
    setUploadedPhotos(new Map());
    setPhotoFieldName('');
  };

  const handlePreview = (record: Record<string, string>) => {
    onPreviewRecord?.(record);
  };

  // Handle ZIP photo upload
  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Please upload a ZIP file containing photos');
      return;
    }

    setIsUploadingPhotos(true);
    setPhotoUploadProgress(0);
    setError(null);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      const imageFiles = Object.keys(contents.files).filter(filename => {
        const lower = filename.toLowerCase();
        return !filename.startsWith('__MACOSX') &&
          !filename.startsWith('.') &&
          (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp'));
      });

      if (imageFiles.length === 0) {
        toast.error('No image files found in ZIP');
        setIsUploadingPhotos(false);
        return;
      }

      toast.info(`Found ${imageFiles.length} images. Uploading...`);

      const projectId = `batch-${Date.now()}`;
      const photoMap = new Map<string, string>();
      const UPLOAD_BATCH_SIZE = 10;

      for (let i = 0; i < imageFiles.length; i += UPLOAD_BATCH_SIZE) {
        const batch = imageFiles.slice(i, i + UPLOAD_BATCH_SIZE);

        await Promise.all(batch.map(async (filename) => {
          try {
            const fileData = await contents.files[filename].async('blob');
            const baseName = filename.split('/').pop() || filename;
            const nameWithoutExt = baseName.replace(/\.[^.]+$/, '');
            const ext = baseName.split('.').pop()?.toLowerCase() || 'jpg';

            const mimeTypes: Record<string, string> = {
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'webp': 'image/webp',
            };
            const contentType = mimeTypes[ext] || 'image/jpeg';
            const typedBlob = new Blob([fileData], { type: contentType });

            const { url: publicUrl } = await apiService.imageAPI.uploadProjectPhoto({
              file: typedBlob,
              projectId,
              fileName: baseName
            });

            if (publicUrl) {
              // Store with multiple key variations for matching
              photoMap.set(nameWithoutExt, publicUrl);
              photoMap.set(nameWithoutExt.toLowerCase(), publicUrl);
              photoMap.set(baseName, publicUrl);
              photoMap.set(baseName.toLowerCase(), publicUrl);
            }
          } catch (err) {
            console.error('Failed to upload:', filename, err);
          }
        }));

        setPhotoUploadProgress(Math.round(((i + batch.length) / imageFiles.length) * 100));
      }

      setUploadedPhotos(photoMap);
      toast.success(`Uploaded ${photoMap.size / 4} photos successfully`);

      // Auto-detect photo field if not set
      if (!photoFieldName && columns.length > 0) {
        const photoFields = ['photo', 'image', 'picture', 'filename', 'file', 'photo_url', 'roll_no', 'rollno', 'id'];
        const detected = columns.find(col => photoFields.some(pf => col.toLowerCase().includes(pf)));
        if (detected) setPhotoFieldName(detected);
      }
    } catch (err) {
      console.error('Failed to process ZIP:', err);
      toast.error('Failed to extract photos from ZIP file');
    } finally {
      setIsUploadingPhotos(false);
      event.target.value = '';
    }
  };

  // 🔥 Auto-fit text: shrinks font size if text overflows the textbox
  const autoFitText = (textbox: any) => {
    if (!textbox || (textbox.type !== 'text' && textbox.type !== 'textbox')) return;

    const maxFontSize = textbox.fontSize || 18;
    const minFontSize = textbox.minFontSize || 6;

    let fontSize = maxFontSize;
    textbox.set({ fontSize });

    // Iteratively reduce font size until text fits
    // Safety break to prevent infinite loops
    let attempts = 0;
    while (attempts < 50) {
      const textHeight = textbox.calcTextHeight();
      const textWidth = textbox.calcTextWidth();

      if (textHeight <= textbox.height && textWidth <= textbox.width) {
        break; // Text fits!
      }

      if (fontSize <= minFontSize) break;

      fontSize -= 0.5;
      textbox.set({ fontSize });
      attempts++;
    }
  };

  const loadTemplateTheFabric = async (design: any, width: number, height: number) => {
    const tempCanvasEl = document.createElement('canvas');
    tempCanvasEl.id = `fabric-batch-${Date.now()}-${Math.random()}`;
    tempCanvasEl.width = width;
    tempCanvasEl.height = height;
    tempCanvasEl.style.position = 'absolute';
    tempCanvasEl.style.left = '-10000px';
    document.body.appendChild(tempCanvasEl);

    const fabricCanvas = new FabricCanvas(tempCanvasEl.id, {
      width: width,
      height: height,
      renderOnAddRemove: false,
    });

    if (design) {
      // Pre-process design to ensure masked-photos load as images (since class might not be registered)
      if (design.objects) {
        design.objects.forEach((obj: any) => {
          if (obj.type === 'masked-photo') {
            obj.type = 'image';
            obj.maskedPhoto = true; // Preserve flag
          }
        });
      }

      await fabricCanvas.loadFromJSON(design);
      // Lock all objects for performance
      fabricCanvas.getObjects().forEach((o: any) => {
        o.selectable = false;
        o.evented = false;
      });
      fabricCanvas.renderAll();
    }

    return { fabricCanvas, tempCanvasEl };
  };

  // Helper to generate a clipPath (mask) for a given shape and dimensions
  const generateClipPath = (shape: string, width: number, height: number) => {
    const minDim = Math.min(width, height);
    let clipPath: any;

    switch (shape) {
      case 'circle':
        clipPath = new Circle({
          radius: minDim / 2,
          originX: 'center',
          originY: 'center',
        });
        break;
      case 'rect':
        clipPath = new Rect({
          width: width,
          height: height,
          originX: 'center',
          originY: 'center',
        });
        break;
      case 'rounded-rect':
        clipPath = new Rect({
          width: width,
          height: height,
          rx: 15,
          ry: 15,
          originX: 'center',
          originY: 'center',
        });
        break;
      case 'star':
        const outerRadius = minDim / 2;
        const innerRadius = minDim / 4;
        const pts = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 10 - Math.PI / 2;
          pts.push({ x: Math.cos(angle) * outerRadius, y: Math.sin(angle) * outerRadius });
          const angleInner = ((i * 4 + 2) * Math.PI) / 10 - Math.PI / 2;
          pts.push({ x: Math.cos(angleInner) * innerRadius, y: Math.sin(angleInner) * innerRadius });
        }
        clipPath = new Polygon(pts, { originX: 'center', originY: 'center' });
        break;
      case 'heart':
        clipPath = new Path('M 0,27.5 C 0,27.5 -25,12.5 -25,-12.5 C -25,-32.5 0,-32.5 0,-12.5 C 0,-32.5 25,-32.5 25,-12.5 C 25,12.5 0,27.5 0,27.5 Z', {
          originX: 'center',
          originY: 'center',
        });
        const heartScale = minDim / 60;
        clipPath.set({ scaleX: heartScale, scaleY: heartScale });
        break;
      case 'triangle':
        clipPath = new Polygon([{ x: 0, y: -minDim / 2 }, { x: minDim / 2, y: minDim / 2 }, { x: -minDim / 2, y: minDim / 2 }], { originX: 'center', originY: 'center' });
        break;
      case 'hexagon':
        const hexPts = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 2;
          hexPts.push({ x: (minDim / 2) * Math.cos(angle), y: (minDim / 2) * Math.sin(angle) });
        }
        clipPath = new Polygon(hexPts, { originX: 'center', originY: 'center' });
        break;
      case 'octagon':
        const octPts = [];
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 - Math.PI / 8;
          octPts.push({ x: (minDim / 2) * Math.cos(angle), y: (minDim / 2) * Math.sin(angle) });
        }
        clipPath = new Polygon(octPts, { originX: 'center', originY: 'center' });
        break;
      case 'pentagon':
        const pentPts = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          pentPts.push({ x: (minDim / 2) * Math.cos(angle), y: (minDim / 2) * Math.sin(angle) });
        }
        clipPath = new Polygon(pentPts, { originX: 'center', originY: 'center' });
        break;
      case 'ellipse':
        clipPath = new Ellipse({ rx: width / 2, ry: height / 2, originX: 'center', originY: 'center' });
        break;
    }
    return clipPath;
  };

  const applyRecordToCanvas = async (fCanvas: FabricCanvas, recordData: any, photoUrls: Record<string, string | null>) => {
    if (!fCanvas) return;

    const objects = fCanvas.getObjects();
    const imageLoads: Promise<void>[] = [];

    // Helper function to resolve photo URL with proper backend base
    const resolvePhotoUrl = (url: string | null | undefined): string | null => {
      if (!url) return null;

      // If already absolute URL or data URL, return as is
      if (url.startsWith('http') || url.startsWith('data:')) {
        return url;
      }

      // Otherwise prepend backend base URL
      const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      if (url.startsWith('/')) {
        return `${backendBase}${url}`;
      }
      return `${backendBase}/${url}`;
    };

    for (const obj of objects) {
      if (!obj) continue;

      // Handle variable replacement in text
      if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
        const dataObj = (obj as any).data || {};
        let text = dataObj.originalText || (obj as any).text || '';
        // Simple variable replacement: {{field}}
        // We can use the simple replacement logic or regex
        let modified = false;

        // Check if strict variable type
        if ((dataObj.type === 'variable' || dataObj.type === 'variable-text') && dataObj.field) {
          const field = dataObj.field;
          const val = recordData[field] || '';
          text = String(val);
          modified = true;
        } else {
          // Check for mustache syntax {{field}}
          const updatedText = text.replace(/\{\{([^}]+)\}\}/g, (match: string, p1: string) => {
            const field = p1.trim();
            if (recordData[field] !== undefined) {
              modified = true;
              return String(recordData[field]);
            }
            return match;
          });
          if (modified) text = updatedText;
        }

        if (modified) {
          (obj as any).set({ text });
          // Auto fit if configured
          if ((obj as any).data?.autoFontSize) {
            autoFitText(obj);
          }
        }
      }
      // Handle VDP Text Tool
      else if (obj.type === 'vdp-text') {
        const vdp = obj as any;
        let text = vdp.textContent || '';
        let modified = false;

        const updatedText = text.replace(/\{\{([^}]+)\}\}/g, (match: string, p1: string) => {
          const field = p1.trim();
          if (recordData[field] !== undefined) {
            modified = true;
            return String(recordData[field]);
          }
          return match;
        });

        if (modified && typeof vdp.setText === 'function') {
          vdp.setText(updatedText);
        }
      }

      // Handle Photo/Image replacement
      // 1. Check for explicit photo placeholders, variable photos, or existing preview photos
      if ((obj as any).data?.isPhotoPlaceholder ||
        (obj as any).data?.type === 'photo-placeholder' ||
        (obj as any).data?.type === 'preview-photo' ||
        ((obj as any).data?.type === 'variable' && (obj as any).data?.isPhoto)) {

        const placeholderName = (obj as any).data?.field || (obj as any).data?.name || (obj as any).data?.fieldName || 'photo';
        let photoUrl = photoUrls[placeholderName];

        // Resolve the photo URL
        photoUrl = resolvePhotoUrl(photoUrl);

        console.log(`[Batch] Photo placeholder "${placeholderName}" resolved URL:`, photoUrl);

        if (photoUrl) {
          imageLoads.push(new Promise<void>((resolve) => {
            const originalObj = obj as any;
            const existingClipPath = originalObj.clipPath; // Preserve clip path (e.g. circle mask)

            FabricImage.fromURL(photoUrl, { crossOrigin: 'anonymous' }).then((img: FabricImage) => {
              console.log(`[Batch] Successfully loaded photo for placeholder "${placeholderName}"`);

              // Match dimensions and position
              // We need to scale the image to 'cover' the placeholder box
              const targetWidth = originalObj.width * (originalObj.scaleX || 1);
              const targetHeight = originalObj.height * (originalObj.scaleY || 1);
              const scaleX = targetWidth / (img.width || 1);
              const scaleY = targetHeight / (img.height || 1);
              const scale = Math.max(scaleX, scaleY); // 'Cover' mode

              img.set({
                left: originalObj.left,
                top: originalObj.top,
                scaleX: scale,
                scaleY: scale,
                opacity: 1,
                originX: originalObj.originX || 'left',
                originY: originalObj.originY || 'top',
                angle: originalObj.angle || 0,
                objectCaching: false,
                clipPath: originalObj.clipPath || (originalObj.data?.shape && originalObj.data.shape !== 'rect' ? generateClipPath(originalObj.data.shape, originalObj.width, originalObj.height) : undefined)
              });

              if (img.clipPath) {
                img.clipPath.set({
                  absolutePositioned: false,
                  originX: 'center',
                  originY: 'center',
                  left: 0,
                  top: 0
                });
              }

              img.setCoords();
              fCanvas.remove(originalObj);
              fCanvas.add(img);
              resolve();
            }).catch((err) => {
              console.error(`[Batch] Failed to load photo for placeholder "${placeholderName}":`, err);
              resolve();
            });
          }));
        } else {
          console.warn(`[Batch] No photo URL found for placeholder: ${placeholderName}`);
        }
      }
      // 2. Check for generic images with variableName
      else if (obj.type === 'image' && (obj as any).data?.variableName) {
        const varName = (obj as any).data.variableName;
        let photoUrl = photoUrls[varName];
        photoUrl = resolvePhotoUrl(photoUrl);

        console.log(`[Batch] Image variable "${varName}" resolved URL:`, photoUrl);

        if (photoUrl) {
          imageLoads.push(new Promise<void>((resolve) => {
            const originalObj = obj as any;
            FabricImage.fromURL(photoUrl, { crossOrigin: 'anonymous' }).then((img: FabricImage) => {
              console.log(`[Batch] Successfully loaded image for variable "${varName}"`);

              img.set({
                left: originalObj.left,
                top: originalObj.top,
                scaleX: originalObj.scaleX || 1,
                scaleY: originalObj.scaleY || 1,
                angle: originalObj.angle || 0,
                originX: originalObj.originX || 'left',
                originY: originalObj.originY || 'top',
                objectCaching: false
              });
              img.setCoords();
              fCanvas.remove(originalObj);
              fCanvas.add(img);
              resolve();
            }).catch((err) => {
              console.error(`[Batch] Failed to load image for variable "${varName}":`, err);
              resolve();
            });
          }));
        }
      }
      // 3. Handle Masked Photo Objects
      else if ((obj as any).maskedPhoto || (obj as any).type === 'masked-photo') {
        const config = (obj as any).maskConfig;
        const binding = config?.variableBinding || (obj as any).variableBinding;

        console.log(`[Batch] Found masked photo object:`, { binding, config, objData: (obj as any).data });

        if (binding) {
          const field = typeof binding === 'string' ? binding : binding.field;
          let photoUrl = photoUrls[field];
          photoUrl = resolvePhotoUrl(photoUrl);

          console.log(`[Batch] Masked photo binding field: "${field}", resolved URL:`, photoUrl);

          if (photoUrl) {
            imageLoads.push(new Promise<void>((resolve) => {
              const originalObj = obj as any;

              // Create a new MaskedPhotoObject with the photo URL
              // Ensure we pass 'size' for the mask to render correctly
              const maskedObj = new MaskedPhotoObject({
                ...config,
                photoSrc: photoUrl,
                size: config?.size || originalObj.width || 100,
                width: config?.width || originalObj.width || 100,
                height: config?.height || originalObj.height || 100,
              });

              console.log(`[Batch] Attempting to render masked object with url: ${photoUrl}`);

              maskedObj.renderToFabric({ Image: FabricImage }, {}).then((newImg: any) => {
                console.log(`[Batch] Successfully rendered masked object for field "${field}"`);

                newImg.set({
                  left: originalObj.left,
                  top: originalObj.top,
                  scaleX: originalObj.scaleX || 1,
                  scaleY: originalObj.scaleY || 1,
                  angle: originalObj.angle || 0,
                  originX: originalObj.originX || 'left',
                  originY: originalObj.originY || 'top',
                  selectable: false,
                  evented: false,
                  objectCaching: false
                });

                newImg.setCoords();
                fCanvas.remove(originalObj);
                fCanvas.add(newImg);
                resolve();
              }).catch((err: any) => {
                console.error(`[Batch] Failed to render masked object for field "${field}":`, err);
                resolve();
              });
            }));
          } else {
            console.warn(`[Batch] No photo URL found for masked photo field: ${field}`);
          }
        } else {
          console.warn(`[Batch] Masked photo object has no binding:`, obj);
        }
      }
      // 4. Handle Barcode/QRCode Dynamic Generation
      else if ((obj as any).data?.isBarcode || (obj as any).data?.isQRCode) {
        const dataObj = (obj as any).data;
        const type = dataObj.isBarcode ? 'barcode' : 'qrcode';
        const fieldMapping = dataObj.dataField || (dataObj.isBarcode ? 'barcode' : 'qrcode');

        let rawValue = fieldMapping;
        // Resolve variable expression if present
        const resolvedValue = rawValue.replace(/\{\{([^}]+)\}\}/g, (match: string, p1: string) => {
          const field = p1.trim();
          return recordData[field] !== undefined ? String(recordData[field]) : match;
        });

        // Regenerate image
        imageLoads.push(new Promise<void>(async (resolve) => {
          try {
            const { generateBarcodeDataUrl, generateQrCodeDataUrl } = await import('@/lib/codeGenerators');
            let newDataUrl: string;

            if (dataObj.isBarcode) {
              newDataUrl = await generateBarcodeDataUrl(resolvedValue, {
                format: dataObj.barcodeFormat || 'CODE128',
                width: dataObj.barcodeWidth || 2,
                height: dataObj.barcodeHeight || 50,
                displayValue: dataObj.showValue !== false,
              });
            } else {
              newDataUrl = await generateQrCodeDataUrl(resolvedValue, {
                margin: dataObj.qrMargin || 2,
              });
            }

            const originalObj = obj as any;
            FabricImage.fromURL(newDataUrl, { crossOrigin: 'anonymous' }).then((img: FabricImage) => {
              img.set({
                left: originalObj.left,
                top: originalObj.top,
                scaleX: originalObj.scaleX || 1,
                scaleY: originalObj.scaleY || 1,
                angle: originalObj.angle || 0,
                originX: originalObj.originX || 'left',
                originY: originalObj.originY || 'top',
                objectCaching: false
              });
              img.setCoords();
              fCanvas.remove(originalObj);
              fCanvas.add(img);
              resolve();
            });
          } catch (e) {
            console.error(`[Batch] Failed to regenerate ${type} for value "${resolvedValue}":`, e);
            resolve();
          }
        }));
      }
    }

    if (imageLoads.length > 0) {
      console.log(`[Batch] Waiting for ${imageLoads.length} images to load...`);
      await Promise.all(imageLoads);
      console.log(`[Batch] All images loaded successfully`);
    }

    fCanvas.renderAll();
    fCanvas.requestRenderAll();
  };

  const handleGenerate = async (previewMode = false) => {
    // Start generation process
    if (csvData.length === 0) {
      toast.error('Please upload CSV data first');
      return;
    }

    if (previewMode) {
      setIsPreviewing(true);
    } else {
      setIsGenerating(true);
      setProgress(0);
      setGeneratedPDFs([]);
    }

    try {

      // 1. Setup PDF and loop based on configured options
      // Calculate layout
      const pageInfo = previewInfo;
      if (!pageInfo) throw new Error('Could not calculate page layout');

      // Use higher DPI for print quality
      const dpi = 300;
      const pxScale = dpi / 25.4; // px per mm
      // Fabric canvas usually runs at 96 DPI (3.78 px/mm). We should match the export resolution.
      const exportMultiplier = 300 / 96; // ~3.125

      // Use the design JSON passed from props to ensure we have the templates
      // NOT the current canvas which might be in preview mode
      const design = designJson;
      const backDesign = hasBackSide && backDesignJson ? backDesignJson : null;

      console.log('[Batch] Starting generation with design:', {
        hasDesign: !!design,
        objectsCount: design?.objects?.length,
        isBackAvailable: !!backDesign
      });

      // We will create hidden canvases to render each card
      // We use the same dimensions as the screen canvas but render to higher res image
      const canvasWidth = canvas?.getWidth() || (widthMm * 3.78);
      const canvasHeight = canvas?.getHeight() || (heightMm * 3.78);

      // Create hidden canvases
      const { fabricCanvas: frontRenderCanvas, tempCanvasEl: frontEl } = await loadTemplateTheFabric(design, canvasWidth, canvasHeight);
      let backRenderCanvas: FabricCanvas | null = null;
      let backEl: HTMLCanvasElement | null = null;

      if (hasBackSide && backDesign) {
        const res = await loadTemplateTheFabric(backDesign, canvasWidth, canvasHeight);
        backRenderCanvas = res.fabricCanvas;
        backEl = res.tempCanvasEl;
      }

      // Initialize PDF
      const pdf = new jsPDF({
        orientation: options.orientation,
        unit: 'mm',
        format: options.pageSize === 'card' ? [widthMm + (options.includeBleed ? 6 : 0), heightMm + (options.includeBleed ? 6 : 0)] : options.pageSize.toLowerCase()
      });

      const records = previewMode ? csvData.slice(0, pageInfo.cardsPerPage) : csvData;

      const cardsPerPage = pageInfo.cardsPerPage;

      const totalPages = Math.ceil(records.length / cardsPerPage);

      // Layout calculations
      const cardW = widthMm;
      const cardH = heightMm;
      // If bleed is ON, the image we put on PDF should include bleed? 
      // Usually bleed means the printed area is larger.
      // JS PDF logic:
      // If imposition (A4), we place cards at specific X,Y.
      // If crop marks enabled, we draw lines.

      // For simplicity in this implementation:
      // We'll capture the canvas as is. If the canvas represents the cut size, we can't easily add bleed unless the canvas ALREADY has bleed.
      // Assuming the canvas IS the design size (widthMm x heightMm). 
      // The "Check Bleed" option usually visualizes it.

      const startX = options.pageMarginLeft;
      const startY = options.pageMarginTop;
      const spaceX = options.cardSpacing;
      const spaceY = options.cardSpacing;

      toast.info(`Generating ${totalPages} pages...`);

      for (let i = 0; i < records.length; i++) {
        const row = records[i];

        // Prepare photo URLs for this record
        const photoUrls: Record<string, string | null> = {};
        templatePhotoPlaceholders.forEach(placeholder => {
          // ... (existing photo mapping logic) ...
          let photoUrl: string | null = null;
          const mappedColumn = photoFieldMappings[placeholder] || photoFieldName;

          // 1. Check for manual ZIP upload match first (if any)
          if (uploadedPhotos.size > 0 && mappedColumn && row[mappedColumn]) {
            const val = String(row[mappedColumn]).trim();
            photoUrl = uploadedPhotos.get(val) || uploadedPhotos.get(val.toLowerCase()) || uploadedPhotos.get(val.replace(/\.[^.]+$/, ''));
          }

          // 2. Fallback: Check for URL in record data (loaded from Project or CSV)
          if (!photoUrl) {
            // Priority: AI Processed > Explicitly mapped > Default fields
            if (row.cropped_photo_url) {
              photoUrl = row.cropped_photo_url;
            } else if (row.photo_url) {
              photoUrl = row.photo_url;
            } else if (mappedColumn && row[mappedColumn]) {
              photoUrl = String(row[mappedColumn]);
            } else if (row.photo) {
              photoUrl = row.photo;
            } else if (row.profilePic) {
              photoUrl = row.profilePic;
            } else if (row.image) {
              photoUrl = row.image;
            }
          }

          // 3. Fallback: aggressive search in uploaded photos if enabled
          if (!photoUrl && uploadedPhotos.size > 0) {
            const tryFields = ['roll_no', 'rollno', 'id', 'student_id', 'filename', 'name'];
            for (const field of tryFields) {
              const val = row[field] || row[field.toLowerCase()];
              if (val) {
                const strVal = String(val).trim();
                const found = uploadedPhotos.get(strVal) || uploadedPhotos.get(strVal.toLowerCase());
                if (found) {
                  photoUrl = found;
                  break;
                }
              }
            }
          }

          if (photoUrl) {
            console.log(`[Batch] Found photo for placeholder "${placeholder}":`, photoUrl);
            photoUrls[placeholder] = photoUrl;
          } else {
            console.warn(`[Batch] Missing photo for placeholder "${placeholder}" in record ${i}`);
          }
        });

        // Render Front
        // Reload design to reset state (or just update objects)
        // Updating is faster than reloading JSON every time
        // But we must revert changes from previous record if we update in place?
        // Actually updating text is non-destructive to structure. Images replace objects.
        // Re-loading JSON is safest but slower. 
        // Optimization: Let's reload JSON every time to ensure clean state for images.
        await frontRenderCanvas.loadFromJSON(design);
        await applyRecordToCanvas(frontRenderCanvas, row, photoUrls);

        const frontImgData = frontRenderCanvas.toDataURL({ format: 'png', multiplier: exportMultiplier });

        // Calculate Position
        const pageIndex = Math.floor(i / cardsPerPage);
        const posInPage = i % cardsPerPage;

        // Add new page if needed (and not first page)
        if (posInPage === 0 && i > 0) {
          pdf.addPage();
        }

        const colIndex = posInPage % pageInfo.cardsPerRow;
        const rowIndex = Math.floor(posInPage / pageInfo.cardsPerRow);

        const xPos = startX + colIndex * (cardW + spaceX);
        const yPos = startY + rowIndex * (cardH + spaceY);

        // Place Front Image
        // Note: If bleed is enabled in options, does the canvas happen to be larger?
        // The canvas size is fixed to widthMm.
        // If the user wants bleed, they should design with bleed.
        // Here we just place the image.
        pdf.addImage(frontImgData, 'PNG', xPos, yPos, cardW, cardH);

        // Add Crop Marks
        if (options.includeCropMarks) {
          pdf.setLineWidth(0.1);
          pdf.setDrawColor(0, 0, 0); // Black marks
          // TL
          pdf.line(xPos - 2, yPos, xPos - 5, yPos); // Horiz
          pdf.line(xPos, yPos - 2, xPos, yPos - 5); // Vert
          // TR
          pdf.line(xPos + cardW + 2, yPos, xPos + cardW + 5, yPos);
          pdf.line(xPos + cardW, yPos - 2, xPos + cardW, yPos - 5);
          // BL
          pdf.line(xPos - 2, yPos + cardH, xPos - 5, yPos + cardH);
          pdf.line(xPos, yPos + cardH + 2, xPos, yPos + cardH + 5);
          // BR
          pdf.line(xPos + cardW + 2, yPos + cardH, xPos + cardW + 5, yPos + cardH);
          pdf.line(xPos + cardW, yPos + cardH + 2, xPos + cardW, yPos + cardH + 5);
        }

        // Handle Back Side (If applicable)
        // For now, simpler implementation: If back side exists, we probably need a separate page loop 
        // OR alternating pages (Front Page, Back Page) if doing double-sided print manually
        // OR sequential pages if page-per-card.
        // The Logic: Usually for imposition, you print all fronts, then all backs.

        // Update progress
        setProgress(Math.round(((i + 1) / records.length) * 100));
      }

      // Handle Back Side Generation (New pages after all fronts)
      if (hasBackSide && backRenderCanvas && backDesign) {
        pdf.addPage(); // Start back section
        toast.info("Generating back sides...");

        // We need to mirror the layout for back side if printing double sided on tumble?
        // Usually col 1 becomes col N for back side alignment.
        // Let's implement standard "left-to-right" placement for now, user might handle paper flip

        for (let i = 0; i < records.length; i++) {
          const row = records[i];
          // Reuse photo urls if needed (rare for back, but possible)

          await backRenderCanvas.loadFromJSON(backDesign);
          await applyRecordToCanvas(backRenderCanvas, row, {}); // No photos usually on back? or reuse

          const backImgData = backRenderCanvas.toDataURL({ format: 'png', multiplier: exportMultiplier });

          const pageIndex = Math.floor(i / cardsPerPage);
          const posInPage = i % cardsPerPage;

          // Add new page check
          // We need to track pages relative to back-start
          if (posInPage === 0 && i > 0) {
            pdf.addPage();
          }

          // Mirror column for back side alignment
          // If Front is Col 0, Back should be Col (Max-0)? 
          // Standard ID card printers do this automatically. 
          // Manual sheet printing: 
          // Col 0 (Left) on Front matches Col N (Right) on Back.
          const colIndexRaw = posInPage % pageInfo.cardsPerRow;
          // Mirror column index
          const colIndex = (pageInfo.cardsPerRow - 1) - colIndexRaw;

          const rowIndex = Math.floor(posInPage / pageInfo.cardsPerRow);

          const xPos = startX + colIndex * (cardW + spaceX);
          const yPos = startY + rowIndex * (cardH + spaceY);

          pdf.addImage(backImgData, 'PNG', xPos, yPos, cardW, cardH);

          // Crop marks for back
          if (options.includeCropMarks) {
            pdf.setLineWidth(0.1);
            pdf.setDrawColor(0, 0, 0);
            // ... (same as front but at new pos)
            // TL
            pdf.line(xPos - 2, yPos, xPos - 5, yPos);
            pdf.line(xPos, yPos - 2, xPos, yPos - 5);
            // TR
            pdf.line(xPos + cardW + 2, yPos, xPos + cardW + 5, yPos);
            pdf.line(xPos + cardW, yPos - 2, xPos + cardW, yPos - 5);
            // BL
            pdf.line(xPos - 2, yPos + cardH, xPos - 5, yPos + cardH);
            pdf.line(xPos, yPos + cardH + 2, xPos, yPos + cardH + 5);
            // BR
            pdf.line(xPos + cardW + 2, yPos + cardH, xPos + cardW + 5, yPos + cardH);
            pdf.line(xPos + cardW, yPos + cardH + 2, xPos + cardW, yPos + cardH + 5);
          }
        }
      }

      // Save PDF
      // Save or Open PDF
      if (previewMode) {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.info('Preview opened in new tab');
      } else {
        const filename = `${templateName}_Batch_${new Date().getTime()}.pdf`;
        pdf.save(filename);
        toast.success(`PDF generated successfully!`);
      }


      // Cleanup
      if (frontEl && frontEl.parentNode) {
        frontEl.parentNode.removeChild(frontEl);
      }
      if (backEl && backEl.parentNode) {
        backEl.parentNode.removeChild(backEl);
      }

      toast.success(`PDF generated successfully!`);

    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF: ' + error.message);
    } finally {
      if (previewMode) {
        setIsPreviewing(false);
      } else {
        setIsGenerating(false);
        setProgress(100);
      }
    }
  };

  return (
    <div className="absolute inset-y-0 left-0 sm:left-12 w-full sm:w-80 bg-card border-r shadow-xl z-30 sm:z-20 flex flex-col transition-all duration-300">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Batch PDF Generation
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* CSV Upload */}
          {csvData.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Upload className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Import CSV Data</p>
                  <p className="text-xs text-muted-foreground">
                    Upload a CSV file with your data
                  </p>
                </div>

                <label htmlFor="csv-upload">
                  <Button variant="outline" size="sm" disabled={isProcessing} asChild>
                    <span>
                      {isProcessing ? 'Processing...' : 'Import CSV'}
                    </span>
                  </Button>
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-2 w-full mt-2">
                  <div className="h-px flex-1 bg-border"></div>
                  <span className="text-[10px] text-muted-foreground uppercase">OR</span>
                  <div className="h-px flex-1 bg-border"></div>
                </div>

                {!projectId && availableProjects.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <Label className="text-xs">Select Project</Label>
                    <Select
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background w-full">
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProjects.map((p: any) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.project_name || p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  variant="default"
                  size="sm"
                  className="w-full mt-2"
                  disabled={isProcessing || !effectiveProjectId}
                  onClick={handleLoadFromProject}
                >
                  <Database className="h-3.5 w-3.5 mr-2" />
                  Load Records from Project
                </Button>
              </div>

              {error && (
                <div className="mt-3 p-2 bg-destructive/10 rounded text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Data Summary */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Data Loaded
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={handleClearData}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Records:</strong> {csvData.length}</p>
                  <p><strong>Columns:</strong> {columns.join(', ')}</p>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-2">
                <Label className="text-xs">Data Preview (first 5 rows)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 text-xs">#</TableHead>
                          {columns.slice(0, 3).map((col) => (
                            <TableHead key={col} className="text-xs min-w-20">{col}</TableHead>
                          ))}
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 5).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{idx + 1}</TableCell>
                            {columns.slice(0, 3).map((col) => (
                              <TableCell key={col} className="text-xs truncate max-w-20">
                                {row[col] || '-'}
                              </TableCell>
                            ))}
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handlePreview(row)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Layout Preview */}
              {previewInfo && (
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Grid3X3 className="h-3 w-3" />
                    Layout Preview
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Cards/page:</span>
                      <span className="ml-1 font-medium">{previewInfo.cardsPerPage}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total pages:</span>
                      <span className="ml-1 font-medium">{previewInfo.totalPages}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Layout:</span>
                      <span className="ml-1 font-medium">{previewInfo.cardsPerRow}×{previewInfo.cardsPerColumn}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Upload Section */}
              <div className="p-3 border rounded-lg space-y-3 bg-background">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <FolderArchive className="h-3 w-3" />
                  Photo Upload (Optional)
                </div>

                {uploadedPhotos.size === 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Upload a ZIP with photos. Filenames should match a field in your CSV (e.g., roll_no.jpg).
                    </p>
                    <label htmlFor="zip-upload">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploadingPhotos}
                        className="w-full"
                        asChild
                      >
                        <span>
                          {isUploadingPhotos ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Uploading {photoUploadProgress}%
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-3 w-3 mr-1" />
                              Upload Photos ZIP
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="zip-upload"
                      type="file"
                      accept=".zip"
                      onChange={handleZipUpload}
                      className="hidden"
                    />
                    {isUploadingPhotos && (
                      <Progress value={photoUploadProgress} className="h-1" />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {Math.floor(uploadedPhotos.size / 4)} photos uploaded
                    </div>

                    {/* Photo Field Mapping */}
                    <div className="space-y-2 p-2 bg-muted/30 rounded-md">
                      <Label className="text-xs font-medium">Map Photo Placeholders to CSV Columns</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Match template photo placeholders with your CSV column for filename lookup.
                      </p>

                      {templatePhotoPlaceholders.map((placeholder) => (
                        <div key={placeholder} className="flex items-center gap-2">
                          <span className="text-xs font-medium min-w-20 truncate" title={placeholder}>
                            {placeholder}:
                          </span>
                          <Select
                            value={photoFieldMappings[placeholder] || photoFieldName || ''}
                            onValueChange={(value) => {
                              setPhotoFieldMappings(prev => ({
                                ...prev,
                                [placeholder]: value
                              }));
                              // Also set the main photo field if not set
                              if (!photoFieldName) setPhotoFieldName(value);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                              <SelectValue placeholder="Select CSV column" />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                              {columns.map((col) => (
                                <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => {
                        setUploadedPhotos(new Map());
                        setPhotoFieldName('');
                        // Clear manual selection if not prop-driven
                        if (!projectId) setSelectedProjectId(undefined);
                        setPhotoFieldMappings({});
                        handleClearData();
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Photos
                    </Button>
                  </div>
                )}
              </div>

              {/* PDF Options */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">PDF Options</Label>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Page Size</Label>
                    <Select
                      value={options.pageSize}
                      onValueChange={(value: any) => setOptions({ ...options, pageSize: value })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="A3">A3</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                        <SelectItem value="card">Single Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Orientation</Label>
                    <Select
                      value={options.orientation}
                      onValueChange={(value: any) => setOptions({ ...options, orientation: value })}
                      disabled={options.pageSize === 'card'}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {options.pageSize !== 'card' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Spacing (mm)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={options.cardSpacing}
                          onChange={(e) => setOptions({ ...options, cardSpacing: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1 opacity-50 cursor-not-allowed">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Auto-Detection</Label>
                        <div className="h-8 flex items-center px-3 border rounded-md text-[10px] bg-muted">
                          {previewInfo?.cardsPerRow}x{previewInfo?.cardsPerColumn} Grid
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Page Margins (mm)</Label>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Top</Label>
                          <Input
                            type="number"
                            min={0}
                            value={options.pageMarginTop}
                            onChange={(e) => setOptions({ ...options, pageMarginTop: parseInt(e.target.value) || 0 })}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Bottom</Label>
                          <Input
                            type="number"
                            min={0}
                            value={options.pageMarginBottom}
                            onChange={(e) => setOptions({ ...options, pageMarginBottom: parseInt(e.target.value) || 0 })}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Left</Label>
                          <Input
                            type="number"
                            min={0}
                            value={options.pageMarginLeft}
                            onChange={(e) => setOptions({ ...options, pageMarginLeft: parseInt(e.target.value) || 0 })}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Right</Label>
                          <Input
                            type="number"
                            min={0}
                            value={options.pageMarginRight}
                            onChange={(e) => setOptions({ ...options, pageMarginRight: parseInt(e.target.value) || 0 })}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Include Bleed (3mm)</Label>
                    <Switch
                      checked={options.includeBleed}
                      onCheckedChange={(checked) => setOptions({ ...options, includeBleed: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Crop Marks</Label>
                    <Switch
                      checked={options.includeCropMarks}
                      onCheckedChange={(checked) => setOptions({ ...options, includeCropMarks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show Serial Numbers</Label>
                    <Switch
                      checked={options.showSerialNumbers}
                      onCheckedChange={(checked) => setOptions({ ...options, showSerialNumbers: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show Page Numbers</Label>
                    <Switch
                      checked={options.showPageNumbers}
                      onCheckedChange={(checked) => setOptions({ ...options, showPageNumbers: checked })}
                    />
                  </div>

                  {hasBackSide && (
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Separate Front/Back</Label>
                      <Switch
                        checked={options.separateFrontBack}
                        onCheckedChange={(checked) => setOptions({ ...options, separateFrontBack: checked })}
                      />
                    </div>
                  )}
                </div>

                {/* Serial Number Options */}
                {options.showSerialNumbers && (
                  <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                    <Label className="text-xs font-medium">Serial Number Settings</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Prefix</Label>
                        <Input
                          type="text"
                          placeholder="e.g., ID-"
                          value={options.serialNumberPrefix}
                          onChange={(e) => setOptions({ ...options, serialNumberPrefix: e.target.value })}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Start From</Label>
                        <Input
                          type="number"
                          min={1}
                          value={options.startingSerialNumber}
                          onChange={(e) => setOptions({ ...options, startingSerialNumber: parseInt(e.target.value) || 1 })}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress */}
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {totalBatches > 1
                        ? `Batch ${currentBatch} of ${totalBatches}...`
                        : 'Generating...'
                      }
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}

              {/* Generated PDFs */}
              {generatedPDFs.length > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    PDFs Generated Successfully
                  </div>
                  <div className="space-y-1">
                    {generatedPDFs.map((pdf, index) => (
                      <a
                        key={index}
                        href={pdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download {pdf.side === 'back' ? 'Back' : 'Front'} PDF {generatedPDFs.length > 2 ? `(Part ${Math.floor(index / 2) + 1})` : ''}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="pt-2 flex gap-2">
                <Button

                  variant="outline"
                  className="flex-1"
                  disabled={isGenerating || isProcessing || isPreviewing || csvData.length === 0}
                  onClick={() => handleGenerate(true)}
                >
                  {isPreviewing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Previewing...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview PDF
                    </>
                  )}
                </Button>

                <Button
                  className="flex-1"
                  disabled={isGenerating || isProcessing || isPreviewing || csvData.length === 0}
                  onClick={() => handleGenerate(false)}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate PDF
                    </>
                  )}
                </Button>
              </div>

            </>
          )}

          {/* Tips */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
            <p className="font-medium">Tips:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Use placeholders like {'{{name}}'} in your template</li>
              <li>Column names should match placeholders</li>
              <li>Click eye icon to preview a record</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
