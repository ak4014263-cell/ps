import { useEffect, useRef, useState, useCallback } from 'react';
import { Rect, Circle, Textbox, FabricImage, Line, Triangle, Polygon, Ellipse, Gradient, Point, Canvas as FabricCanvas } from 'fabric';
import { gradientConfigToFabric } from './DesignerGradientPicker';
import { DesignerToolbar, ToolType } from './DesignerToolbar';
import { DesignerToolsSidebar, SidebarTab, ToolType as SidebarToolType } from './DesignerToolsSidebar';
import { DesignerElementsPanel } from './DesignerElementsPanel';
import { DesignerRightPanel } from './DesignerRightPanel';
import { DesignerLayoutPanel } from './DesignerLayoutPanel';
import { DesignerBackgroundPanel } from './DesignerBackgroundPanel';
import { DesignerImagesPanel, PhotoShape } from './DesignerImagesPanel';
import { DesignerCodeGenerator } from './DesignerCodeGenerator';
import { DesignerSignatureField } from './DesignerSignatureField';
import { DesignerContextMenu } from './DesignerContextMenu';
import { DesignerDataPreviewPanel } from './DesignerDataPreviewPanel';
import { DesignerTextToolbar } from './DesignerTextToolbar';
import { DesignerAlignmentToolbar } from './DesignerAlignmentToolbar';
import { DesignerLibraryPanel } from './DesignerLibraryPanel';
import { DesignerBatchPDFPanel } from './DesignerBatchPDFPanel';
import { DesignerHeader } from './DesignerHeader';
import { DesignerCanvasToolbar } from './DesignerCanvasToolbar';
import { DesignerPageManager, PageData } from './DesignerPageManager';
import { CanvasOverlays } from './CanvasOverlays';
import { CanvasRuler } from './CanvasRuler';
import FabricCanvasComponent from './FabricCanvas'; // Import the new component
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setupAutoFontSizeListeners, applyAutoFontSize } from '@/lib/autoFontSize';
import { VDPText, VDPFunctionType } from '@/lib/vdpText';
import { DesignerVDPPanel } from './DesignerVDPPanel';

// Helper to generate UUIDs (fallback for insecure contexts where crypto.randomUUID is unavailable)
function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const PRESET_SIZES = [
  { name: 'ID Card (CR80)', width: 85.6, height: 53.98 },
  { name: 'ID Card Portrait', width: 53.98, height: 85.6 },
  { name: 'A4', width: 210, height: 297 },
  { name: 'A5', width: 148, height: 210 },
  { name: 'A6', width: 105, height: 148 },
  { name: 'Business Card', width: 85, height: 55 },
  { name: 'Certificate', width: 297, height: 210 },
  { name: 'Badge (Round)', width: 75, height: 75 },
  { name: 'Custom', width: 0, height: 0 },
];

interface ProjectClient {
  id: string;
  name: string;
  institution_name: string;
  phone?: string | null;
  email?: string | null;
  designation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
}

interface AdvancedTemplateDesignerProps {
  editTemplate?: any;
  onBack?: () => void;
  projectId?: string;
  projectClient?: ProjectClient;
}

/**
 * AdvancedTemplateDesigner - Main template design component
 * 
 * Comprehensive template designer with support for:
 * - Multi-page templates with front and back side design
 * - Advanced object manipulation (alignment, z-index, locking, visibility)
 * - Background and gradient support with image uploads
 * - Variable/field substitution with {{fieldName}} placeholders
 * - Data preview with automatic font sizing
 * - Full undo/redo history (50-state buffer)
 * - Keyboard shortcuts and touch gestures
 * - Snap-to-grid alignment guides with visual feedback
 * - Custom fonts and shapes library integration
 * - Export to PNG with 3x resolution multiplier
 * 
 * @component
 * @example
 * <AdvancedTemplateDesigner
 *   editTemplate={templateData}
 *   onBack={() => navigate(-1)}
 *   projectId="proj-123"
 *   projectClient={clientData}
 * />
 * 
 * @param {Object} props - Component props
 * @param {any} [props.editTemplate] - Template data to load for editing
 * @param {() => void} [props.onBack] - Callback when user clicks back
 * @param {string} [props.projectId] - Project context for auto-populating client data
 * @param {ProjectClient} [props.projectClient] - Client data to auto-populate
 */
export function AdvancedTemplateDesigner({ editTemplate, onBack, projectId, projectClient }: AdvancedTemplateDesignerProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [backFabricCanvas, setBackFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [hasBackSide, setHasBackSide] = useState(false);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [clipboard, setClipboard] = useState<any>(null);

  // Pan tool state - use refs to avoid re-registering event handlers
  const isPanningRef = useRef(false);
  const lastPanPositionRef = useRef<{ x: number; y: number } | null>(null);
  const activeToolRef = useRef<ToolType>(activeTool);

  // Keep ref in sync with state
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // History for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef<string[]>([]); // Ref to track history for closure access
  const historyIndexRef = useRef(-1); // Ref to track current index for closure access
  const isHistoryActionRef = useRef(false);
  const historyDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHistorySaveRef = useRef(false);

  // Template settings
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [category, setCategory] = useState('ID Card');
  const [widthMm, setWidthMm] = useState(85.6);
  const [heightMm, setHeightMm] = useState(53.98);
  const [isPublic, setIsPublic] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sidebar state
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab | null>(null);

  // Margin settings
  const [marginTop, setMarginTop] = useState(1);
  const [marginLeft, setMarginLeft] = useState(1);
  const [marginRight, setMarginRight] = useState(1);
  const [marginBottom, setMarginBottom] = useState(1);

  // Background state
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [hasBackgroundImage, setHasBackgroundImage] = useState(false);

  // Snap to grid state
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);

  // Guides state
  const [showGuides, setShowGuides] = useState(true);
  const [showTopIndicator, setShowTopIndicator] = useState(true);
  const [bleedMm, setBleedMm] = useState(3);
  const [safeZoneMm, setSafeZoneMm] = useState(4);

  // Custom fonts and shapes
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [customShapes, setCustomShapes] = useState<{ name: string; url: string }[]>([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  });

  // Manual save only (auto-save removed)

  // Data preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Multi-page state
  const [pages, setPages] = useState<PageData[]>([
    { id: generateUUID(), name: 'Page 1', designJson: null }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Store last used text settings for new text elements
  const lastTextSettingsRef = useRef({
    fontSize: 14,
    fontFamily: 'Arial',
    fill: '#000000',
    textCase: 'none' as 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'sentence',
    autoFontSize: false,
    wordWrap: true,
  });

  // Ref to access handlePreviewData inside addPlaceholder which is defined before handlePreviewData
  const handlePreviewDataRef = useRef<((data: any) => void) | null>(null);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const activeCanvas = activeSide === 'front' ? fabricCanvas : backFabricCanvas;

  const setupCanvas = (canvas: FabricCanvas) => {
    // Create a clip path to constrain objects within canvas bounds
    const clipRect = new Rect({
      left: 0,
      top: 0,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      absolutePositioned: true,
    });
    canvas.clipPath = clipRect;

    // Set selection style for dotted borders
    canvas.selectionBorderColor = 'hsl(var(--primary))';
    canvas.selectionLineWidth = 1;

    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0] as any;
      // Prevent selecting locked background
      if (selected?.data?.isBackground || selected?.data?.isGradientBackground) {
        canvas.discardActiveObject();
        return;
      }
      // Prevent selecting locked objects
      if (selected && selected.lockMovementX === true && selected.lockMovementY === true) {
        canvas.discardActiveObject();
        return;
      }
      if (selected) {
        selected.set({
          borderColor: 'hsl(var(--primary))',
          borderDashArray: [4, 4],
          cornerColor: 'hsl(var(--primary))',
          cornerSize: 8,
          cornerStyle: 'circle',
          transparentCorners: false,
        });
        canvas.requestRenderAll();
      }
      setSelectedObject(selected);
      setActiveTool('select');
    });
    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0] as any;
      // Prevent selecting locked background
      if (selected?.data?.isBackground || selected?.data?.isGradientBackground) {
        canvas.discardActiveObject();
        return;
      }
      // Prevent selecting locked objects
      if (selected && selected.lockMovementX === true && selected.lockMovementY === true) {
        canvas.discardActiveObject();
        return;
      }
      if (selected) {
        selected.set({
          borderColor: 'hsl(var(--primary))',
          borderDashArray: [4, 4],
          cornerColor: 'hsl(var(--primary))',
          cornerSize: 8,
          cornerStyle: 'circle',
          transparentCorners: false,
        });
        canvas.requestRenderAll();
      }
      setSelectedObject(selected);
    });
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });
    canvas.on('object:modified', (e) => {
      saveToHistory();
      updateObjectsList();

      // Handle textbox resize: keep text crisp by converting scale into dimensions (not font scaling)
      const obj = e.target as any;
      if (obj && (obj.type === 'textbox' || obj.type === 'i-text')) {
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        if (scaleX !== 1 || scaleY !== 1) {
          const nextWidth = (obj.width || 100) * scaleX;
          const nextHeight = (obj.height || 0) * scaleY;

          obj.set({
            scaleX: 1,
            scaleY: 1,
            width: nextWidth,
            ...(nextHeight > 0 ? { height: nextHeight } : {}),
          });

          // Recompute layout after dimension changes (important for lineHeight + wrapping)
          if (typeof obj.initDimensions === 'function') obj.initDimensions();
          if (typeof obj.setCoords === 'function') obj.setCoords();
          obj.dirty = true;

          canvas.requestRenderAll();
        }
      }
    });
    canvas.on('object:added', () => {
      if (!isHistoryActionRef.current) saveToHistory();
      updateObjectsList();
    });
    canvas.on('object:removed', () => {
      if (!isHistoryActionRef.current) saveToHistory();
      updateObjectsList();
    });

    // Note: object:moving and object:scaling handlers are set up in the alignment guides effect
    // to allow combining boundary constraints with alignment snap functionality

    // Store original position and scale when object is selected (for locked objects)
    canvas.on('mouse:down', (e) => {
      const obj = e.target as any;
      if (obj) {
        obj._originalLeft = obj.left;
        obj._originalTop = obj.top;
        obj._originalScaleX = obj.scaleX;
        obj._originalScaleY = obj.scaleY;
      }
    });

    // Initial history save
    setTimeout(() => {
      const initialState = JSON.stringify(canvas.toObject());
      setHistory([initialState]);
      historyRef.current = [initialState];
      setHistoryIndex(0);
      historyIndexRef.current = 0;
    }, 100);
  };

  const handleFrontCanvasReady = (canvas: FabricCanvas) => {
    setupCanvas(canvas);
    setFabricCanvas(canvas);

    // Initial history save
    setTimeout(() => {
      const initialState = JSON.stringify(canvas.toObject());
      setHistory([initialState]);
      historyRef.current = [initialState];
      setHistoryIndex(0);
      historyIndexRef.current = 0;
    }, 100);
  };

  const handleBackCanvasReady = (canvas: FabricCanvas) => {
    setupCanvas(canvas);
    setBackFabricCanvas(canvas);

    // No separate history for back canvas for now, might need adjustment
  };

  // Fetch vendor_id for the current user
  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        // Use the optimized endpoint
        return await apiService.vendorsAPI.getByUserId(user.id);
      } catch (error) {
        console.error('Failed to fetch vendor:', error);
        return null;
      }
    },
    enabled: !!user?.id,
  });

  // Fetch library shapes for the vendor (to use as profile pic masks)
  const { data: libraryShapes = [] } = useQuery({
    queryKey: ['library-shapes-for-designer', vendorData?.id],
    queryFn: async () => {
      if (!vendorData?.id) return [];
      try {
        const result = await apiService.libraryAPI.getShapes(vendorData.id);
        return result.data || result || [];
      } catch (error) {
        console.error('Failed to fetch library shapes:', error);
        return [];
      }
    },
    enabled: !!vendorData?.id,
  });

  // Combine local custom shapes with library shapes
  const allCustomShapes = [
    ...customShapes,
    ...libraryShapes.map((s: any) => ({ name: s.name, url: s.shape_url }))
  ];

  // Auto-populate vendor data into preview
  useEffect(() => {
    if (vendorData) {
      const vendorPreviewData: Record<string, string> = {
        vendor_name: vendorData.business_name || '',
        vendor_email: vendorData.email || '',
        vendor_phone: vendorData.phone || '',
        vendor_address: vendorData.address || '',
        vendor_city: vendorData.city || '',
        vendor_state: vendorData.state || '',
        vendor_logo: vendorData.logo_url || '',
        vendor_website: vendorData.website || '',
      };
      setPreviewData(prev => ({ ...prev, ...vendorPreviewData }));
    }
  }, [vendorData]);

  // Auto-populate client data when opening from a project context
  useEffect(() => {
    if (projectClient && fabricCanvas) {
      const clientData: Record<string, string> = {
        institution_name: projectClient.institution_name || '',
        client_name: projectClient.name || '',
        client_phone: projectClient.phone || '',
        client_email: projectClient.email || '',
        client_designation: projectClient.designation || '',
        client_address: projectClient.address || '',
        client_city: projectClient.city || '',
        client_state: projectClient.state || '',
        client_pincode: projectClient.pincode || '',
        company_logo: projectClient.logo_url || '',
        company_signature: projectClient.signature_url || '',
      };

      // Merge with existing preview data (don't overwrite student data if any)
      setPreviewData(prev => ({ ...prev, ...clientData }));

      // Show a toast notification
      toast.info(`Client "${projectClient.institution_name}" data loaded from project`);
    }
  }, [projectClient, fabricCanvas]);

  // Convert mm to pixels (96 DPI / 25.4)
  const mmToPixels = 3.78;

  // Escape string for use in RegExp construction
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');

  // Update canvas size and clip path when dimensions change
  useEffect(() => {
    if (!fabricCanvas || !fabricCanvas.lowerCanvasEl) return;
    try {
      const canvasWidth = widthMm * mmToPixels;
      const canvasHeight = heightMm * mmToPixels;

      fabricCanvas.setDimensions({
        width: canvasWidth,
        height: canvasHeight,
      });

      // Update clip path to match new dimensions
      const clipRect = new Rect({
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight,
        absolutePositioned: true,
      });
      fabricCanvas.clipPath = clipRect;

      fabricCanvas.requestRenderAll();
    } catch (e) {
      // Canvas may have been disposed
    }
  }, [widthMm, heightMm, fabricCanvas]);

  // Smart alignment guides and snap-to-grid behavior
  useEffect(() => {
    if (!fabricCanvas) return;

    const aligningLineMargin = 5; // Threshold for showing alignment guides
    const aligningLineOffset = 5;
    const aligningLineColor = 'hsl(var(--primary))';
    const aligningLineWidth = 1;

    let verticalLines: any[] = [];
    let horizontalLines: any[] = [];

    const clearGuidelines = () => {
      verticalLines.forEach(line => fabricCanvas.remove(line));
      horizontalLines.forEach(line => fabricCanvas.remove(line));
      verticalLines = [];
      horizontalLines = [];
    };

    const drawVerticalLine = (x: number) => {
      const line = new Line([x, 0, x, fabricCanvas.height || 0], {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        data: { isGuideline: true },
      });
      verticalLines.push(line);
      fabricCanvas.add(line);
    };

    const drawHorizontalLine = (y: number) => {
      const line = new Line([0, y, fabricCanvas.width || 0, y], {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        data: { isGuideline: true },
      });
      horizontalLines.push(line);
      fabricCanvas.add(line);
    };

    const handleObjectMoving = (e: any) => {
      const movingObj = e.target;
      if (!movingObj) return;

      // Prevent ALL object movement when pan tool is active
      if (activeToolRef.current === 'pan') {
        const originalLeft = movingObj._originalLeft ?? movingObj.left;
        const originalTop = movingObj._originalTop ?? movingObj.top;
        movingObj.set({
          left: originalLeft,
          top: originalTop,
        });
        movingObj.setCoords();
        fabricCanvas.requestRenderAll();
        return;
      }

      // Prevent movement of locked objects - always check lock state
      if (movingObj.lockMovementX === true && movingObj.lockMovementY === true) {
        // Restore to original position
        const originalLeft = movingObj._originalLeft ?? movingObj.left;
        const originalTop = movingObj._originalTop ?? movingObj.top;
        movingObj.set({
          left: originalLeft,
          top: originalTop,
        });
        movingObj.setCoords();
        fabricCanvas.requestRenderAll();
        return;
      }

      // Clear previous guidelines
      clearGuidelines();

      // Get object dimensions for boundary checking
      const movingWidth = (movingObj.width || 0) * (movingObj.scaleX || 1);
      const movingHeight = (movingObj.height || 0) * (movingObj.scaleY || 1);
      const canvasWidth = fabricCanvas.width || 0;
      const canvasHeight = fabricCanvas.height || 0;

      // Apply grid snapping if enabled
      let newLeft = movingObj.left || 0;
      let newTop = movingObj.top || 0;

      if (snapToGrid) {
        newLeft = Math.round(newLeft / gridSize) * gridSize;
        newTop = Math.round(newTop / gridSize) * gridSize;
      }

      // Constrain position within canvas bounds
      newLeft = Math.max(0, Math.min(newLeft, canvasWidth - movingWidth));
      newTop = Math.max(0, Math.min(newTop, canvasHeight - movingHeight));

      movingObj.set({ left: newLeft, top: newTop });

      // Update coords before getting bounds for accurate measurements
      movingObj.setCoords();

      // Recalculate bounds after constraining
      const movingLeft = movingObj.left || 0;
      const movingTop = movingObj.top || 0;
      const movingCenterX = movingLeft + movingWidth / 2;
      const movingCenterY = movingTop + movingHeight / 2;
      const movingRight = movingLeft + movingWidth;
      const movingBottom = movingTop + movingHeight;

      // Check alignment with other objects
      fabricCanvas.getObjects().forEach((obj: any) => {
        if (obj === movingObj || obj.data?.isGuideline) return;

        const objLeft = obj.left || 0;
        const objTop = obj.top || 0;
        const objWidth = (obj.width || 0) * (obj.scaleX || 1);
        const objHeight = (obj.height || 0) * (obj.scaleY || 1);
        const objCenterX = objLeft + objWidth / 2;
        const objCenterY = objTop + objHeight / 2;
        const objRight = objLeft + objWidth;
        const objBottom = objTop + objHeight;

        // Vertical alignments (left, center, right) - with boundary check
        if (Math.abs(movingLeft - objLeft) < aligningLineMargin) {
          const targetLeft = Math.max(0, Math.min(objLeft, canvasWidth - movingWidth));
          drawVerticalLine(objLeft);
          movingObj.set('left', targetLeft);
        }
        if (Math.abs(movingCenterX - objCenterX) < aligningLineMargin) {
          const targetLeft = Math.max(0, Math.min(objCenterX - movingWidth / 2, canvasWidth - movingWidth));
          drawVerticalLine(objCenterX);
          movingObj.set('left', targetLeft);
        }
        if (Math.abs(movingRight - objRight) < aligningLineMargin) {
          const targetLeft = Math.max(0, Math.min(objRight - movingWidth, canvasWidth - movingWidth));
          drawVerticalLine(objRight);
          movingObj.set('left', targetLeft);
        }

        // Horizontal alignments (top, center, bottom) - with boundary check
        if (Math.abs(movingTop - objTop) < aligningLineMargin) {
          const targetTop = Math.max(0, Math.min(objTop, canvasHeight - movingHeight));
          drawHorizontalLine(objTop);
          movingObj.set('top', targetTop);
        }
        if (Math.abs(movingCenterY - objCenterY) < aligningLineMargin) {
          const targetTop = Math.max(0, Math.min(objCenterY - movingHeight / 2, canvasHeight - movingHeight));
          drawHorizontalLine(objCenterY);
          movingObj.set('top', targetTop);
        }
        if (Math.abs(movingBottom - objBottom) < aligningLineMargin) {
          const targetTop = Math.max(0, Math.min(objBottom - movingHeight, canvasHeight - movingHeight));
          drawHorizontalLine(objBottom);
          movingObj.set('top', targetTop);
        }
      });

      // Check canvas center alignment - with boundary check
      if (Math.abs(movingCenterX - canvasWidth / 2) < aligningLineMargin) {
        const targetLeft = Math.max(0, Math.min(canvasWidth / 2 - movingWidth / 2, canvasWidth - movingWidth));
        drawVerticalLine(canvasWidth / 2);
        movingObj.set('left', targetLeft);
      }
      if (Math.abs(movingCenterY - canvasHeight / 2) < aligningLineMargin) {
        const targetTop = Math.max(0, Math.min(canvasHeight / 2 - movingHeight / 2, canvasHeight - movingHeight));
        drawHorizontalLine(canvasHeight / 2);
        movingObj.set('top', targetTop);
      }

      // Update associated text object for variable boxes
      if (movingObj.data?.type === 'variable-box') {
        const padding = movingObj.data?.padding ?? 8;
        const movingTextObj = movingObj.data?.textObject || fabricCanvas.getObjects().find((o: any) => o?.data?.type === 'variable-text' && o?.data?.field === movingObj.data?.field);

        if (movingTextObj) {
          movingTextObj.set({
            left: (movingObj.left || 0) + padding,
            top: (movingObj.top || 0) + padding,
          });
          movingTextObj.setCoords();
        }
      }

      // Update coords after any snapping adjustments
      movingObj.setCoords();
    };

    // Handle object scaling - constrain within canvas bounds and handle textbox resizing
    const handleObjectScaling = (e: any) => {
      const obj = e.target;
      if (!obj) return;

      // Prevent ALL object scaling when pan tool is active
      if (activeToolRef.current === 'pan') {
        obj.set({
          scaleX: obj._originalScaleX ?? obj.scaleX ?? 1,
          scaleY: obj._originalScaleY ?? obj.scaleY ?? 1,
        });
        obj.setCoords();
        fabricCanvas.requestRenderAll();
        return;
      }

      // Prevent scaling of locked objects
      if (obj.lockScalingX === true && obj.lockScalingY === true) {
        obj.set({
          scaleX: obj._originalScaleX ?? obj.scaleX ?? 1,
          scaleY: obj._originalScaleY ?? obj.scaleY ?? 1,
        });
        obj.setCoords();
        fabricCanvas.requestRenderAll();
        return;
      }

      const canvasWidth = fabricCanvas.width || 0;
      const canvasHeight = fabricCanvas.height || 0;

      // Textboxes: Only convert scaling to width for textboxes inside variable-box containers
      // Regular text variables and other textboxes should resize freely
      // This condition checks if the textbox is NOT a child of a variable-box (i.e., not variable-text)
      if (obj.type === 'textbox' && obj.data?.type !== 'variable-text' && obj.data?.type !== 'variable-box') {
        const minWidth = 50;
        const scaledWidth = (obj.width || 100) * (obj.scaleX || 1);
        const nextWidth = Math.max(minWidth, Math.min(scaledWidth, canvasWidth));

        obj.set({
          width: nextWidth,
          scaleX: 1,
          scaleY: 1,
        });
        obj.setCoords();

        // Clamp position after width change (works for left/right handle + any originX)
        let rect = obj.getBoundingRect(true, true);

        if (rect.left < 0) {
          obj.set({ left: (obj.left || 0) - rect.left });
        }

        rect = obj.getBoundingRect(true, true);
        if (rect.left + rect.width > canvasWidth) {
          const overflowX = rect.left + rect.width - canvasWidth;
          obj.set({ left: (obj.left || 0) - overflowX });
        }

        // (Optional safety) keep within vertical bounds if template has tight margins
        rect = obj.getBoundingRect(true, true);
        if (rect.top < 0) {
          obj.set({ top: (obj.top || 0) - rect.top });
        }

        rect = obj.getBoundingRect(true, true);
        if (rect.top + rect.height > canvasHeight) {
          const overflowY = rect.top + rect.height - canvasHeight;
          obj.set({ top: (obj.top || 0) - overflowY });
        }

        obj.setCoords();
        return;
      }

      // For regular text variables: allow free resizing with boundary constraints
      if (obj.type === 'textbox' && (obj.data?.type === 'variable' || obj.data?.type === 'text')) {
        // Simply clamp position to canvas bounds, allow scale/size to change freely
        const boundingRect = obj.getBoundingRect(true, true);
        const objLeft = boundingRect.left;
        const objTop = boundingRect.top;
        const objRight = boundingRect.left + boundingRect.width;
        const objBottom = boundingRect.top + boundingRect.height;

        let needsUpdate = false;

        // Constrain left edge
        if (objLeft < 0) {
          obj.set({ left: (obj.left || 0) - objLeft });
          needsUpdate = true;
        }

        // Constrain right edge
        if (objRight > canvasWidth) {
          const maxWidth = canvasWidth - Math.max(0, objLeft);
          const scaleX = Math.min(obj.scaleX || 1, maxWidth / (obj.width || 1));
          obj.set({ scaleX });
          needsUpdate = true;
        }

        // Constrain top edge
        if (objTop < 0) {
          obj.set({ top: (obj.top || 0) - objTop });
          needsUpdate = true;
        }

        // Constrain bottom edge
        if (objBottom > canvasHeight) {
          const maxHeight = canvasHeight - Math.max(0, objTop);
          const scaleY = Math.min(obj.scaleY || 1, maxHeight / (obj.height || 1));
          obj.set({ scaleY });
          needsUpdate = true;
        }

        if (needsUpdate) {
          obj.setCoords();
        }
        return;
      }

      // Variable boxes: update their inner text area in real-time while scaling
      if (obj.data?.type === 'variable-box') {
        const padding = obj.data?.padding ?? 8;
        const baseWidth = obj.width || obj.data?.boxWidth || 100;
        const baseHeight = obj.height || obj.data?.boxHeight || 30;

        // Calculate new dimensions from scaling
        const currentWidth = baseWidth * (obj.scaleX || 1);
        const currentHeight = baseHeight * (obj.scaleY || 1);

        // Ensure minimum size - allow small sizes for free resizing
        const minWidth = 10;
        const minHeight = 10;
        const constrainedWidth = Math.max(minWidth, currentWidth);
        const constrainedHeight = Math.max(minHeight, currentHeight);

        // Find the associated text object (prefer stored ref)
        let scalingTextObj: any = obj.data?.textObject;
        if (!scalingTextObj) {
          scalingTextObj = fabricCanvas.getObjects().find((o: any) => o?.data?.type === 'variable-text' && o?.data?.field === obj.data?.field);
        }

        // Apply text resizing based on CURRENT visual dimensions (width * scale) without resetting scale on the box yet
        // This prevents "fighting" with the active transform
        if (scalingTextObj) {
          const textWidth = Math.max(constrainedWidth - padding * 2, 20);
          const textHeight = Math.max(constrainedHeight - padding * 2, (scalingTextObj.data?.originalFontSize || 14));

          scalingTextObj.set({
            left: (obj.left || 0) + padding,
            top: (obj.top || 0) + padding,
            width: textWidth,
            height: textHeight,
            // Ensure word wrapping is enabled for constrained width
            breakWords: true,
          });
          // Update clipping path to match new dimensions
          if ((scalingTextObj as any).clipPath) {
            (scalingTextObj as any).clipPath.set({
              width: textWidth,
              height: textHeight,
            });
          }
        }

        // Constrain box within canvas bounds
        let rect = obj.getBoundingRect(true, true);

        if (rect.left < 0) {
          obj.set({ left: (obj.left || 0) - rect.left });
        }

        rect = obj.getBoundingRect(true, true);
        if (rect.left + rect.width > canvasWidth) {
          const overflowX = rect.left + rect.width - canvasWidth;
          obj.set({ left: (obj.left || 0) - overflowX });
        }

        rect = obj.getBoundingRect(true, true);
        if (rect.top < 0) {
          obj.set({ top: (obj.top || 0) - rect.top });
        }

        rect = obj.getBoundingRect(true, true);
        if (rect.top + rect.height > canvasHeight) {
          const overflowY = rect.top + rect.height - canvasHeight;
          obj.set({ top: (obj.top || 0) - overflowY });
        }

        obj.setCoords();
        fabricCanvas.requestRenderAll();
        return;
      }

      // Non-textbox objects
      const boundingRect = obj.getBoundingRect(true, true);
      const objLeft = boundingRect.left;
      const objTop = boundingRect.top;
      const objRight = boundingRect.left + boundingRect.width;
      const objBottom = boundingRect.top + boundingRect.height;

      let needsUpdate = false;

      // Constrain left edge
      if (objLeft < 0) {
        obj.set({ left: (obj.left || 0) - objLeft });
        needsUpdate = true;
      }

      // Constrain right edge
      if (objRight > canvasWidth) {
        const maxWidth = canvasWidth - Math.max(0, objLeft);
        const scaleX = Math.min(obj.scaleX || 1, maxWidth / (obj.width || 1));
        obj.set({ scaleX });
        needsUpdate = true;
      }

      // Constrain top edge
      if (objTop < 0) {
        obj.set({ top: (obj.top || 0) - objTop });
        needsUpdate = true;
      }

      // Constrain bottom edge
      if (objBottom > canvasHeight) {
        const maxHeight = canvasHeight - Math.max(0, objTop);
        const scaleY = Math.min(obj.scaleY || 1, maxHeight / (obj.height || 1));
        obj.set({ scaleY });
        needsUpdate = true;
      }

      if (needsUpdate) {
        obj.setCoords();
      }
    };

    // Handle object modified - convert textbox scaling to width change after scaling is done
    const handleObjectModified = (e: any) => {
      const obj = e.target;
      if (!obj) return;

      const canvasWidth = fabricCanvas.width || 0;
      const canvasHeight = fabricCanvas.height || 0;

      let changed = false;

      // For non-variable textbox objects, convert scaling to width change
      // Regular text variables and variable-text should keep their scale for free resizing
      if (obj.type === 'textbox' && obj.data?.type !== 'variable' && obj.data?.type !== 'variable-text' && obj.data?.type !== 'variable-box' && (obj.scaleX !== 1 || obj.scaleY !== 1)) {
        const minWidth = 50;
        const newWidth = Math.max(minWidth, (obj.width || 100) * (obj.scaleX || 1));

        obj.set({
          width: newWidth,
          scaleX: 1,
          scaleY: 1,
        });

        changed = true;
      }

      // Final safety clamp for non-variable textboxes (ensures right edge can't end outside canvas)
      if (obj.type === 'textbox' && obj.data?.type !== 'variable-text' && obj.data?.type !== 'variable-box') {
        obj.setCoords();
        let rect = obj.getBoundingRect(true, true);

        if (rect.left < 0) {
          obj.set({ left: (obj.left || 0) - rect.left });
          changed = true;
        }

        rect = obj.getBoundingRect(true, true);
        if (rect.left + rect.width > canvasWidth) {
          const overflowX = rect.left + rect.width - canvasWidth;
          obj.set({ left: (obj.left || 0) - overflowX });
          changed = true;
        }

        rect = obj.getBoundingRect(true, true);
        if (rect.top < 0) {
          obj.set({ top: (obj.top || 0) - rect.top });
          changed = true;
        }

        rect = obj.getBoundingRect(true, true);
        if (rect.top + rect.height > canvasHeight) {
          const overflowY = rect.top + rect.height - canvasHeight;
          obj.set({ top: (obj.top || 0) - overflowY });
          changed = true;
        }
      }

      if (changed) {
        obj.setCoords();
        fabricCanvas.requestRenderAll();
      }

      // Normalize variable-box dimensions after scaling/modification
      if (obj?.data?.type === 'variable-box') {
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;

        // Calculate new actual dimensions
        const baseWidth = obj.width || 100;
        const baseHeight = obj.height || 30;
        const newWidth = baseWidth * scaleX;
        const newHeight = baseHeight * scaleY;

        // Apply new dimensions and reset scale
        obj.set({
          width: newWidth,
          height: newHeight,
          scaleX: 1,
          scaleY: 1
        });

        // Update stored data
        obj.set('data', {
          ...obj.data,
          boxWidth: newWidth,
          boxHeight: newHeight,
        });

        // Refresh text position to match normalized box
        const padding = obj.data?.padding ?? 8;
        const modifiedTextObj = obj.data?.textObject || fabricCanvas.getObjects().find((o: any) => o?.data?.type === 'variable-text' && o?.data?.field === obj.data?.field);

        if (modifiedTextObj) {
          const textWidth = Math.max(newWidth - padding * 2, 20);
          const textHeight = Math.max(newHeight - padding * 2, (modifiedTextObj.data?.originalFontSize || 14));

          modifiedTextObj.set({
            left: (obj.left || 0) + padding,
            top: (obj.top || 0) + padding,
            width: textWidth,
            height: textHeight
          });
          modifiedTextObj.setCoords();

          if (modifiedTextObj.clipPath) {
            modifiedTextObj.clipPath.set({
              width: textWidth,
              height: textHeight
            });
          }
        }

        obj.setCoords();
        fabricCanvas.requestRenderAll();
        try { if (!isHistoryActionRef.current) saveToHistory(); } catch (e) { /* ignore */ }
      }
    };

    const handleMouseUp = () => {
      clearGuidelines();
      fabricCanvas.requestRenderAll();
    };

    fabricCanvas.off('object:moving');
    fabricCanvas.off('object:scaling');
    fabricCanvas.off('object:modified');
    fabricCanvas.off('mouse:up');
    fabricCanvas.on('object:moving', handleObjectMoving);
    fabricCanvas.on('object:scaling', handleObjectScaling);
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('object:moving', handleObjectMoving);
      fabricCanvas.off('object:scaling', handleObjectScaling);
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('mouse:up', handleMouseUp);
      clearGuidelines();
    };
  }, [fabricCanvas, snapToGrid, gridSize]);

  // Set up auto font size listeners for both canvases
  useEffect(() => {
    const cleanupFront = fabricCanvas ? setupAutoFontSizeListeners(fabricCanvas) : () => { };
    const cleanupBack = backFabricCanvas ? setupAutoFontSizeListeners(backFabricCanvas) : () => { };

    return () => {
      cleanupFront();
      cleanupBack();
    };
  }, [fabricCanvas, backFabricCanvas]);

  // Load template if editing
  useEffect(() => {
    if (editTemplate && fabricCanvas) {
      setTemplateName(editTemplate.name);
      setCategory(editTemplate.category);
      setWidthMm(editTemplate.width_mm);
      setHeightMm(editTemplate.height_mm);
      setIsPublic(editTemplate.is_public);
      setHasBackSide(editTemplate.has_back_side);

      if (editTemplate.design_json) {
        const designJson = editTemplate.design_json;

        // Mark as history action to prevent duplicate saves during load
        isHistoryActionRef.current = true;

        // Check if template has multi-page data
        if (designJson.__pages && Array.isArray(designJson.__pages)) {
          // Load pages from saved data
          const loadedPages: PageData[] = designJson.__pages.map((p: any) => ({
            id: p.id || generateUUID(),
            name: p.name || 'Page',
            designJson: p.designJson,
          }));
          setPages(loadedPages);
          setCurrentPageIndex(0);

          // Load first page content
          if (loadedPages[0]?.designJson) {
            // Remove __pages from the design JSON before loading
            const cleanDesign = { ...loadedPages[0].designJson };
            delete cleanDesign.__pages;
            fabricCanvas.loadFromJSON(cleanDesign).then(() => {
              // Restore lock state for all objects after loading
              // Use setTimeout to ensure canvas is fully loaded before restoring
              setTimeout(() => {
                restoreLockState(fabricCanvas);
                updateObjectsList();
              }, 0);
              // Reset history after template loads
              const initialState = JSON.stringify(fabricCanvas.toObject());
              historyRef.current = [initialState];
              setHistory([initialState]);
              historyIndexRef.current = 0;
              setHistoryIndex(0);
              isHistoryActionRef.current = false;
            });
          } else {
            isHistoryActionRef.current = false;
          }
        } else {
          // Legacy single-page template - create a single page from it
          const cleanDesign = { ...designJson };
          delete cleanDesign.__pages;
          setPages([{ id: generateUUID(), name: 'Page 1', designJson: cleanDesign }]);
          setCurrentPageIndex(0);

          fabricCanvas.loadFromJSON(cleanDesign).then(() => {
            // Restore lock state for all objects after loading
            // Use setTimeout to ensure canvas is fully loaded before restoring
            setTimeout(() => {
              restoreLockState(fabricCanvas);
              updateObjectsList();
            }, 0);
            // Reset history after template loads
            const initialState = JSON.stringify(fabricCanvas.toObject());
            historyRef.current = [initialState];
            setHistory([initialState]);
            historyIndexRef.current = 0;
            setHistoryIndex(0);
            isHistoryActionRef.current = false;
          });
        }
      }
    }
  }, [editTemplate, fabricCanvas]);

  /**
   * Restores lock state for all objects after loading from JSON
   * Ensures locked objects have proper selectable/evented properties set
   * @param {FabricCanvas} canvas - The canvas to restore lock state for
   * @returns {void}
   */
  const restoreLockState = useCallback((canvas: FabricCanvas) => {
    canvas.getObjects().forEach((obj: any) => {
      // Skip guideline objects
      if (obj.data?.isGuideline) return;

      // Check if object is locked - normalize possible value types
      // (boolean true, string 'true', numeric 1) to a boolean
      const lockMovementXRaw = obj.lockMovementX;
      const lockMovementYRaw = obj.lockMovementY;

      const lockMovementX = lockMovementXRaw === true || lockMovementXRaw === 'true' || lockMovementXRaw === 1;
      const lockMovementY = lockMovementYRaw === true || lockMovementYRaw === 'true' || lockMovementYRaw === 1;

      // Determine if object is locked: both X and Y must be true-ish
      const isLocked = lockMovementX && lockMovementY;

      if (isLocked) {
        // Object is locked - restore all lock properties and disable interaction
        obj.set({
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: obj.lockRotation === true || obj.lockRotation === 'true' || obj.lockRotation === 1,
          lockScalingX: obj.lockScalingX === true || obj.lockScalingX === 'true' || obj.lockScalingX === 1,
          lockScalingY: obj.lockScalingY === true || obj.lockScalingY === 'true' || obj.lockScalingY === 1,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
        });
      } else {
        // Object is not locked - ensure it's selectable (unless it's a background object)
        if (!obj.data?.isBackground && !obj.data?.isGradientBackground) {
          // Explicitly set lock properties to false if they're not true
          obj.set({
            lockMovementX: lockMovementX ? true : false,
            lockMovementY: lockMovementY ? true : false,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
          });
        }
      }
    });
    canvas.requestRenderAll();
  }, []);

  /**
   * Updates the objects list in state to reflect current canvas state
   * Filters out guideline objects from the displayed list
   * Called when canvas changes to keep UI in sync with canvas objects
   * @returns {void}
   */
  const updateObjectsList = useCallback(() => {
    const canvas = activeSide === 'front' ? fabricCanvas : backFabricCanvas;
    if (!canvas) return;
    const canvasObjects = canvas.getObjects().filter((obj: any) => !obj.data?.isGuideline);
    setObjects([...canvasObjects]);
  }, [activeSide, fabricCanvas, backFabricCanvas]);

  // Update objects list when canvas or active side changes
  useEffect(() => {
    updateObjectsList();
  }, [updateObjectsList]);

  // Auto-fetch first data record for preview when component loads
  useEffect(() => {
    const fetchFirstRecord = async () => {
      if (!projectId) return;

      try {
        const response = await apiService.dataRecordsAPI.getByProject(projectId, { limit: 1 });
        if (response.data && response.data.length > 0) {
          const firstRecord = response.data[0];
          // Convert the first record to preview data format
          const recordData: Record<string, string> = {};
          Object.keys(firstRecord).forEach(key => {
            if (firstRecord[key] !== null && firstRecord[key] !== undefined) {
              recordData[key] = String(firstRecord[key]);
            }
          });
          setPreviewData(recordData);
          console.log('Auto-loaded first data record for preview:', recordData);
        }
      } catch (error) {
        console.error('Failed to fetch first data record:', error);
        // Don't show error toast - this is optional functionality
      }
    };

    fetchFirstRecord();
  }, [projectId]);


  /**
   * Safely clear a Fabric canvas only if its underlying context is available.
   * Prevents calling clear() when the canvas element/context has been removed,
   * which can cause fabric.js to throw in clearContext.
   */
  const safeClearCanvas = useCallback((canvas: any) => {
    if (!canvas) return;
    try {
      const lower = canvas.lowerCanvasEl;
      if (lower && typeof lower.getContext === 'function') {
        const ctx = lower.getContext('2d');
        if (ctx) {
          canvas.clear();
          return;
        }
      }
      // Fallback: remove objects instead of calling clear
      const objs = canvas.getObjects ? canvas.getObjects() : [];
      objs.forEach((o: any) => canvas.remove(o));
      canvas.requestRenderAll && canvas.requestRenderAll();
    } catch (e) {
      // swallow - avoid breaking UI
      // eslint-disable-next-line no-console
      console.warn('safeClearCanvas failed', e);
    }
  }, []);

  /**
   * Saves current canvas state to history with debouncing (300ms)
   * Groups rapid changes into single history entry to avoid excessive memory usage
   * Maintains up to 50 undo states; removes oldest when limit exceeded
   * Clears redo history (forward states) when new action occurs
   * @returns {void}
   */
  const saveToHistory = useCallback(() => {
    if (!activeCanvas || isHistoryActionRef.current) return;

    // Clear any existing debounce timeout
    if (historyDebounceRef.current) {
      clearTimeout(historyDebounceRef.current);
    }

    // Mark that we have a pending save
    pendingHistorySaveRef.current = true;

    // Debounce history saves to group rapid changes into one history entry
    historyDebounceRef.current = setTimeout(() => {
      if (!pendingHistorySaveRef.current || !activeCanvas) return;

      const json = JSON.stringify(activeCanvas.toObject());
      const currentIndex = historyIndexRef.current; // Use ref for accurate current index
      const currentHistory = historyRef.current; // Use ref for accurate history

      // Don't save if it's the same as the current state
      if (currentHistory[currentIndex] === json) {
        pendingHistorySaveRef.current = false;
        return;
      }

      // When adding new state, cut off any redo history (states after current index)
      const newHistory = currentHistory.slice(0, currentIndex + 1);
      newHistory.push(json);

      // Keep only last 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        historyIndexRef.current = newHistory.length - 1;
      } else {
        historyIndexRef.current = newHistory.length - 1;
      }

      // Update both ref and state
      historyRef.current = newHistory;
      setHistory(newHistory);
      setHistoryIndex(historyIndexRef.current);

      pendingHistorySaveRef.current = false;
    }, 300);
  }, [activeCanvas]);

  // Arrow key movement for selected objects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCanvas) return;
      const activeObject = activeCanvas.getActiveObject();
      if (!activeObject) return;

      // Don't handle if we're editing text
      if (activeObject.type === 'textbox' && (activeObject as any).isEditing) return;

      const moveAmount = e.shiftKey ? 10 : 1; // Shift for larger moves
      let moved = false;

      switch (e.key) {
        case 'ArrowUp':
          activeObject.set('top', (activeObject.top || 0) - moveAmount);
          moved = true;
          break;
        case 'ArrowDown':
          activeObject.set('top', (activeObject.top || 0) + moveAmount);
          moved = true;
          break;
        case 'ArrowLeft':
          activeObject.set('left', (activeObject.left || 0) - moveAmount);
          moved = true;
          break;
        case 'ArrowRight':
          activeObject.set('left', (activeObject.left || 0) + moveAmount);
          moved = true;
          break;
      }

      if (moved) {
        e.preventDefault();
        activeObject.setCoords();
        activeCanvas.requestRenderAll();
        saveToHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCanvas, saveToHistory]);

  /**
   * Reverts canvas to previous state in history
   * Decrements history index and reloads canvas from saved JSON
   * Cannot undo past the initial state
   * @returns {void}
   */
  const handleUndo = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    const currentHistory = historyRef.current;

    if (currentIndex <= 0 || !activeCanvas || !currentHistory[currentIndex - 1]) {
      console.log('Undo: Cannot undo', { currentIndex, historyLength: currentHistory.length });
      return;
    }

    isHistoryActionRef.current = true;
    const newIndex = currentIndex - 1;
    const stateToLoad = currentHistory[newIndex];

    console.log('Undo: Loading state', { newIndex, historyLength: currentHistory.length });

    try {
      activeCanvas.loadFromJSON(JSON.parse(stateToLoad)).then(() => {
        // Restore lock state after loading from history
        restoreLockState(activeCanvas);
        updateObjectsList();
        historyIndexRef.current = newIndex;
        setHistoryIndex(newIndex);
        isHistoryActionRef.current = false;
      }).catch((error: Error) => {
        console.error('Undo failed:', error);
        isHistoryActionRef.current = false;
      });
    } catch (error) {
      console.error('Undo failed:', error);
      isHistoryActionRef.current = false;
    }
  }, [activeCanvas, updateObjectsList]);

  /**
   * Re-applies next state in history that was undone
   * Increments history index and reloads canvas from saved JSON
   * Cannot redo past the most recent action
   * @returns {void}
   */
  const handleRedo = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    const currentHistory = historyRef.current;

    if (currentIndex >= currentHistory.length - 1 || !activeCanvas || !currentHistory[currentIndex + 1]) {
      console.log('Redo: Cannot redo', { currentIndex, historyLength: currentHistory.length });
      return;
    }

    isHistoryActionRef.current = true;
    const newIndex = currentIndex + 1;
    const stateToLoad = currentHistory[newIndex];

    console.log('Redo: Loading state', { newIndex, historyLength: currentHistory.length });

    try {
      activeCanvas.loadFromJSON(JSON.parse(stateToLoad)).then(() => {
        // Restore lock state after loading from history
        restoreLockState(activeCanvas);
        updateObjectsList();
        historyIndexRef.current = newIndex;
        setHistoryIndex(newIndex);
        isHistoryActionRef.current = false;
      }).catch((error: Error) => {
        console.error('Redo failed:', error);
        isHistoryActionRef.current = false;
      });
    } catch (error) {
      console.error('Redo failed:', error);
      isHistoryActionRef.current = false;
    }
  }, [activeCanvas, updateObjectsList]);

  /**
   * Zoom canvas in or out
   * Range: 0.25x (25%) to 3x (300%)
   * @param {('in'|'out')} direction - Zoom direction
   */
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    const newZoom = direction === 'in'
      ? Math.min(zoom * 1.2, 3)
      : Math.max(zoom / 1.2, 0.25);
    setZoom(newZoom);
  }, [zoom]);

  // Zoom and resize canvas when zoom state changes
  useEffect(() => {
    if (activeCanvas) {
      const canvasWidth = widthMm * mmToPixels;
      const canvasHeight = heightMm * mmToPixels;

      // Use setZoom + viewport reset to keep 0,0 at top-left
      activeCanvas.setZoom(zoom);
      const vpt = activeCanvas.viewportTransform;
      if (vpt) {
        vpt[4] = 0;
        vpt[5] = 0;
      }

      // Resize gradient background if it exists
      const bgGradient = activeCanvas.getObjects().find((obj: any) => obj.data?.isGradientBackground);
      if (bgGradient) {
        bgGradient.set({
          width: canvasWidth,
          height: canvasHeight,
        });
      }

      // Ensure background image covers the entire canvas after zoom/resize
      if (activeCanvas.backgroundImage) {
        const img = activeCanvas.backgroundImage;
        img.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          scaleX: canvasWidth / (img.width || 1),
          scaleY: canvasHeight / (img.height || 1),
        });
      }

      activeCanvas.requestRenderAll();
    }
  }, [zoom, activeCanvas, widthMm, heightMm]);

  /**
   * Add geometric shape to canvas
   * Supports: rect, circle, triangle, polygon, ellipse, pentagon, star, diamond, line
   * @param {string} type - Shape type to add
   */
  const addShape = useCallback((type: string) => {
    if (!activeCanvas) return;

    let shape: any;
    const canvasWidth = widthMm * mmToPixels;
    const canvasHeight = heightMm * mmToPixels;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Calculate max size to fit within template
    const maxWidth = Math.min(100, canvasWidth * 0.4);
    const maxHeight = Math.min(60, canvasHeight * 0.4);

    switch (type) {
      case 'rect':
        shape = new Rect({
          left: Math.max(5, centerX - maxWidth / 2),
          top: Math.max(5, centerY - maxHeight / 2),
          width: maxWidth,
          height: maxHeight,
          fill: '#3b82f6',
          stroke: '#1d4ed8',
          strokeWidth: 0,
          rx: 0,
          ry: 0,
        });
        break;
      case 'rounded-rect':
        shape = new Rect({
          left: Math.max(5, centerX - maxWidth / 2),
          top: Math.max(5, centerY - maxHeight / 2),
          width: maxWidth,
          height: maxHeight,
          fill: '#3b82f6',
          rx: 10,
          ry: 10,
        });
        break;
      case 'circle':
        const radius = Math.min(40, canvasWidth * 0.15, canvasHeight * 0.15);
        shape = new Circle({
          left: Math.max(5, centerX - radius),
          top: Math.max(5, centerY - radius),
          radius: radius,
          fill: '#10b981',
        });
        break;
      case 'ellipse':
        const ellipseRadius = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        shape = new Circle({
          left: Math.max(5, centerX - ellipseRadius * 1.5),
          top: Math.max(5, centerY - ellipseRadius * 0.75),
          radius: ellipseRadius,
          fill: '#10b981',
          scaleX: 1.5,
          scaleY: 0.75,
        });
        break;
      case 'triangle':
        const triSize = Math.min(80, canvasWidth * 0.3, canvasHeight * 0.3);
        shape = new Triangle({
          left: Math.max(5, centerX - triSize / 2),
          top: Math.max(5, centerY - triSize * 0.45),
          width: triSize,
          height: triSize * 0.87,
          fill: '#f59e0b',
        });
        break;
      case 'star':
        const starSize = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        const starPoints = createStarPoints(5, starSize, starSize / 2);
        shape = new Polygon(starPoints, {
          left: Math.max(5, centerX - starSize),
          top: Math.max(5, centerY - starSize),
          fill: '#eab308',
        });
        break;
      case 'polygon':
        const hexSize = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        const hexPoints = createPolygonPoints(6, hexSize);
        shape = new Polygon(hexPoints, {
          left: Math.max(5, centerX - hexSize),
          top: Math.max(5, centerY - hexSize),
          fill: '#8b5cf6',
        });
        break;
      case 'pentagon':
        const pentSize = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        const pentPoints = createPolygonPoints(5, pentSize);
        shape = new Polygon(pentPoints, {
          left: Math.max(5, centerX - pentSize),
          top: Math.max(5, centerY - pentSize),
          fill: '#ec4899',
        });
        break;
      case 'diamond':
        const diamondSize = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        const diamondPoints = [
          { x: diamondSize, y: 0 },
          { x: diamondSize * 2, y: diamondSize },
          { x: diamondSize, y: diamondSize * 2 },
          { x: 0, y: diamondSize },
        ];
        shape = new Polygon(diamondPoints, {
          left: Math.max(5, centerX - diamondSize),
          top: Math.max(5, centerY - diamondSize),
          fill: '#14b8a6',
        });
        break;
      case 'line':
        const lineWidth = Math.min(100, canvasWidth * 0.4);
        shape = new Line([0, 0, lineWidth, 0], {
          left: Math.max(5, centerX - lineWidth / 2),
          top: centerY,
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
      case 'arrow':
        const arrowWidth = Math.min(100, canvasWidth * 0.4);
        shape = new Line([0, 0, arrowWidth, 0], {
          left: Math.max(5, centerX - arrowWidth / 2),
          top: centerY,
          stroke: '#000000',
          strokeWidth: 3,
        });
        break;
      default:
        return;
    }

    if (shape) {
      activeCanvas.add(shape);
      activeCanvas.setActiveObject(shape);
      activeCanvas.requestRenderAll();
      setActiveTool('select');
    }
  }, [activeCanvas, widthMm, heightMm, zoom]);

  /**
   * Add VDP Text Tool container to canvas
   * @param {string} text - Initial text
   */
  const addVDPText = useCallback((text: string) => {
    if (!activeCanvas) return;

    const canvasWidth = widthMm * mmToPixels;
    const canvasHeight = heightMm * mmToPixels;

    const vdpText = new VDPText(text, VDPFunctionType.AUTOSIZE, {
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      width: 150,
      height: 50,
      fontSize: 20,
      fontFamily: lastTextSettingsRef.current.fontFamily,
      fill: lastTextSettingsRef.current.fill,
    });

    activeCanvas.add(vdpText);
    activeCanvas.setActiveObject(vdpText);
    activeCanvas.requestRenderAll();
    setActiveTool('select');
    saveToHistory();
  }, [activeCanvas, widthMm, heightMm, saveToHistory]);

  /**
   * Add text or variable field to canvas
   * Variable fields are stored as {{fieldName}} placeholders and replaced during data preview
   * Supports word wrapping and auto font sizing
   * @param {string} text - Text content or variable placeholder (e.g., "{{firstName}}")
   * @param {boolean} [isVariable=false] - Whether this is a variable field
   */
  /**
   * Add variable field as a draggable box/container
   * Creates a rectangle with text inside that can be dragged and resized
   */
  const addVariableBox = useCallback((text: string) => {
    if (!activeCanvas) return;

    const canvasWidth = widthMm * mmToPixels;
    const canvasHeight = heightMm * mmToPixels;

    // Use last text settings for variables
    const lastSettings = lastTextSettingsRef.current;
    const fontSize = lastSettings.fontSize || 14;
    const fontFamily = lastSettings.fontFamily || 'Arial';
    const fill = lastSettings.fill || '#000000';

    // For variable fields, always store the original placeholder text
    const originalText = text;
    const variableName = text.replace(/[{}]/g, '');

    // Determine display text - use preview data if available, otherwise show field name
    let displayText = originalText; // Default to {{firstName}}
    if (previewData && previewData[variableName]) {
      displayText = String(previewData[variableName]); // Show real data like "John Doe"
    }

    // Calculate box dimensions
    const padding = 8;
    const boxWidth = Math.min(150, canvasWidth * 0.4);
    const boxHeight = Math.max(fontSize + padding * 2, 30);

    // Position box within template bounds
    const boxLeft = Math.max(5, (canvasWidth - boxWidth) / 2);
    const boxTop = Math.max(5, (canvasHeight - boxHeight) / 2);

    // If a variable box for this field already exists, resize it instead of creating a new one
    const existingBox = activeCanvas.getObjects().find((o: any) => o?.data?.type === 'variable-box' && o?.data?.field === variableName);
    if (existingBox) {
      const newWidth = boxWidth;
      const newHeight = boxHeight;

      existingBox.set({
        width: newWidth,
        height: newHeight,
        scaleX: 1,
        scaleY: 1,
      });

      (existingBox as any).set('data', {
        ...(existingBox as any).data,
        boxWidth: newWidth,
        boxHeight: newHeight,
        padding,
      });

      // Update associated text object (if present)
      const existingText = activeCanvas.getObjects().find((o: any) => o?.data?.type === 'variable-text' && o?.data?.field === variableName);
      if (existingText) {
        const textWidth = Math.max(newWidth - padding * 2, 20);
        const textHeight = Math.max(newHeight - padding * 2, fontSize);
        existingText.set({
          left: (existingBox.left || 0) + padding,
          top: (existingBox.top || 0) + padding,
          width: textWidth,
          height: textHeight,
          breakWords: true,
        });
        // Update clipping path
        if ((existingText as any).clipPath) {
          (existingText as any).clipPath.set({
            width: textWidth,
            height: textHeight,
          });
        }
        (existingText as any).data = {
          ...(existingText as any).data,
          parentBox: existingBox,
          padding,
        };
      }

      activeCanvas.setActiveObject(existingBox);
      activeCanvas.requestRenderAll();
      saveToHistory();
      setActiveTool('select');
      setSelectedObject(existingBox);
      return;
    }

    // Create rectangle background with transparent fill
    const boxRect = new Rect({
      left: boxLeft,
      top: boxTop,
      width: boxWidth,
      height: boxHeight,
      fill: 'rgba(255, 255, 255, 0.1)', // Transparent background
      stroke: '#d1d5db',
      strokeWidth: 1,
      rx: 4,
      ry: 4,
      selectable: true,
      evented: true,
      data: {
        type: 'variable-box',
        field: variableName,
        isVariableField: true,
        originalText: originalText,
        boxWidth: boxWidth,
        boxHeight: boxHeight,
        padding: padding,
        textObject: null, // Will be set after textbox is created
      },
    });

    // Create text inside the box
    const textbox = new Textbox(displayText, {
      left: boxLeft + padding,
      top: boxTop + padding,
      fontSize,
      fontFamily,
      fill: fill || '#000000', // Ensure text has a visible color
      fontWeight: 'normal',
      editable: false, // Not directly editable, box is the container
      width: boxWidth - padding * 2,
      height: boxHeight - padding * 2,
      backgroundColor: 'transparent',
      stroke: '', // No border
      strokeWidth: 0,
      padding: 0,
      splitByGrapheme: false, // Disable char-by-char for better wrapping
      breakWords: true, // Enable word wrapping to fit within width
      lineHeight: 1.2,
      textAlign: 'left',
      lockMovementX: true, // Prevent text from being moved independently
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      selectable: false, // Text is not independently selectable
      evented: false, // Text doesn't handle events, box does
      hasControls: false, // No resize handles on text
      hasBorders: false, // No border around text box
      visible: true, // Ensure text is visible
      borderColor: 'transparent', // No border color
      borderScaleFactor: 0, // No border scaling
      cornerColor: 'transparent', // No corner indicators
      cornerSize: 0, // No corner size
      transparentCorners: true, // Transparent corners
      data: {
        type: 'variable-text',
        field: variableName,
        isVariableField: true,
        originalText: originalText,
        originalFontSize: fontSize,
        parentBox: boxRect, // Reference to parent box
        padding: padding,
      },
    });

    // Link textbox reference back to box data for easy lookup
    (boxRect as any).data = {
      ...(boxRect as any).data,
      textObject: textbox,
    };

    // Add custom styling for selection
    boxRect.set({
      borderColor: 'hsl(var(--primary))',
      borderDashArray: [4, 4],
      cornerColor: 'hsl(var(--primary))',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
    });

    // Set control visibility for box
    boxRect.setControlsVisibility({
      tl: true,
      tr: true,
      bl: true,
      br: true,
      ml: true,
      mr: true,
      mt: true,
      mb: true,
      mtr: true,
    });

    // Add both to canvas - text must be added after box to render on top
    activeCanvas.add(boxRect);
    activeCanvas.add(textbox);

    // Ensure text renders on top of the box using Fabric.js v6 method
    activeCanvas.bringObjectToFront(textbox);

    // Store original font size for reference
    const originalFontSize = fontSize;

    // Helper function to update text position and size based on box
    const updateTextInBox = () => {
      const currentPadding = (boxRect as any).data?.padding || padding;
      const currentWidth = (boxRect.width || boxWidth) * (boxRect.scaleX || 1);
      const currentHeight = (boxRect.height || boxHeight) * (boxRect.scaleY || 1);
      const textWidth = Math.max(currentWidth - currentPadding * 2, 20);
      const textHeight = Math.max(currentHeight - currentPadding * 2, originalFontSize);

      textbox.set({
        left: (boxRect.left || 0) + currentPadding,
        top: (boxRect.top || 0) + currentPadding,
        width: textWidth,
        height: textHeight,
        breakWords: true, // Ensure word wrapping
      });

      // Update clipping path to ensure text doesn't overflow
      if ((textbox as any).clipPath) {
        (textbox as any).clipPath.set({
          width: textWidth,
          height: textHeight,
        });
      }
    };

    // Event listeners are now handled globally in handleObjectMoving, handleObjectScaling, etc.
    // to ensure behavior persists even after save/load (JSON serialization).

    activeCanvas.setActiveObject(boxRect);
    activeCanvas.requestRenderAll();
    setActiveTool('select');
  }, [activeCanvas, widthMm, heightMm, zoom, isPreviewMode, previewData, saveToHistory]);

  const addText = useCallback((text: string, isVariable = false, asBox = false) => {
    // If variable and asBox is true, use box mode
    if (isVariable && asBox) {
      addVariableBox(text);
      return;
    }

    if (arguments[3] === true) { // isVDP flag
      addVDPText(text);
      return;
    }

    if (!activeCanvas) return;

    const canvasWidth = (widthMm * mmToPixels) / zoom;
    const canvasHeight = (heightMm * mmToPixels) / zoom;

    // Calculate text width that fits within template
    const maxTextWidth = Math.min(150, canvasWidth * 0.8);

    // Use last text settings for variables, custom settings for headings
    const lastSettings = lastTextSettingsRef.current;
    let fontSize = lastSettings.fontSize;
    let fontFamily = lastSettings.fontFamily;
    let fontWeight: string | number = 'normal';
    let fill = lastSettings.fill;

    if (!isVariable) {
      if (text === 'Heading') {
        fontSize = Math.min(32, canvasHeight * 0.15);
        fontWeight = 'bold';
      } else if (text === 'Subheading') {
        fontSize = Math.min(24, canvasHeight * 0.12);
        fontWeight = '600';
      } else {
        fontSize = Math.min(16, canvasHeight * 0.08);
      }
    }

    // Position text within template bounds
    const textLeft = Math.max(5, (canvasWidth - maxTextWidth) / 2);
    const textTop = Math.max(5, (canvasHeight - fontSize) / 2);

    // For variable fields, always store the original placeholder text
    // This ensures the placeholder is preserved even when preview mode is active
    const originalText = text;

    // Determine display text - if this is a variable and we have preview data, apply it
    // This works both in preview mode AND when project client data is auto-loaded
    let displayText = text;
    if (isVariable && Object.keys(previewData).length > 0) {
      const variableName = text.replace(/[{}]/g, '');
      if (previewData[variableName]) {
        displayText = String(previewData[variableName]);
      }
    }

    const textbox = new Textbox(displayText, {
      left: textLeft,
      top: textTop,
      fontSize,
      fontFamily,
      fill, // Use last selected color
      fontWeight,
      editable: true,
      width: maxTextWidth,
      backgroundColor: '', // No background by default
      stroke: '',
      strokeWidth: 0,
      padding: 0,
      splitByGrapheme: lastSettings.wordWrap, // Word wrap support
      lineHeight: 1.2, // Default line height for proper text spacing
      textAlign: 'left',
      data: {
        type: isVariable ? 'variable' : 'text',
        field: isVariable ? text.replace(/[{}]/g, '') : undefined,
        isVariableField: isVariable,
        textCase: lastSettings.textCase,
        autoFontSize: lastSettings.autoFontSize,
        wordWrap: lastSettings.wordWrap,
        // Always store original text for variable fields so reset works correctly
        originalText: isVariable ? originalText : undefined,
        originalFontSize: fontSize,
      },
    });

    // Add custom styling for selection
    textbox.set({
      borderColor: 'hsl(var(--primary))',
      borderDashArray: [4, 4],
      cornerColor: 'hsl(var(--primary))',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
    });

    // Set control visibility - allow vertical resize too (top/bottom middle handles)
    // Width affects wrapping; height lets users control box bounds for multi-line text.
    textbox.setControlsVisibility({
      tl: true,
      tr: true,
      bl: true,
      br: true,
      ml: true,
      mr: true,
      mt: true,
      mb: true,
      mtr: true,
    });

    activeCanvas.add(textbox);
    activeCanvas.setActiveObject(textbox);
    activeCanvas.requestRenderAll();
    setActiveTool('select');
  }, [activeCanvas, widthMm, heightMm, zoom, isPreviewMode, previewData, addVariableBox]);

  const addImage = useCallback((file: File) => {
    if (!activeCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' }).then((img) => {
        const maxWidth = (widthMm * mmToPixels) * 0.5;
        const maxHeight = (heightMm * mmToPixels) * 0.5;

        if (img.width && img.height) {
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
          img.scale(scale);
        }

        img.set({
          left: 50,
          top: 50,
        });

        activeCanvas.add(img);
        activeCanvas.setActiveObject(img);
        activeCanvas.requestRenderAll();
        setActiveTool('select');
      }).catch((error: Error) => {
        console.error('Failed to load image:', error);
        toast.error('Failed to load image. Please check the file format and try again.');
      });
    };
    reader.readAsDataURL(file);
  }, [activeCanvas, widthMm, heightMm]);

  const addPlaceholder = useCallback(async (type: 'photo' | 'barcode' | 'qrcode', shape: PhotoShape = 'rect', customMaskUrl?: string) => {
    if (!activeCanvas) return;

    const canvasWidth = (widthMm * mmToPixels) / zoom;
    const canvasHeight = (heightMm * mmToPixels) / zoom;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Calculate placeholder size that fits within template
    const maxPhotoWidth = Math.min(80, canvasWidth * 0.35);
    const maxPhotoHeight = Math.min(100, canvasHeight * 0.45);
    const photoRadius = Math.min(40, canvasWidth * 0.15, canvasHeight * 0.15);

    let fabricObj: any;

    if (type === 'photo') {
      const width = maxPhotoWidth;
      const height = maxPhotoHeight;

      // Handle custom mask
      if (shape === 'custom' && customMaskUrl) {
        FabricImage.fromURL(customMaskUrl, { crossOrigin: 'anonymous' }).then((img) => {
          const maxSize = Math.min(100, canvasWidth * 0.4, canvasHeight * 0.4);
          if (img.width && img.height) {
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            img.scale(scale);
          }

          img.set({
            left: Math.max(5, centerX - maxSize / 2),
            top: Math.max(5, centerY - maxSize / 2),
            data: { type: 'variable', field: 'photo', isPhoto: true, shape: 'custom', customMaskUrl },
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });

          activeCanvas.add(img);
          activeCanvas.setActiveObject(img);
          activeCanvas.requestRenderAll();
          setActiveTool('select');
          toast.success('Custom photo placeholder added');
        }).catch((error: Error) => {
          console.error('Failed to load custom mask:', error);
          toast.error('Failed to load custom mask image.');
        });
        return;
      }

      switch (shape) {
        case 'circle':
          fabricObj = new Circle({
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            radius: photoRadius,
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'circle' });
          break;
        case 'ellipse':
          fabricObj = new Circle({
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius * 1.25),
            radius: photoRadius,
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            scaleX: 1,
            scaleY: 1.25,
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'ellipse' });
          break;
        case 'rounded-rect':
          fabricObj = new Rect({
            left: Math.max(5, centerX - width / 2),
            top: Math.max(5, centerY - height / 2),
            width,
            height,
            rx: 15,
            ry: 15,
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'rounded-rect' });
          break;
        case 'hexagon':
          const hexPoints = createPolygonPoints(6, photoRadius);
          fabricObj = new Polygon(hexPoints, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'hexagon' });
          break;
        case 'star':
          const starPts = createStarPoints(5, photoRadius, photoRadius / 2);
          fabricObj = new Polygon(starPts, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'star' });
          break;
        case 'heart':
          const heartPoints = createHeartPoints(photoRadius);
          fabricObj = new Polygon(heartPoints, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'heart' });
          break;
        case 'octagon':
          const octPoints = createPolygonPoints(8, photoRadius);
          fabricObj = new Polygon(octPoints, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'octagon' });
          break;
        case 'pentagon':
          const pentPoints = createPolygonPoints(5, photoRadius);
          fabricObj = new Polygon(pentPoints, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'pentagon' });
          break;
        case 'rect':
        default:
          fabricObj = new Rect({
            left: Math.max(5, centerX - width / 2),
            top: Math.max(5, centerY - height / 2),
            width,
            height,
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'rect' });
          break;
      }
    } else if (type === 'barcode') {
      // Generate actual barcode image
      const { generateBarcodeDataUrl } = await import('@/lib/codeGenerators');
      const barcodeData = '{{barcode}}';
      const placeholderData = 'ID12345';

      try {
        const dataUrl = await generateBarcodeDataUrl(placeholderData, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
        });

        FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' }).then((img) => {
          const maxWidth = Math.min(150, canvasWidth * 0.6);
          if (img.width && img.height) {
            const scale = maxWidth / img.width;
            img.scale(scale);
          }

          img.set({
            left: Math.max(5, centerX - (img.width! * (img.scaleX || 1)) / 2),
            top: Math.max(5, centerY - (img.height! * (img.scaleY || 1)) / 2),
            data: {
              type: 'variable',
              field: 'barcode',
              isBarcode: true,
              barcodeFormat: 'CODE128',
              barcodeWidth: 2,
              barcodeHeight: 50,
              showValue: true,
              dataField: barcodeData,
            },
          });

          activeCanvas.add(img);
          activeCanvas.setActiveObject(img);
          activeCanvas.requestRenderAll();
          setActiveTool('select');
          toast.success('Barcode added');
        }).catch((error: Error) => {
          console.error('Failed to load barcode:', error);
          toast.error('Failed to load barcode image. Please try again.');
        });
      } catch (error) {
        toast.error('Failed to generate barcode');
      }
      return; // Early return since we handle adding asynchronously
    } else if (type === 'qrcode') {
      // Generate actual QR code image
      const { generateQRCodeDataUrl } = await import('@/lib/codeGenerators');
      const qrData = '{{qr_code}}';
      const placeholderData = 'https://example.com';

      try {
        const dataUrl = await generateQRCodeDataUrl(placeholderData, {
          width: 200,
          color: { dark: '#000000', light: '#ffffff' },
        });

        FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' }).then((img) => {
          const maxSize = Math.min(80, canvasWidth * 0.3, canvasHeight * 0.4);
          if (img.width && img.height) {
            const scale = maxSize / Math.max(img.width, img.height);
            img.scale(scale);
          }

          img.set({
            left: Math.max(5, centerX - (img.width! * (img.scaleX || 1)) / 2),
            top: Math.max(5, centerY - (img.height! * (img.scaleY || 1)) / 2),
            data: {
              type: 'variable',
              field: 'qr_code',
              isQR: true,
              qrSize: 200,
              qrDarkColor: '#000000',
              qrLightColor: '#ffffff',
              dataField: qrData,
            },
          });

          activeCanvas.add(img);
          activeCanvas.setActiveObject(img);
          activeCanvas.requestRenderAll();
          setActiveTool('select');
          toast.success('QR Code added');
        }).catch((error: Error) => {
          console.error('Failed to load QR code:', error);
          toast.error('Failed to load QR code image. Please try again.');
        });
      } catch (error) {
        toast.error('Failed to generate QR code');
      }
      return; // Early return since we handle adding asynchronously
    }

    if (fabricObj) {
      activeCanvas.add(fabricObj);
      activeCanvas.setActiveObject(fabricObj);
      activeCanvas.requestRenderAll();
      setActiveTool('select');

      // If we have preview data, apply it to shows live image instead of grey box
      if (previewData && Object.keys(previewData).length > 0 && handlePreviewDataRef.current) {
        // Use timeout to ensure object is fully added and accessible
        setTimeout(() => {
          handlePreviewDataRef.current?.(previewData);
        }, 50);
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} placeholder added`);
    }
  }, [activeCanvas, widthMm, heightMm, previewData]);

  // Custom font handler
  const handleAddCustomFont = useCallback(async (file: File, fontName: string) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fontData = e.target?.result as ArrayBuffer;
        // Determine MIME type from extension
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        let mime = 'font/ttf';
        if (ext === 'woff') mime = 'font/woff';
        else if (ext === 'woff2') mime = 'font/woff2';
        else if (ext === 'otf') mime = 'font/otf';

        const blob = new Blob([fontData], { type: mime });
        const url = URL.createObjectURL(blob);

        const fontFace = new FontFace(fontName, `url(${url})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        // Ensure font is available for measurement
        try { await document.fonts.load(`1em ${fontName}`); } catch (e) { /* ignore */ }

        // Add to custom fonts list if not present
        setCustomFonts(prev => prev.includes(fontName) ? prev : [...prev, fontName]);
        toast.success(`Font "${fontName}" loaded successfully`);

        // Revoke object URL after a short delay to allow browser to use it
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { } }, 5000);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Font load error', error);
      toast.error('Failed to load font');
    }
  }, []);

  // Custom shape handler
  const handleAddCustomShape = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const name = file.name.replace(/\.[^/.]+$/, '');
      setCustomShapes(prev => [...prev, { name, url }]);
      toast.success(`Shape "${name}" uploaded`);
    };
    reader.readAsDataURL(file);
  }, []);

  // Add custom shape to canvas
  const addCustomShapeToCanvas = useCallback((shapeUrl: string, shapeName: string) => {
    if (!activeCanvas) return;

    const centerX = (widthMm * mmToPixels) / 2 / zoom;
    const centerY = (heightMm * mmToPixels) / 2 / zoom;

    FabricImage.fromURL(shapeUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const maxSize = 100;
      if (img.width && img.height) {
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        img.scale(scale);
      }

      img.set({
        left: centerX - 50,
        top: centerY - 50,
        data: { type: 'customShape', name: shapeName },
      });

      activeCanvas.add(img);
      activeCanvas.setActiveObject(img);
      activeCanvas.requestRenderAll();
      setActiveTool('select');
      toast.success(`Shape "${shapeName}" added`);
    }).catch(() => {
      toast.error('Failed to load shape');
    });
  }, [activeCanvas, widthMm, heightMm, zoom]);

  // Add icon to canvas
  const addIconToCanvas = useCallback((iconName: string, iconUrl: string) => {
    if (!activeCanvas) return;

    const centerX = (widthMm * mmToPixels) / 2 / zoom;
    const centerY = (heightMm * mmToPixels) / 2 / zoom;

    const addImageObject = (img: any) => {
      const maxSize = 50; // Icons are typically smaller
      if (img.width && img.height) {
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        img.scale(scale);
      }

      img.set({
        left: centerX - 25,
        top: centerY - 25,
        data: { type: 'icon', name: iconName },
      });

      activeCanvas.add(img);
      activeCanvas.setActiveObject(img);
      activeCanvas.requestRenderAll();
      setActiveTool('select');
      toast.success(`Icon "${iconName}" added`);
    };

    FabricImage.fromURL(iconUrl, { crossOrigin: 'anonymous' }).then(addImageObject).catch(async () => {
      // Fallback: fetch as blob and load via object URL (helps when CORS or headers prevent direct loading)
      try {
        const resp = await fetch(iconUrl);
        if (!resp.ok) throw new Error('fetch failed');
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        FabricImage.fromURL(objectUrl, { crossOrigin: 'anonymous' }).then((img) => {
          addImageObject(img);
          // Revoke after slight delay to ensure image used by canvas
          setTimeout(() => { try { URL.revokeObjectURL(objectUrl); } catch (e) { } }, 2000);
        }).catch((e) => {
          toast.error('Failed to load icon');
        });
      } catch (err) {
        toast.error('Failed to load icon');
      }
    });
  }, [activeCanvas, widthMm, heightMm, zoom]);

  // Change photo placeholder shape
  const changePhotoPlaceholderShape = useCallback((newShape: PhotoShape, customMaskUrl?: string) => {
    if (!selectedObject || !activeCanvas) return;

    // Check if selected object is a photo placeholder
    const objData = selectedObject.data;
    if (!objData?.isPhoto) return;

    // If the object is an actual image, apply masking instead of replacing it
    if (selectedObject.type === 'image') {
      const width = selectedObject.width;
      const height = selectedObject.height;
      let clipPath;
      const minDim = Math.min(width, height);

      if (newShape === 'custom' && customMaskUrl) {
        // Load mask image and apply as clipPath
        FabricImage.fromURL(customMaskUrl, { crossOrigin: 'anonymous' }).then((maskImg) => {
          if (maskImg.width && maskImg.height) {
            const scale = Math.min(width / maskImg.width, height / maskImg.height);
            maskImg.scale(scale);
          }
          maskImg.set({
            originX: 'center',
            originY: 'center',
            left: 0,
            top: 0
          });
          selectedObject.set('clipPath', maskImg);
          selectedObject.set({ data: { ...selectedObject.data, shape: newShape, customMaskUrl } });
          activeCanvas.requestRenderAll();
          saveToHistory();
          toast.success('Custom mask applied');
        }).catch(err => {
          console.error('Failed to load mask', err);
          toast.error('Failed to load mask');
        });
        return;
      }

      switch (newShape) {
        case 'circle':
          clipPath = new Circle({
            radius: minDim / 2,
            originX: 'center',
            originY: 'center',
            left: 0, top: 0
          });
          break;
        case 'ellipse':
          clipPath = new Circle({
            radius: width / 2,
            scaleY: height / width,
            originX: 'center',
            originY: 'center',
            left: 0, top: 0
          });
          break;
        case 'rounded-rect':
          clipPath = new Rect({
            width: width,
            height: height,
            rx: Math.min(width, height) * 0.15,
            ry: Math.min(width, height) * 0.15,
            originX: 'center',
            originY: 'center',
            left: 0, top: 0
          });
          break;
        case 'hexagon':
          const hexPoints = createPolygonPoints(6, minDim / 2);
          clipPath = new Polygon(hexPoints, { originX: 'center', originY: 'center', left: 0, top: 0 });
          break;
        case 'star':
          const starPts = createStarPoints(5, minDim / 2, minDim / 4);
          clipPath = new Polygon(starPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
          break;
        case 'heart':
          const heartPts = createHeartPoints(minDim / 2);
          clipPath = new Polygon(heartPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
          break;
        case 'octagon':
          const octPts = createPolygonPoints(8, minDim / 2);
          clipPath = new Polygon(octPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
          break;
        case 'pentagon':
          const pentPts = createPolygonPoints(5, minDim / 2);
          clipPath = new Polygon(pentPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
          break;
        case 'triangle':
          const triPts = createPolygonPoints(3, minDim / 2);
          clipPath = new Polygon(triPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
          break;
        case 'rect':
        default:
          clipPath = null; // No clip path for rect (reset)
          break;
      }

      selectedObject.set('clipPath', clipPath);
      selectedObject.set({ data: { ...selectedObject.data, shape: newShape } });
      activeCanvas.requestRenderAll();
      saveToHistory();
      toast.success(`Photo shape updated to ${newShape}`);
      return;
    }

    // Get current position and size
    const bounds = selectedObject.getBoundingRect();
    const left = selectedObject.left || 0;
    const top = selectedObject.top || 0;
    const currentWidth = bounds.width / (activeCanvas.getZoom() || 1);
    const currentHeight = bounds.height / (activeCanvas.getZoom() || 1);

    // Remove old object
    activeCanvas.remove(selectedObject);

    // ... rest of logic for placeholders ...
    // Handle custom mask
    if (newShape === 'custom' && customMaskUrl) {
      FabricImage.fromURL(customMaskUrl, { crossOrigin: 'anonymous' }).then((img) => {
        if (img.width && img.height) {
          const scale = Math.min(currentWidth / img.width, currentHeight / img.height);
          img.scale(scale);
        }

        img.set({
          left,
          top,
          data: { type: 'variable', field: 'photo', isPhoto: true, shape: 'custom', customMaskUrl },
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });

        activeCanvas.add(img);
        activeCanvas.setActiveObject(img);
        activeCanvas.requestRenderAll();
        setSelectedObject(img);
        toast.success('Photo shape changed to custom');
      }).catch((error: Error) => {
        console.error('Failed to load custom mask:', error);
        toast.error('Failed to load custom mask image. Reverting to previous shape.');
        // Re-add the original object since we removed it
        activeCanvas.add(selectedObject);
        // selectedObject might be stale, but in this scope it refers to the removed object
        activeCanvas.setActiveObject(selectedObject);
        activeCanvas.requestRenderAll();
      });
      return;
    }

    // Create new object with same position but new shape
    let newObj: any;

    switch (newShape) {
      case 'circle':
        newObj = new Circle({
          left,
          top,
          radius: Math.min(currentWidth, currentHeight) / 2,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'ellipse':
        newObj = new Circle({
          left,
          top,
          radius: 40,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          scaleX: currentWidth / 80,
          scaleY: currentHeight / 80,
        });
        break;
      case 'rounded-rect':
        newObj = new Rect({
          left,
          top,
          width: currentWidth,
          height: currentHeight,
          rx: 15,
          ry: 15,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'hexagon':
        const hexPoints = createPolygonPoints(6, Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(hexPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'star':
        const starPts = createStarPoints(5, Math.min(currentWidth, currentHeight) / 2, Math.min(currentWidth, currentHeight) / 4);
        newObj = new Polygon(starPts, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'heart':
        const heartPoints = createHeartPoints(Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(heartPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'octagon':
        const octPoints = createPolygonPoints(8, Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(octPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'pentagon':
        const pentPoints = createPolygonPoints(5, Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(pentPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'triangle':
        const triPoints = createPolygonPoints(3, Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(triPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'rect':
      default:
        newObj = new Rect({
          left,
          top,
          width: currentWidth,
          height: currentHeight,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
    }

    newObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: newShape });
    activeCanvas.add(newObj);
    activeCanvas.setActiveObject(newObj);
    activeCanvas.requestRenderAll();
    setSelectedObject(newObj);
    toast.success(`Photo shape changed to ${newShape}`);
  }, [selectedObject, activeCanvas]);

  // Add Project Photo handler
  const addProjectPhoto = useCallback((url: string) => {
    if (!activeCanvas) return;

    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      const canvasWidth = activeCanvas.width || 800;
      const canvasHeight = activeCanvas.height || 600;

      // Resize if too big
      const maxSize = Math.min(canvasWidth, canvasHeight) * 0.5;
      if (img.width && img.height && (img.width > maxSize || img.height > maxSize)) {
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        img.scale(scale);
      }

      img.set({
        left: canvasWidth / 2 - (img.width! * (img.scaleX || 1)) / 2,
        top: canvasHeight / 2 - (img.height! * (img.scaleY || 1)) / 2,
        data: { isPhoto: true, shape: 'rect' }
      });

      activeCanvas.add(img);
      activeCanvas.setActiveObject(img);
      activeCanvas.requestRenderAll();
      saveToHistory();
      toast.success('Project photo added');
      setActiveTool('select');
    }).catch(err => {
      console.error('Failed to load project photo:', err);
      toast.error('Failed to load photo');
    });
  }, [activeCanvas, saveToHistory]);

  /**
   * Deletes the selected object(s) from the canvas
   * Removes all active objects and clears selection
   * Re-renders canvas after deletion
   * @returns {void}
   */
  /**
   * Applies a shape mask (clipPath) to the selected object
   * @param {string} shape - Shape type (none, rect, circle, star)
   */
  const handleApplyMask = useCallback((shape: string) => {
    if (!activeCanvas || !selectedObject) return;

    if (shape === 'none') {
      selectedObject.set('clipPath', undefined);
      activeCanvas.requestRenderAll();
      saveToHistory();
      return;
    }

    const width = selectedObject.width;
    const height = selectedObject.height;
    const minDim = Math.min(width, height);

    let clipPath;

    switch (shape) {
      case 'circle':
        clipPath = new Circle({
          radius: minDim / 2,
          originX: 'center',
          originY: 'center',
          left: 0, top: 0
        });
        break;
      case 'ellipse':
        clipPath = new Circle({
          radius: width / 2,
          scaleY: height / width,
          originX: 'center',
          originY: 'center',
          left: 0, top: 0
        });
        break;
      case 'rounded-rect':
        clipPath = new Rect({
          width: width,
          height: height,
          rx: Math.min(width, height) * 0.15,
          ry: Math.min(width, height) * 0.15,
          originX: 'center',
          originY: 'center',
          left: 0, top: 0
        });
        break;
      case 'rect':
        clipPath = new Rect({
          width: width,
          height: height,
          originX: 'center',
          originY: 'center',
          left: 0, top: 0
        });
        break;
      case 'star':
        const starPts = createStarPoints(5, minDim / 2, minDim / 4);
        clipPath = new Polygon(starPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
        break;
      case 'heart':
        const heartPts = createHeartPoints(minDim / 2);
        clipPath = new Polygon(heartPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
        break;
      case 'hexagon':
        const hexPoints = createPolygonPoints(6, minDim / 2);
        clipPath = new Polygon(hexPoints, { originX: 'center', originY: 'center', left: 0, top: 0 });
        break;
      case 'octagon':
        const octPoints = createPolygonPoints(8, minDim / 2);
        clipPath = new Polygon(octPoints, { originX: 'center', originY: 'center', left: 0, top: 0 });
        break;
      case 'pentagon':
        const pentPoints = createPolygonPoints(5, minDim / 2);
        clipPath = new Polygon(pentPoints, { originX: 'center', originY: 'center', left: 0, top: 0 });
        break;
      case 'triangle':
        const triPoints = createPolygonPoints(3, minDim / 2);
        clipPath = new Polygon(triPoints, { originX: 'center', originY: 'center', left: 0, top: 0 });
        break;
    }

    if (clipPath) {
      selectedObject.set('clipPath', clipPath);
      // Determine if we should tag the object as a specific shape in data
      if (!selectedObject.data) selectedObject.data = {};
      selectedObject.data.shape = shape;

      activeCanvas.requestRenderAll();
      saveToHistory();
      toast.success(`Applied ${shape} mask`);
    }
  }, [activeCanvas, selectedObject, saveToHistory]);

  /**
   * Deletes the selected object(s) from the canvas
   */
  const handleDelete = useCallback(() => {
    if (!activeCanvas) return;
    const activeObjects = activeCanvas.getActiveObjects();

    activeObjects.forEach((obj: any) => {
      activeCanvas.remove(obj);

      // If deleting a variable-box, find and remove associated text object
      if (obj.data?.type === 'variable-box' && obj.data?.field) {
        const textObj = activeCanvas.getObjects().find((o: any) =>
          o.data?.type === 'variable-text' &&
          o.data?.field === obj.data.field
        );
        if (textObj) {
          activeCanvas.remove(textObj);
        }
      }

      // If deleting a variable-text (rare, since not selectable), remove parent box
      if (obj.data?.type === 'variable-text' && obj.data?.parentBox) {
        // Find parent box in canvas objects just in case the reference is stale
        const parentBox = activeCanvas.getObjects().find((o: any) => o === obj.data.parentBox);
        if (parentBox) {
          activeCanvas.remove(parentBox);
        }
      }
    });

    activeCanvas.discardActiveObject();
    activeCanvas.requestRenderAll();
    setSelectedObject(null);
  }, [activeCanvas]);

  /**
   * Copies the selected object to clipboard for pasting
   * Creates a clone of the object and stores in component state
   * Shows success toast notification on copy
   * @returns {void}
   */
  const handleCopy = useCallback(() => {
    if (!selectedObject) return;
    selectedObject.clone().then((cloned: any) => {
      setClipboard(cloned);
      toast.success('Copied to clipboard');
    });
  }, [selectedObject]);

  /**
   * Pastes the clipboard object back onto the canvas
   * Clones the clipboard content and offsets by 20px to avoid overlap
   * Automatically selects the pasted object
   * @returns {void}
   */
  const handlePaste = useCallback(() => {
    if (!clipboard || !activeCanvas) return;
    clipboard.clone().then((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      activeCanvas.add(cloned);
      activeCanvas.setActiveObject(cloned);
      activeCanvas.requestRenderAll();
    });
  }, [clipboard, activeCanvas]);

  /**
   * Background operation handlers - manage canvas background color, gradient, and image
   * Supports solid colors, linear/radial gradients, and background images
   * Updates canvas appearance in real-time
   */
  // Background handlers
  const handleBackgroundColorChange = useCallback((color: string) => {
    setBackgroundColor(color);
    if (activeCanvas) {
      activeCanvas.backgroundColor = color;
      activeCanvas.requestRenderAll();
    }
  }, [activeCanvas]);

  /**
   * Applies a gradient background to the canvas
   * Supports linear and radial gradients with multiple color stops
   * @param {Object} gradientConfig - Gradient configuration with type, angle, colors
   * @returns {void}
   */
  const handleBackgroundGradientChange = useCallback((gradientConfig: any) => {
    if (!activeCanvas) return;

    try {
      const canvasWidth = widthMm * mmToPixels;
      const canvasHeight = heightMm * mmToPixels;

      // Remove any existing background (gradient or image)
      const existingGradientBg = activeCanvas.getObjects().find((obj: any) => obj.data?.isGradientBackground);
      if (existingGradientBg) {
        activeCanvas.remove(existingGradientBg);
      }
      activeCanvas.backgroundImage = null;
      activeCanvas.renderAll();
      setHasBackgroundImage(false);

      const fabricGradientConfig = gradientConfigToFabric(gradientConfig, canvasWidth, canvasHeight);

      // Create gradient with proper Fabric.js v6 API
      const colorStops = Object.entries(fabricGradientConfig.colorStops).map(([offset, color]) => ({
        offset: parseFloat(offset),
        color: color as string,
      }));

      let gradient;
      if (fabricGradientConfig.type === 'radial') {
        gradient = new Gradient<'radial'>({
          type: 'radial',
          coords: fabricGradientConfig.coords as any,
          colorStops,
        });
      } else {
        gradient = new Gradient<'linear'>({
          type: 'linear',
          coords: fabricGradientConfig.coords,
          colorStops,
        });
      }

      // Create a full-canvas rect with gradient fill (canvas.backgroundColor doesn't support gradients)
      const gradientRect = new Rect({
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight,
        fill: gradient,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        excludeFromExport: false,
        originX: 'left',
        originY: 'top',
        data: { isGradientBackground: true },
      });

      activeCanvas.add(gradientRect);
      activeCanvas.sendObjectToBack(gradientRect);

      // Clear solid background color since we're using gradient rect
      activeCanvas.backgroundColor = 'transparent';
      setBackgroundColor('transparent');

      activeCanvas.requestRenderAll();
    } catch (error) {
      console.error('Error applying gradient:', error);
      toast.error('Failed to apply gradient');
    }
  }, [activeCanvas, widthMm, heightMm]);

  /**
   * Sets a background image for the canvas
   * Scales the image to fill the entire canvas dimensions
   * Locks the background image to prevent accidental movement/editing
   * Removes any existing background image first
   * @param {File} file - The image file to use as background
   * @returns {void}
   */
  const handleBackgroundImageChange = useCallback((file: File) => {
    if (!activeCanvas) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' }).then((img) => {
        if (!activeCanvas) return; // Re-check active canvas inside promise

        const canvasWidth = widthMm * mmToPixels;
        const canvasHeight = heightMm * mmToPixels;

        // Remove any existing gradient background
        const existingGradientBg = activeCanvas.getObjects().find((obj: any) => obj.data?.isGradientBackground);
        if (existingGradientBg) {
          activeCanvas.remove(existingGradientBg);
        }

        activeCanvas.backgroundImage = img;
        if (activeCanvas.backgroundImage && activeCanvas.backgroundImage instanceof FabricImage) {
          activeCanvas.backgroundImage.set({
            originX: 'left',
            originY: 'top',
            scaleX: canvasWidth / (img.width || 1),
            scaleY: canvasHeight / (img.height || 1),
          });
        }
        activeCanvas.renderAll();

        setHasBackgroundImage(true);
        toast.success('Background image applied');
      }).catch((error: Error) => {
        console.error('Failed to load background image:', error);
        toast.error('Failed to load background image. Please check the file format and try again.');
      });
    };
    reader.readAsDataURL(file);
  }, [activeCanvas, widthMm, heightMm]);

  const handleRemoveBackgroundImage = useCallback(() => {
    if (!activeCanvas) return;
    activeCanvas.backgroundImage = null;
    activeCanvas.renderAll();
    setHasBackgroundImage(false);
  }, [activeCanvas]);

  const handleRemoveBackgroundGradient = useCallback(() => {
    if (!activeCanvas) return;
    const gradientBg = activeCanvas.getObjects().find((obj: any) => obj.data?.isGradientBackground);
    if (gradientBg) {
      activeCanvas.remove(gradientBg);
      activeCanvas.requestRenderAll();
    }
  }, [activeCanvas]);

  // ==================== Alignment Functions ====================
  /**
   * Align selected object to left edge of canvas
   */
  const alignLeft = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.set('left', 0);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  /**
   * Align selected object to horizontal center of canvas
   */
  const alignCenter = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    const canvasWidth = activeCanvas.width || 0;
    const objWidth = selectedObject.width * (selectedObject.scaleX || 1);
    selectedObject.set('left', (canvasWidth - objWidth) / 2);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  /**
   * Align selected object to right edge of canvas
   */
  const alignRight = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    const canvasWidth = activeCanvas.width || 0;
    const objWidth = selectedObject.width * (selectedObject.scaleX || 1);
    selectedObject.set('left', canvasWidth - objWidth);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  /**
   * Align selected object to top edge of canvas
   */
  const alignTop = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.set('top', 0);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  /**
   * Aligns the selected object to the vertical center (middle) of the canvas
   * Positions the object so that it is equidistant from top and bottom edges
   */
  const alignMiddle = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    const canvasHeight = activeCanvas.height || 0;
    const objHeight = selectedObject.height * (selectedObject.scaleY || 1);
    selectedObject.set('top', (canvasHeight - objHeight) / 2);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  /**
   * Aligns the selected object to the bottom of the canvas
   * Positions the bottom edge of the object at the bottom edge of the canvas
   */
  const alignBottom = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    const canvasHeight = activeCanvas.height || 0;
    const objHeight = selectedObject.height * (selectedObject.scaleY || 1);
    selectedObject.set('top', canvasHeight - objHeight);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  /**
   * Flips the selected object horizontally (mirrors left-right)
   * Toggles the flipX property on the object
   */
  const flipHorizontal = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  /**
   * Flips the selected object vertically (mirrors top-bottom)
   * Toggles the flipY property on the object
   */
  const flipVertical = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  /**
   * Brings the selected object forward by one layer (increases z-index)
   * Uses Fabric v6's moveObjectTo API for reliable z-index manipulation
   * @param {Object} [obj] - Optional object to move; defaults to selectedObject
   * @returns {void}
   */
  const bringForward = useCallback((obj?: any) => {
    const target = obj || selectedObject;
    if (!target || !activeCanvas) return;

    // In Fabric v6, the object reference from the state should match the canvas object
    // Get the object's current index in the canvas
    const canvasObjects = activeCanvas.getObjects();
    const currentIndex = canvasObjects.indexOf(target);

    if (currentIndex >= 0 && currentIndex < canvasObjects.length - 1) {
      // Move object forward by one position (increase z-index)
      // Use moveObjectTo which is the Fabric v6 method
      if (typeof activeCanvas.moveObjectTo === 'function') {
        activeCanvas.moveObjectTo(target, currentIndex + 1);
      } else if (typeof activeCanvas.bringObjectForward === 'function') {
        // Fallback to older method if available
        activeCanvas.bringObjectForward(target);
      }
      activeCanvas.requestRenderAll();
      updateObjectsList();
    }
  }, [selectedObject, activeCanvas, updateObjectsList]);

  /**
   * Sends the selected object backward by one layer (decreases z-index)
   * Uses Fabric v6's moveObjectTo API for reliable z-index manipulation
   * @param {Object} [obj] - Optional object to move; defaults to selectedObject
   * @returns {void}
   */
  const sendBackward = useCallback((obj?: any) => {
    const target = obj || selectedObject;
    if (!target || !activeCanvas) return;

    // In Fabric v6, the object reference from the state should match the canvas object
    // Get the object's current index in the canvas
    const canvasObjects = activeCanvas.getObjects();
    const currentIndex = canvasObjects.indexOf(target);

    if (currentIndex > 0) {
      // Move object backward by one position (decrease z-index)
      // Use moveObjectTo which is the Fabric v6 method
      if (typeof activeCanvas.moveObjectTo === 'function') {
        activeCanvas.moveObjectTo(target, currentIndex - 1);
      } else if (typeof activeCanvas.sendObjectBackwards === 'function') {
        // Fallback to older method if available
        activeCanvas.sendObjectBackwards(target);
      }
      activeCanvas.requestRenderAll();
      updateObjectsList();
    }
  }, [selectedObject, activeCanvas, updateObjectsList]);

  /**
   * Toggles the visibility of an object on the canvas
   * Shows the object if it's hidden, hides it if it's visible
   * @param {Object} obj - The object to toggle visibility on
   * @returns {void}
   */
  const toggleVisibility = useCallback((obj: any) => {
    if (!activeCanvas) return;
    obj.set('visible', !obj.visible);
    activeCanvas.requestRenderAll();
    updateObjectsList();
  }, [activeCanvas, updateObjectsList]);

  /**
   * Toggles the lock state of an object on the canvas
   * Locked objects cannot be moved or modified until unlocked
   * @param {Object} obj - The object to toggle lock on
   * @returns {void}
   */
  const toggleLock = useCallback((obj: any) => {
    if (!activeCanvas) return;
    const isCurrentlyLocked = obj.lockMovementX === true && obj.lockMovementY === true;
    const newLockedState = !isCurrentlyLocked;

    // Explicitly set lock properties to ensure they're saved
    obj.set({
      lockMovementX: newLockedState,
      lockMovementY: newLockedState,
      lockRotation: newLockedState,
      lockScalingX: newLockedState,
      lockScalingY: newLockedState,
      // When locked: not selectable at all to prevent any drag attempts
      selectable: !newLockedState,
      evented: !newLockedState,
      hasControls: !newLockedState,
      hasBorders: !newLockedState,
    });

    // Mark object as dirty to ensure properties are saved
    obj.dirty = true;

    // Deselect if locking
    if (newLockedState && activeCanvas.getActiveObject() === obj) {
      activeCanvas.discardActiveObject();
    }

    activeCanvas.requestRenderAll();
    updateObjectsList();

    // Save to history to persist lock state
    saveToHistory();
  }, [activeCanvas, updateObjectsList, saveToHistory]);

  /**
   * Exports the current template design as a high-quality PNG image
   * Uses 3x multiplier for high resolution export (suitable for printing)
   * Downloads the image with the template name as filename
   * @returns {void}
   */
  const handleExport = useCallback(() => {
    if (!activeCanvas) return;
    const dataUrl = activeCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 3,
    });
    const link = document.createElement('a');
    link.download = `${templateName}.png`;
    link.href = dataUrl;
    link.click();
    toast.success('Template exported as PNG');
  }, [activeCanvas, templateName]);

  /**
   * Handles context menu (right-click) display for object operations
   * Shows menu at cursor position with options for duplication, deletion, etc.
   * @param {MouseEvent} e - The mouse event from right-click
   * @returns {void}
   */
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  /**
   * Closes the context menu by hiding it
   * @returns {void}
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  /**
   * Duplicates the selected object by cloning it and offsetting position
   * Creates an exact copy positioned 20px to the right and below the original
   * @returns {void}
   */
  const handleDuplicate = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.clone().then((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      activeCanvas.add(cloned);
      activeCanvas.setActiveObject(cloned);
      activeCanvas.requestRenderAll();
      toast.success('Object duplicated');
    });
  }, [selectedObject, activeCanvas]);

  /**
   * Brings the selected object to the front (topmost z-index)
   * Object will appear above all other objects on the canvas
   * @returns {void}
   */
  const bringToFront = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    activeCanvas.bringObjectToFront(selectedObject);
    activeCanvas.requestRenderAll();
    updateObjectsList();
  }, [selectedObject, activeCanvas, updateObjectsList]);

  /**
   * Sends the selected object to the back (bottommost z-index)
   * Object will appear below all other objects on the canvas
   * @returns {void}
   */
  const sendToBack = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    activeCanvas.sendObjectToBack(selectedObject);
    activeCanvas.requestRenderAll();
    updateObjectsList();
  }, [selectedObject, activeCanvas, updateObjectsList]);

  /**
   * Extracts all variable placeholders from the template
   * Variables are identified by {{variableName}} format in text objects
   * Returns a unique array of variable names found in the template
   * @returns {string[]} Array of variable names (e.g., ['firstName', 'lastName', 'date'])
   */
  const extractVariables = useCallback(() => {
    if (!activeCanvas) return [];
    const variables: string[] = [];
    // match any content inside {{...}} non-greedily (matches same as replaceVariables)
    const variableRegex = /\{\{(.+?)\}\}/g;

    activeCanvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'textbox' && obj.text) {
        let match;
        while ((match = variableRegex.exec(obj.text)) !== null) {
          if (!variables.includes(match[1])) {
            variables.push(match[1]);
          }
        }
      }
      if (obj.data?.field) {
        if (!variables.includes(obj.data.field)) {
          variables.push(obj.data.field);
        }
      }
    });
    return variables;
  }, [activeCanvas]);

  // Update detected variables when objects change
  useEffect(() => {
    const vars = extractVariables();
    setDetectedVariables(vars);
  }, [objects, extractVariables]);

  // Auto font size helper - calculates font size to fit text within bounds
  /**
   * Calculates the optimal font size for text to fit within given bounds
   * Uses binary search algorithm to find largest readable font size
   * Respects minimum font size of 10px to ensure readability
   * Accounts for line height and text wrapping in calculations
   * @param {Object} obj - The text object with font properties
   * @param {string} text - The text content to measure
   * @param {number} maxWidth - Maximum width available in pixels
   * @param {number} maxHeight - Maximum height available in pixels
   * @returns {number} Optimal font size in pixels that fits the bounds
   */
  const calculateAutoFontSize = useCallback((obj: any, text: string, maxWidth: number, maxHeight: number): number => {
    const baseFontSize = obj.fontSize || 16;
    const minFontSize = 10; // Minimum readable font size

    // Create a temporary canvas to measure text
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return baseFontSize;

    let fontSize = baseFontSize;
    const fontFamily = obj.fontFamily || 'Arial';
    const fontWeight = obj.fontWeight || 'normal';
    const lineHeight = obj.lineHeight || 1.2;

    // Binary search for optimal font size
    let minSize = minFontSize;
    let maxSize = baseFontSize;

    while (minSize <= maxSize) {
      const testSize = Math.floor((minSize + maxSize) / 2);
      ctx.font = `${fontWeight} ${testSize}px ${fontFamily}`;

      // Measure text width
      const textWidth = ctx.measureText(text).width;
      // Estimate text height (for single line)
      const textHeight = testSize * lineHeight;

      if (textWidth <= maxWidth && textHeight <= maxHeight) {
        fontSize = testSize;
        minSize = testSize + 1;
      } else {
        maxSize = testSize - 1;
      }
    }

    return Math.max(minFontSize, fontSize);
  }, []);

  /**
   * Data preview functionality - Replace variables with sample data
   * Stores original text and font sizes for restoration later
   * Applies auto font sizing if enabled on objects
   * @param {Record<string, string>} data - Object mapping variable names to preview values
   * @returns {void}
   */
  // Data preview handlers
  const handlePreviewData = useCallback((data: Record<string, string>) => {
    if (!fabricCanvas) return;
    setPreviewData(data);

    const applyToCanvas = (canvas: FabricCanvas | null) => {
      if (!canvas) return;

      // First, remove any existing preview images to replace them with new ones
      const existingPreviewImages = canvas.getObjects().filter((o: any) => o?.data?.type === 'preview-photo');
      existingPreviewImages.forEach((img: any) => {
        const placeholderObj = img.data?.previewForObject;
        try {
          canvas.remove(img);
        } catch (e) { }
        // Re-add the placeholder for re-processing
        if (placeholderObj) {
          try {
            canvas.add(placeholderObj);
            if (placeholderObj.data) delete placeholderObj.data.previewImageAdded;
          } catch (e) { }
        }
      });

      // Replace variable text and photos with preview data
      canvas.getObjects().forEach((obj: any) => {
        // Handle photo variable placeholders: load image preview and replace placeholder
        if (obj.data?.type === 'variable' && (obj.data?.isPhoto || obj.data?.field?.toLowerCase().includes('photo')) && obj.data?.field) {
          const fieldName = obj.data.field;

          // Try exact match first
          let url = data[fieldName];

          // If not found, try case-insensitive match
          if (!url) {
            const matchingKey = Object.keys(data).find(key => key.toLowerCase() === fieldName.toLowerCase());
            if (matchingKey) url = data[matchingKey];
          }

          // If field is generic 'photo', try common variations
          if (!url && fieldName.toLowerCase() === 'photo') {
            const commonKeys = ['image', 'picture', 'profile_picture', 'photo_url', 'img', 'cropped_photo_url', 'school_id_url'];
            const matchingKey = Object.keys(data).find(key => commonKeys.includes(key.toLowerCase()));
            if (matchingKey) url = data[matchingKey];
          }

          // Normalize URL if it's a relative path (common with proxied uploads)
          if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
            const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            if (url.startsWith('/')) {
              url = `${backendBase}${url}`;
            } else {
              url = `${backendBase}/${url}`;
            }
          }

          console.log(`[Preview] Loading photo for field "${fieldName}":`, url);

          if (url && !obj.data.previewImageAdded) {
            // Try direct load first, fallback to fetch->blob if CORS blocks
            FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
              try {
                const bounds = obj.getBoundingRect();
                const targetWidth = bounds.width / (canvas.getZoom() || 1);
                const targetHeight = bounds.height / (canvas.getZoom() || 1);
                if (img.width && img.height) {
                  // Scale to cover the placeholder area
                  const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
                  img.scale(scale);
                }

                // Apply clipping based on placeholder shape
                const shape = obj.data.shape || 'rect';
                let clipPath;
                const minDim = Math.min(targetWidth, targetHeight);
                const width = targetWidth;
                const height = targetHeight;

                switch (shape) {
                  case 'circle':
                    clipPath = new Circle({
                      radius: minDim / 2,
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'ellipse':
                    clipPath = new Circle({
                      radius: width / 2,
                      scaleY: height / width,
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'rounded-rect':
                    clipPath = new Rect({
                      width: width,
                      height: height,
                      rx: Math.min(width, height) * 0.15,
                      ry: Math.min(width, height) * 0.15,
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'hexagon':
                    clipPath = new Polygon(createPolygonPoints(6, minDim / 2), {
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'star':
                    clipPath = new Polygon(createStarPoints(5, minDim / 2, minDim / 4), {
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'heart':
                    clipPath = new Polygon(createHeartPoints(minDim / 2), {
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'octagon':
                    clipPath = new Polygon(createPolygonPoints(8, minDim / 2), {
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'pentagon':
                    clipPath = new Polygon(createPolygonPoints(5, minDim / 2), {
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'triangle':
                    const triPts = createPolygonPoints(3, minDim / 2);
                    clipPath = new Polygon(triPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
                    break;
                  case 'rect':
                  default:
                    // No extra clip needed for rect if we just follow the bounds, but for consistency:
                    clipPath = new Rect({
                      width: width,
                      height: height,
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                }

                if (clipPath) {
                  img.clipPath = clipPath;
                }

                img.set({
                  left: obj.left,
                  top: obj.top,
                  angle: obj.angle,
                  originX: obj.originX,
                  originY: obj.originY,
                  scaleX: img.scaleX, // Preserve calculated scale
                  scaleY: img.scaleY,
                  objectCaching: false,
                  data: {
                    type: 'preview-photo',
                    field: fieldName,
                    previewForObject: obj,
                  },
                  selectable: false,
                  evented: false,
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
                // Get index of placeholder to maintain Z-order
                const objIndex = canvas.getObjects().indexOf(obj);
                canvas.remove(obj);

                if (objIndex !== -1) {
                  canvas.insertAt(objIndex, img);
                } else {
                  canvas.add(img);
                }

                obj.data.previewImageAdded = true;
                canvas.requestRenderAll();
                canvas.renderAll();
                console.log(`[Preview] Successfully loaded and applied photo for field "${fieldName}"`);
              } catch (e) {
                console.error(`[Preview] Error processing preview image for field "${fieldName}" with URL ${url}:`, e);
              }
            }).catch(async (err) => {
              console.warn(`[Preview] Direct load failed for "${fieldName}", trying fetch fallback:`, err);
              try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
                const contentType = resp.headers.get('content-type');
                if (contentType && !contentType.startsWith('image/')) {
                  throw new Error(`Invalid content type: ${contentType}`);
                }
                const blob = await resp.blob();
                const objectUrl = URL.createObjectURL(blob);
                FabricImage.fromURL(objectUrl, { crossOrigin: 'anonymous' }).then((img) => {
                  const bounds = obj.getBoundingRect();
                  const targetWidth = bounds.width / (canvas.getZoom() || 1);
                  const targetHeight = bounds.height / (canvas.getZoom() || 1);
                  if (img.width && img.height) {
                    const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
                    img.scale(scale);
                  }

                  // Apply clipping based on placeholder shape
                  const shape = obj.data.shape || 'rect';
                  let clipPath;
                  const minDim = Math.min(targetWidth, targetHeight);
                  const width = targetWidth;
                  const height = targetHeight;

                  switch (shape) {
                    case 'circle':
                      clipPath = new Circle({
                        radius: minDim / 2,
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'ellipse':
                      clipPath = new Circle({
                        radius: width / 2,
                        scaleY: height / width,
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'rounded-rect':
                      clipPath = new Rect({
                        width: width,
                        height: height,
                        rx: Math.min(width, height) * 0.15,
                        ry: Math.min(width, height) * 0.15,
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'hexagon':
                      clipPath = new Polygon(createPolygonPoints(6, minDim / 2), {
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'star':
                      clipPath = new Polygon(createStarPoints(5, minDim / 2, minDim / 4), {
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'heart':
                      clipPath = new Polygon(createHeartPoints(minDim / 2), {
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'octagon':
                      clipPath = new Polygon(createPolygonPoints(8, minDim / 2), {
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'pentagon':
                      clipPath = new Polygon(createPolygonPoints(5, minDim / 2), {
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'triangle':
                      const triPts = createPolygonPoints(3, minDim / 2);
                      clipPath = new Polygon(triPts, { originX: 'center', originY: 'center', left: 0, top: 0 });
                      break;
                    case 'rect':
                    default:
                      // No extra clip needed for rect if we just follow the bounds, but for consistency:
                      clipPath = new Rect({
                        width: width,
                        height: height,
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                  }

                  if (clipPath) {
                    img.set('clipPath', clipPath);
                  }

                  img.set({
                    left: obj.left,
                    top: obj.top,
                    angle: obj.angle,
                    originX: obj.originX,
                    originY: obj.originY,
                    data: {
                      type: 'preview-photo',
                      field: fieldName,
                      previewForObject: obj,
                    },
                    selectable: false,
                    evented: false,
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
                  // Get index of placeholder to maintain Z-order
                  const objIndex = canvas.getObjects().indexOf(obj);
                  canvas.remove(obj);

                  if (objIndex !== -1) {
                    canvas.insertAt(objIndex, img);
                  } else {
                    canvas.add(img);
                  }

                  obj.data.previewImageAdded = true;
                  canvas.requestRenderAll();
                  canvas.renderAll();

                  // Revoke object URL after a delay to ensure it's loaded
                  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
                }).catch((e) => {
                  console.warn(`Failed to load preview image from blob URL for ${url}`, e);
                  URL.revokeObjectURL(objectUrl);
                });
              } catch (e) {
                console.warn(`Failed to fetch preview image: ${url}`, e);
              }
            });
          }
        }
        // Handle photo placeholders (non-variable type)
        else if (obj.data?.isPhotoPlaceholder || obj.data?.type === 'photo-placeholder') {
          const fieldName = obj.data?.field || 'photo';
          // Prioritize processed photos from AI tools (face crop, background removal)
          let url = data['cropped_photo_url'] || data['photo_url'] || data[fieldName] || data['photo'] || data['image'] || data['profilePic'];

          // Normalize URL
          if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
            const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            if (url.startsWith('/')) {
              url = `${backendBase}${url}`;
            } else {
              url = `${backendBase}/${url}`;
            }
          }

          console.log(`[Preview] Loading photo placeholder "${fieldName}":`, url);

          if (url && !obj.data.previewImageAdded) {
            FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
              try {
                const bounds = obj.getBoundingRect();
                const targetWidth = bounds.width / (canvas.getZoom() || 1);
                const targetHeight = bounds.height / (canvas.getZoom() || 1);
                if (img.width && img.height) {
                  const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
                  img.scale(scale);
                }

                // Apply clipping based on placeholder shape
                const shape = obj.data.shape || 'rect';
                let clipPath;
                const minDim = Math.min(targetWidth, targetHeight);
                const width = targetWidth;
                const height = targetHeight;

                switch (shape) {
                  case 'circle':
                    clipPath = new Circle({
                      radius: minDim / 2,
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  case 'rounded-rect':
                    clipPath = new Rect({
                      width: width,
                      height: height,
                      rx: Math.min(width, height) * 0.15,
                      ry: Math.min(width, height) * 0.15,
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                  default:
                    clipPath = new Rect({
                      width: width,
                      height: height,
                      originX: 'center',
                      originY: 'center',
                      left: 0, top: 0
                    });
                    break;
                }

                if (clipPath) {
                  img.clipPath = clipPath;
                }

                img.set({
                  left: obj.left,
                  top: obj.top,
                  angle: obj.angle,
                  originX: obj.originX,
                  originY: obj.originY,
                  data: {
                    type: 'preview-photo',
                    field: fieldName,
                    previewForObject: obj,
                  },
                  selectable: false,
                  evented: false,
                });

                const objIndex = canvas.getObjects().indexOf(obj);
                canvas.remove(obj);

                if (objIndex !== -1) {
                  canvas.insertAt(objIndex, img);
                } else {
                  canvas.add(img);
                }

                obj.data.previewImageAdded = true;
                canvas.requestRenderAll();
                console.log(`[Preview] Successfully loaded photo placeholder "${fieldName}"`);
              } catch (e) {
                console.error(`[Preview] Error processing photo placeholder "${fieldName}":`, e);
              }
            }).catch((err) => {
              console.error(`[Preview] Failed to load photo placeholder "${fieldName}":`, err);
            });
          }
        }
        // Handle masked photos
        else if ((obj as any).maskedPhoto || (obj as any).type === 'masked-photo') {
          const config = (obj as any).maskConfig;
          const binding = config?.variableBinding || (obj as any).variableBinding;

          if (binding) {
            const field = typeof binding === 'string' ? binding : binding.field;
            // Prioritize processed photos from AI tools
            let url = data.cropped_photo_url || data.photo_url || data[field] || data['photo'] || data['image'] || data['profilePic'];

            // Normalize URL
            if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
              const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
              if (url.startsWith('/')) {
                url = `${backendBase}${url}`;
              } else {
                url = `${backendBase}/${url}`;
              }
            }

            console.log(`[Preview] Loading masked photo for field "${field}":`, url);

            if (url && !obj.data?.previewImageAdded) {
              // For masked photos in preview, we'll just load the image with the mask applied
              FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
                try {
                  const targetWidth = (obj as any).width * ((obj as any).scaleX || 1);
                  const targetHeight = (obj as any).height * ((obj as any).scaleY || 1);

                  if (img.width && img.height) {
                    const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
                    img.scale(scale);
                  }

                  // Apply the mask shape from config
                  const shape = config?.shape || 'circle';
                  let clipPath;
                  const minDim = Math.min(targetWidth, targetHeight);

                  switch (shape) {
                    case 'circle':
                      clipPath = new Circle({
                        radius: minDim / 2,
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    case 'rounded-rect':
                      clipPath = new Rect({
                        width: targetWidth,
                        height: targetHeight,
                        rx: Math.min(targetWidth, targetHeight) * 0.15,
                        ry: Math.min(targetWidth, targetHeight) * 0.15,
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                    default:
                      clipPath = new Rect({
                        width: targetWidth,
                        height: targetHeight,
                        originX: 'center',
                        originY: 'center',
                        left: 0, top: 0
                      });
                      break;
                  }

                  if (clipPath) {
                    img.clipPath = clipPath;
                  }

                  img.set({
                    left: (obj as any).left,
                    top: (obj as any).top,
                    angle: (obj as any).angle || 0,
                    originX: (obj as any).originX || 'center',
                    originY: (obj as any).originY || 'center',
                    data: {
                      type: 'preview-photo',
                      field: field,
                      previewForObject: obj,
                    },
                    selectable: false,
                    evented: false,
                  });

                  const objIndex = canvas.getObjects().indexOf(obj);
                  canvas.remove(obj);

                  if (objIndex !== -1) {
                    canvas.insertAt(objIndex, img);
                  } else {
                    canvas.add(img);
                  }

                  if (!obj.data) obj.data = {};
                  obj.data.previewImageAdded = true;
                  canvas.requestRenderAll();
                  console.log(`[Preview] Successfully loaded masked photo for field "${field}"`);
                } catch (e) {
                  console.error(`[Preview] Error processing masked photo for field "${field}":`, e);
                }
              }).catch((err) => {
                console.error(`[Preview] Failed to load masked photo for field "${field}":`, err);
              });
            }
          }
        } else if (obj.data?.type === 'variable-box' && obj.data?.field) {
          const fieldName = obj.data.field;
          // Find the associated text object
          const previewTextObj = canvas.getObjects().find((o: any) =>
            o.data?.type === 'variable-text' &&
            o.data?.field === fieldName &&
            o.data?.parentBox === obj
          );

          if (previewTextObj) {
            // Store original text if not already stored
            if (!(previewTextObj as any).data) (previewTextObj as any).data = {};
            if (!(previewTextObj as any).data.originalText) {
              (previewTextObj as any).data.originalText = (previewTextObj as any).text;
            }
            if (!(previewTextObj as any).data.originalFontSize) {
              (previewTextObj as any).data.originalFontSize = (previewTextObj as any).fontSize;
            }

            let displayText = String(data[fieldName] || data[Object.keys(data).find(k => k.toLowerCase() === fieldName.toLowerCase()) || ''] || '');

            // Apply text case transformation if set
            if ((previewTextObj as any).data?.textCase === 'uppercase') {
              displayText = displayText.toUpperCase();
            } else if ((previewTextObj as any).data?.textCase === 'lowercase') {
              displayText = displayText.toLowerCase();
            } else if ((previewTextObj as any).data?.textCase === 'capitalize') {
              displayText = displayText.split(' ').map((w: string) =>
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
              ).join(' ');
            }

            previewTextObj.set('text', displayText);
            canvas.requestRenderAll();
          }
        } else if (obj.type === 'textbox' && obj.text) {
          // Handle regular variable text fields
          // Store original text and font size if not already stored
          if (!obj.data) obj.data = {};
          if (!obj.data.originalText) {
            obj.data.originalText = obj.text;
          }
          if (!obj.data.originalFontSize) {
            obj.data.originalFontSize = obj.fontSize;
          }

          // Replace variables with data (escape keys so special chars don't break RegExp)
          let newText = obj.data.originalText;
          Object.entries(data).forEach(([key, value]) => {
            const escaped = escapeRegExp(key);
            newText = newText.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), String(value));
          });

          // Apply auto font size if enabled
          if (obj.data?.autoFontSize) {
            const maxWidth = (obj.width || 100) * (obj.scaleX || 1);
            const maxHeight = (obj.height || 30) * (obj.scaleY || 1);
            const optimalFontSize = calculateAutoFontSize(obj, newText, maxWidth, maxHeight);
            obj.set('fontSize', optimalFontSize);
          }

          obj.set('text', newText);
        }
      });
      canvas.requestRenderAll();
    };

    applyToCanvas(fabricCanvas);
    if (hasBackSide) {
      applyToCanvas(backFabricCanvas);
    }
  }, [fabricCanvas, backFabricCanvas, hasBackSide, calculateAutoFontSize]);

  // Sync handlePreviewData to ref for use in addPlaceholder which is defined before handlePreviewData
  useEffect(() => {
    handlePreviewDataRef.current = handlePreviewData;
  }, [handlePreviewData]);

  /**
   * Resets preview mode by restoring original variable text and font sizes
   * Removes preview data from state
   * Used when exiting preview mode or switching between preview contexts
   * @returns {void}
   */
  const handleResetPreview = useCallback(() => {
    if (!activeCanvas) return;

    /**
     * Restores original text and font sizes after preview mode
     * Undoes all variable replacements made during preview
     * @returns {void}
     */
    // Remove preview images and restore original text and font size
    // First remove any preview-photo objects and restore their placeholders
    const previewImages = activeCanvas.getObjects().filter((o: any) => o?.data?.type === 'preview-photo');
    previewImages.forEach((img: any) => {
      const placeholderObj = img.data?.previewForObject;
      try {
        activeCanvas.remove(img);
      } catch (e) { }
      // Re-add the placeholder at its original position
      if (placeholderObj) {
        try {
          activeCanvas.add(placeholderObj);
          if (placeholderObj.data) delete placeholderObj.data.previewImageAdded;
        } catch (e) { }
      }
    });

    // Restore original text and font size
    activeCanvas.getObjects().forEach((obj: any) => {
      // Handle variable boxes
      if (obj.data?.type === 'variable-box' && obj.data?.field) {
        // Find the associated text object
        const resetTextObj = activeCanvas.getObjects().find((o: any) =>
          o.data?.type === 'variable-text' &&
          o.data?.field === obj.data.field &&
          o.data?.parentBox === obj
        );

        if (resetTextObj && (resetTextObj as any).data?.originalText) {
          resetTextObj.set('text', (resetTextObj as any).data.originalText);
          // Restore original font size if it was changed
          if ((resetTextObj as any).data.originalFontSize) {
            resetTextObj.set('fontSize', (resetTextObj as any).data.originalFontSize);
          }
        }
      } else if (obj.type === 'textbox' && (obj as any).data?.originalText) {
        // Handle regular variable text fields
        obj.set('text', obj.data.originalText);
        // Restore original font size if auto font size was used
        if (obj.data.originalFontSize) {
          obj.set('fontSize', obj.data.originalFontSize);
        }
      }
    });
    activeCanvas.requestRenderAll();
  }, [activeCanvas]);

  /**
   * Toggles between preview mode (with preview data) and edit mode
   * In preview mode, variables are replaced with sample data and read-only
   * @param {boolean} enabled - True to enter preview mode, false to exit
   * @returns {void}
   */
  const handleTogglePreviewMode = useCallback((enabled: boolean) => {
    setIsPreviewMode(enabled);
    if (!enabled) {
      handleResetPreview();
    }
  }, [handleResetPreview]);

  /**
   * Handles sidebar tool selection changes (pan, text, select modes)
   * Updates cursor and canvas behavior based on selected tool
   * @param {SidebarToolType} tool - The tool to activate ('pan', 'text', or 'select')
   * @returns {void}
   */
  const handleSidebarToolChange = useCallback((tool: SidebarToolType) => {
    if (tool === 'pan') {
      setActiveTool('pan' as ToolType);
      if (activeCanvas) {
        activeCanvas.selection = false;
        activeCanvas.defaultCursor = 'grab';
        activeCanvas.hoverCursor = 'grab';
      }
    } else if (tool === 'text') {
      setActiveTool('text');
      if (activeCanvas) {
        activeCanvas.selection = true;
        activeCanvas.defaultCursor = 'text';
        activeCanvas.hoverCursor = 'text';
      }
    } else {
      setActiveTool('select');
      if (activeCanvas) {
        activeCanvas.selection = true;
        activeCanvas.defaultCursor = 'default';
        activeCanvas.hoverCursor = 'move';
        // Ensure all objects are selectable when switching to select tool
        // BUT preserve lock state - locked objects should remain locked
        activeCanvas.getObjects().forEach((obj: any) => {
          if (!obj.data?.isBackground && !obj.data?.isGradientBackground) {
            // Check if object is locked (both X and Y movement locked)
            const isLocked = obj.lockMovementX === true && obj.lockMovementY === true;
            // Only enable evented/selectable if NOT locked
            obj.evented = !isLocked;
            obj.selectable = !isLocked;
          }
        });
        activeCanvas.requestRenderAll();
      }
    }
  }, [activeCanvas]);

  // Pan tool handlers - use refs to avoid re-registering event handlers
  useEffect(() => {
    if (!activeCanvas) return;

    const handleMouseDown = (opt: any) => {
      if (activeTool === 'pan') {
        // When pan tool is active, ignore ALL objects (especially locked ones)
        // Force pan mode regardless of what's under the cursor
        opt.e.preventDefault();
        opt.e.stopPropagation();

        // Disable canvas selection and deselect any object
        activeCanvas.selection = false;
        activeCanvas.discardActiveObject();

        // Force all objects to be non-interactive
        if (opt.target) {
          const target = opt.target as any;
          // If clicking on any object (especially locked), ignore it and pan instead
          if (target && !target.data?.isGuideline) {
            // Don't allow object interaction - force pan mode
            opt.target = null;
          }
        }

        isPanningRef.current = true;
        activeCanvas.defaultCursor = 'grabbing';
        activeCanvas.hoverCursor = 'grabbing';
        lastPanPositionRef.current = { x: opt.e.clientX, y: opt.e.clientY };
      } else if (activeTool === 'text' && !opt.target) {
        // Click to add text when text tool is active and clicking on empty canvas
        const pointer = activeCanvas.getPointer(opt.e);
        const textbox = new Textbox('Click to edit', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#000000',
          editable: true,
          width: 150,
        });
        activeCanvas.add(textbox);
        activeCanvas.setActiveObject(textbox);
        textbox.enterEditing();
        textbox.selectAll();
        activeCanvas.requestRenderAll();
        setActiveTool('select');
        activeCanvas.defaultCursor = 'default';
        activeCanvas.hoverCursor = 'move';
      }
    };

    const handleMouseMove = (opt: any) => {
      if (activeTool === 'pan' && isPanningRef.current && lastPanPositionRef.current) {
        // Prevent any object movement during pan - only pan the viewport
        if (opt.target && !opt.target.data?.isGuideline) {
          // If somehow an object is targeted, ignore it and continue panning
          opt.target = null;
        }

        // Only pan the canvas viewport, never move objects
        const vpt = activeCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += opt.e.clientX - lastPanPositionRef.current.x;
          vpt[5] += opt.e.clientY - lastPanPositionRef.current.y;
          activeCanvas.requestRenderAll();
          lastPanPositionRef.current = { x: opt.e.clientX, y: opt.e.clientY };
        }
      }
    };

    const handleMouseUp = () => {
      if (activeTool === 'pan') {
        isPanningRef.current = false;
        activeCanvas.defaultCursor = 'grab';
        activeCanvas.hoverCursor = 'grab';
        lastPanPositionRef.current = null;
      }
    };

    // When pan tool is active, disable object selection entirely
    if (activeTool === 'pan') {
      activeCanvas.selection = false;
      activeCanvas.discardActiveObject();
      activeCanvas.defaultCursor = 'grab';
      activeCanvas.hoverCursor = 'grab';
      // Disable ALL object interactions when panning - especially locked objects
      activeCanvas.getObjects().forEach((obj: any) => {
        if (!obj.data?.isBackground && !obj.data?.isGradientBackground && !obj.data?.isGuideline) {
          obj.evented = false;
          obj.selectable = false;
          obj.moveCursor = 'grab';
          // Ensure locked objects stay locked and can't be moved
          if (obj.lockMovementX === true && obj.lockMovementY === true) {
            obj.lockMovementX = true;
            obj.lockMovementY = true;
            obj.lockRotation = true;
            obj.lockScalingX = true;
            obj.lockScalingY = true;
          }
        }
      });
      activeCanvas.requestRenderAll();
    } else {
      // Restore object selection when not panning - ALWAYS enable for non-background objects
      activeCanvas.selection = true;
      activeCanvas.defaultCursor = 'default';
      activeCanvas.hoverCursor = 'move';
      activeCanvas.getObjects().forEach((obj: any) => {
        // Skip background and guideline objects
        if (obj.data?.isBackground || obj.data?.isGradientBackground || obj.data?.isGuideline) {
          return;
        }
        // Check if object is locked (both X and Y movement locked)
        const isLocked = obj.lockMovementX === true && obj.lockMovementY === true;
        // Always restore evented and selectable for non-locked objects
        obj.evented = !isLocked;
        obj.selectable = !isLocked;
        obj.moveCursor = isLocked ? 'not-allowed' : 'move';
      });
      activeCanvas.requestRenderAll();
    }

    activeCanvas.on('mouse:down', handleMouseDown);
    activeCanvas.on('mouse:move', handleMouseMove);
    activeCanvas.on('mouse:up', handleMouseUp);

    return () => {
      activeCanvas.off('mouse:down', handleMouseDown);
      activeCanvas.off('mouse:move', handleMouseMove);
      activeCanvas.off('mouse:up', handleMouseUp);
    };
  }, [activeCanvas, activeTool]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!fabricCanvas || !templateName) {
        throw new Error('Please enter a template name');
      }

      // Save current page state first
      saveCurrentPageState();

      // Ensure all objects have explicit lock properties before saving
      // Coerce lock flags to booleans to avoid string/number mismatches
      fabricCanvas.getObjects().forEach((obj: any) => {
        if (!obj.data?.isGuideline) {
          // Ensure lock properties are explicitly set (not undefined) and coerced
          obj.lockMovementX = !!obj.lockMovementX;
          obj.lockMovementY = !!obj.lockMovementY;
          obj.lockRotation = !!obj.lockRotation;
          obj.lockScalingX = !!obj.lockScalingX;
          obj.lockScalingY = !!obj.lockScalingY;
        }
      });

      // Get current canvas state for the current page
      // toObject() includes all properties by default, including lock states
      const currentDesignJson = fabricCanvas.toObject();

      // Build pages with updated current page
      const updatedPages = pages.map((page, index) => ({
        id: page.id,
        name: page.name,
        designJson: index === currentPageIndex ? currentDesignJson : page.designJson,
      }));

      // Store first page as main design_json for backward compatibility
      // and all pages in a pages array within the design_json
      const designJson = {
        ...(updatedPages[0]?.designJson || currentDesignJson),
        __pages: updatedPages,
      };

      // Ensure back canvas objects have explicit lock properties before saving
      // Coerce lock flags to booleans on back side as well
      if (hasBackSide && backFabricCanvas) {
        backFabricCanvas.getObjects().forEach((obj: any) => {
          if (!obj.data?.isGuideline) {
            obj.lockMovementX = !!obj.lockMovementX;
            obj.lockMovementY = !!obj.lockMovementY;
            obj.lockRotation = !!obj.lockRotation;
            obj.lockScalingX = !!obj.lockScalingX;
            obj.lockScalingY = !!obj.lockScalingY;
          }
        });
      }

      const backDesignJson = hasBackSide && backFabricCanvas
        ? backFabricCanvas.toObject()
        : null;

      // Use editTemplate's vendor_id for updates, or current user's vendor_id for new templates
      const vendorId = editTemplate?.vendor_id || vendorData?.id || null;

      // Validate required fields
      if (!projectId && !editTemplate?.id) {
        throw new Error('Project ID is required to create a template');
      }

      const payload: any = {
        template_name: templateName,
        template_type: category,
        template_data: {
          width_mm: widthMm,
          height_mm: heightMm,
          is_public: isPublic,
          has_back_side: hasBackSide,
          design_json: designJson,
          back_design_json: backDesignJson,
        },
        is_active: true,
      };

      // Always include vendor_id (required)
      if (vendorId) {
        payload.vendor_id = vendorId;
      } else {
        throw new Error('Vendor ID is required to save template');
      }

      // Include project_id when creating new template (required for new templates)
      if (!editTemplate?.id && projectId) {
        payload.project_id = projectId;
      }

      if (editTemplate?.id) {
        await apiService.templatesAPI.update(editTemplate.id, payload);
      } else {
        await apiService.templatesAPI.create(payload);
      }
    },
    onSuccess: () => {
      toast.success('Template saved successfully');
      queryClient.invalidateQueries({ queryKey: ['templates-management'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save template');
    },
  });

  // Auto-save removed - users must manually save templates

  // Register context menu on canvas container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('contextmenu', handleContextMenu);
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleContextMenu]);

  const handlePresetChange = (presetName: string) => {
    const preset = PRESET_SIZES.find(p => p.name === presetName);
    if (preset && preset.width > 0) {
      setWidthMm(preset.width);
      setHeightMm(preset.height);
    }
  };

  /**
   * Persists the current page's canvas state to the pages array
   * Called before switching pages to ensure no data loss
   * Serializes the entire canvas as JSON and stores in page data
   * @returns {void}
   */
  // Force reset preview when opening batch panel to ensure templates are clean for record substitution
  useEffect(() => {
    if (activeSidebarTab === 'batch' && isPreviewMode) {
      console.log('[Batch] Resetting preview mode to ensure clean templates for batch processing');
      handleResetPreview();
      setIsPreviewMode(false);
    }
  }, [activeSidebarTab, isPreviewMode, handleResetPreview]);

  /**
   * Page Management Handlers - CRUD for template pages
   */
  const saveCurrentPageState = useCallback(() => {
    if (!fabricCanvas) return;
    setPages(prev => {
      const updated = [...prev];
      updated[currentPageIndex] = {
        ...updated[currentPageIndex],
        designJson: fabricCanvas.toObject(),
      };
      return updated;
    });
  }, [fabricCanvas, currentPageIndex]);

  /**
   * Switches the active page/canvas in the multi-page template
   * Saves current page design state before switching
   * Loads the new page's design from stored JSON
   * Clears editor state (selected object, etc.) on page switch
   * @param {number} index - The page index to switch to (0-based)
   * @returns {void}
   */
  const handlePageSelect = useCallback((index: number) => {
    if (index === currentPageIndex || !fabricCanvas) return;

    // Save current page state
    saveCurrentPageState();

    // Switch to new page
    setCurrentPageIndex(index);

    // Load new page content
    const newPage = pages[index];
    if (newPage.designJson) {
      fabricCanvas.loadFromJSON(newPage.designJson).then(() => {
        // Restore lock state after loading page
        restoreLockState(fabricCanvas);
        updateObjectsList();
      });
    } else {
      // New empty page
      safeClearCanvas(fabricCanvas);
      fabricCanvas.backgroundColor = '#ffffff';
      fabricCanvas.requestRenderAll();
      updateObjectsList();
    }

    setSelectedObject(null);
  }, [currentPageIndex, fabricCanvas, pages, saveCurrentPageState, updateObjectsList]);

  /**
   * Adds a new blank page to the template
   * Saves current page before creating new page
   * New page defaults to white background and "Page N" naming
   * Automatically switches to the new page
   * @returns {void}
   */
  const handleAddPage = useCallback(() => {
    if (!fabricCanvas) return;

    // Save current page state first
    const currentDesignJson = fabricCanvas.toObject();
    const newPageIndex = pages.length; // This will be the index of the new page

    // Create new page
    const newPage: PageData = {
      id: generateUUID(),
      name: `Page ${pages.length + 1}`,
      designJson: null,
    };

    // Update pages: save current page design and add new page
    setPages(prev => {
      const updated = [...prev];
      // Save current page's design
      updated[currentPageIndex] = {
        ...updated[currentPageIndex],
        designJson: currentDesignJson,
      };
      // Add new page
      return [...updated, newPage];
    });

    // Switch to new page index
    setCurrentPageIndex(newPageIndex);

    // Clear canvas for new page
    safeClearCanvas(fabricCanvas);
    fabricCanvas.backgroundColor = '#ffffff';
    fabricCanvas.requestRenderAll();
    updateObjectsList();

    setSelectedObject(null);
    toast.success('New page added');
  }, [fabricCanvas, pages.length, currentPageIndex, updateObjectsList]);

  /**
   * Creates an exact copy of an existing page with all its design elements
   * Appends duplicated page immediately after the source page
   * Names the duplicate with "(Copy)" suffix
   * Automatically switches to the new duplicated page
   * @param {number} index - The page index to duplicate
   * @returns {void}
   */
  const handleDuplicatePage = useCallback((index: number) => {
    // Save current page first
    saveCurrentPageState();

    const sourcePage = pages[index];
    const duplicatedPage: PageData = {
      id: generateUUID(),
      name: `${sourcePage.name} (Copy)`,
      designJson: sourcePage.designJson ? JSON.parse(JSON.stringify(sourcePage.designJson)) : null,
    };

    const newPages = [...pages];
    newPages.splice(index + 1, 0, duplicatedPage);
    setPages(newPages);

    // Switch to duplicated page
    if (fabricCanvas && duplicatedPage.designJson) {
      fabricCanvas.loadFromJSON(duplicatedPage.designJson).then(() => {
        // Restore lock state after loading duplicated page
        restoreLockState(fabricCanvas);
        updateObjectsList();
      });
    }

    setCurrentPageIndex(index + 1);
    toast.success('Page duplicated');
  }, [fabricCanvas, pages, saveCurrentPageState, updateObjectsList]);

  /**
   * Deletes a page from the template
   * Prevents deletion if only one page remains (must have at least one page)
   * Adjusts current page index if deleting current or earlier page
   * Automatically loads appropriate page after deletion
   * @param {number} index - The page index to delete
   * @returns {void}
   */
  const handleDeletePage = useCallback((index: number) => {
    if (pages.length <= 1) {
      toast.error('Cannot delete the only page');
      return;
    }

    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);

    // Adjust current page index if needed
    let newIndex = currentPageIndex;
    if (index <= currentPageIndex) {
      newIndex = Math.max(0, currentPageIndex - 1);
    }

    // Load the new current page
    const newCurrentPage = newPages[newIndex];
    if (fabricCanvas) {
      if (newCurrentPage.designJson) {
        fabricCanvas.loadFromJSON(newCurrentPage.designJson).then(() => {
          // Restore lock state after loading page
          restoreLockState(fabricCanvas);
          updateObjectsList();
        });
      } else {
        safeClearCanvas(fabricCanvas);
        fabricCanvas.backgroundColor = '#ffffff';
        fabricCanvas.requestRenderAll();
        updateObjectsList();
      }
    }

    setCurrentPageIndex(newIndex);
    setSelectedObject(null);
    toast.success('Page deleted');
  }, [currentPageIndex, fabricCanvas, pages, updateObjectsList]);

  /**
   * Renames a page in the template
   * Updates the display name; does not affect design or ID
   * @param {number} index - The page index to rename
   * @param {string} name - The new name for the page
   * @returns {void}
   */
  const handleRenamePage = useCallback((index: number, name: string) => {
    setPages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name };
      return updated;
    });
  }, []);

  /**
   * Handles keyboard shortcuts for common operations
   * Supported shortcuts:
   * - Ctrl+Z / Cmd+Z: Undo
   * - Ctrl+Shift+Z / Cmd+Shift+Z: Redo
   * - Ctrl+Y / Cmd+Y: Redo
   * - Ctrl+C / Cmd+C: Copy selected object
   * - Ctrl+V / Cmd+V: Paste object
   * - Delete/Backspace: Delete selected object
   * - Arrow Keys: Move selected object (+ Shift for 10px)
   * Only active when not typing in input fields
   * @returns {void} (effect cleanup function)
   */
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) handleRedo();
            else handleUndo();
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 's':
            e.preventDefault();
            saveMutation.mutate();
            break;
          case '=':
          case '+':
            e.preventDefault();
            handleZoom('in');
            break;
          case '-':
            e.preventDefault();
            handleZoom('out');
            break;
          case '0':
            e.preventDefault();
            setZoom(1);
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            if (selectedObject) handleDelete();
            break;
          case 'v':
            setActiveTool('select');
            break;
          case 't':
            setActiveTool('text');
            break;
          case 'r':
            setActiveTool('rect');
            break;
          case 'c':
            setActiveTool('circle');
            break;
          case 'l':
            setActiveTool('line');
            break;
          case 'h':
            handleSidebarToolChange('pan');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handlePaste, handleDelete, handleZoom, selectedObject, saveMutation, activeCanvas]);

  // Prevent browser zoom on Ctrl+scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoom('in');
        } else {
          handleZoom('out');
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    // Also prevent at document level when in designer
    const docWheelHandler = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', docWheelHandler, { passive: false });

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      document.removeEventListener('wheel', docWheelHandler);
    };
  }, [handleZoom]);

  // Pinch-to-zoom support for touch devices
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialZoom = zoom;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getDistance(e.touches);
        initialZoom = zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        if (initialDistance > 0) {
          const scale = currentDistance / initialDistance;
          const newZoom = Math.min(Math.max(initialZoom * scale, 0.25), 4);
          setZoom(newZoom);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom, activeCanvas]);

  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden">
      {/* New Header */}
      <DesignerHeader
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        widthMm={widthMm}
        heightMm={heightMm}
        category={category}
        hasBackSide={hasBackSide}
        activeSide={activeSide}
        onActiveSideChange={setActiveSide}
        onBack={onBack || (() => navigate('/dashboard/templates'))}
        onSave={() => saveMutation.mutate()}
        onExport={handleExport}
        onSettings={() => setSettingsOpen(true)}
        isSaving={saveMutation.isPending}
      />

      {/* Page Manager */}
      <DesignerPageManager
        pages={pages}
        currentPageIndex={currentPageIndex}
        onPageSelect={handlePageSelect}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
      />

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Template Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Preset Size</Label>
              <Select onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a preset..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_SIZES.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name} {preset.width > 0 && `(${preset.width}×${preset.height}mm)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Width (mm)</Label>
                <Input type="number" value={widthMm} onChange={(e) => setWidthMm(parseFloat(e.target.value) || 85.6)} />
              </div>
              <div className="space-y-2">
                <Label>Height (mm)</Label>
                <Input type="number" value={heightMm} onChange={(e) => setHeightMm(parseFloat(e.target.value) || 53.98)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ID Card">ID Card</SelectItem>
                  <SelectItem value="Certificate">Certificate</SelectItem>
                  <SelectItem value="Badge">Badge</SelectItem>
                  <SelectItem value="Visiting Card">Visiting Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable Back Side</Label>
              <Switch checked={hasBackSide} onCheckedChange={setHasBackSide} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Make Public</Label>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alignment Toolbar - shows when any object is selected */}
      {selectedObject && (
        <DesignerAlignmentToolbar
          selectedObject={selectedObject}
          canvas={activeCanvas}
          onUpdate={updateObjectsList}
        />
      )}

      {/* Text Toolbar - shows when text object is selected */}
      <DesignerTextToolbar
        selectedObject={selectedObject}
        canvas={activeCanvas}
        onUpdate={updateObjectsList}
        customFonts={customFonts}
        onTextSettingsChange={(settings) => {
          // Update last text settings for new text elements
          lastTextSettingsRef.current = {
            ...lastTextSettingsRef.current,
            ...settings,
          };
        }}
      />

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tool Sidebar */}
        <DesignerToolsSidebar
          activeTab={activeSidebarTab}
          onTabChange={setActiveSidebarTab}
          activeTool={activeTool === 'pan' ? 'pan' : activeTool === 'text' ? 'text' : 'select'}
          onToolChange={handleSidebarToolChange}
        />

        {/* Floating Panels */}
        {activeSidebarTab === 'elements' && (
          <DesignerElementsPanel onAddShape={addShape} onAddText={addText} onAddImage={addImage} onAddPlaceholder={addPlaceholder} onClose={() => setActiveSidebarTab(null)} detectedVariables={detectedVariables} />
        )}
        {activeSidebarTab === 'layout' && (
          <DesignerLayoutPanel widthMm={widthMm} heightMm={heightMm} onWidthChange={setWidthMm} onHeightChange={setHeightMm} marginTop={marginTop} marginLeft={marginLeft} marginRight={marginRight} marginBottom={marginBottom} onMarginTopChange={setMarginTop} onMarginLeftChange={setMarginLeft} onMarginRightChange={setMarginRight} onMarginBottomChange={setMarginBottom} category={category} onCategoryChange={setCategory} snapToGrid={snapToGrid} onSnapToGridChange={setSnapToGrid} gridSize={gridSize} onGridSizeChange={setGridSize} bleedMm={bleedMm} onBleedChange={setBleedMm} safeZoneMm={safeZoneMm} onSafeZoneChange={setSafeZoneMm} onClose={() => setActiveSidebarTab(null)} />
        )}
        {activeSidebarTab === 'background' && (
          <DesignerBackgroundPanel backgroundColor={backgroundColor} onBackgroundColorChange={handleBackgroundColorChange} onBackgroundGradientChange={handleBackgroundGradientChange} onRemoveBackgroundGradient={handleRemoveBackgroundGradient} onBackgroundImageChange={handleBackgroundImageChange} onRemoveBackgroundImage={handleRemoveBackgroundImage} hasBackgroundImage={hasBackgroundImage} onClose={() => setActiveSidebarTab(null)} />
        )}
        {activeSidebarTab === 'images' && (
          <DesignerImagesPanel onAddImage={addImage} onAddPlaceholder={addPlaceholder} onAddCustomShape={handleAddCustomShape} onAddCustomFont={handleAddCustomFont} onUseCustomShape={addCustomShapeToCanvas} onChangePhotoShape={changePhotoPlaceholderShape} onUpdatePhotoBorder={() => { saveToHistory(); updateObjectsList(); }} customShapes={customShapes} libraryShapes={libraryShapes.map((s: any) => ({ name: s.name, url: s.shape_url }))} customFonts={customFonts} selectedObject={selectedObject} canvas={activeCanvas} onClose={() => setActiveSidebarTab(null)} projectId={projectId} onAddProjectPhoto={addProjectPhoto} />
        )}
        {activeSidebarTab === 'data' && (
          <DesignerDataPreviewPanel
            onPreviewData={handlePreviewData}
            onResetPreview={handleResetPreview}
            isPreviewMode={isPreviewMode}
            onTogglePreviewMode={handleTogglePreviewMode}
            onClose={() => setActiveSidebarTab(null)}
            detectedVariables={detectedVariables}
            projectId={projectId}
            projectClient={projectClient}
          />
        )}
        {activeSidebarTab === 'library' && (
          <DesignerLibraryPanel
            vendorId={vendorData?.id || null}
            onAddFont={(name, url) => {
              const loadFont = async () => {
                const fontFace = new FontFace(name, `url(${url})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                setCustomFonts(prev => [...prev, name]);
                toast.success(`Font "${name}" loaded`);
              };
              loadFont().catch(() => toast.error('Failed to load font'));
            }}
            onAddShape={(name, url) => { addCustomShapeToCanvas(url, name); }}
            onAddIcon={(name, url) => { addIconToCanvas(name, url); }}
            onClose={() => setActiveSidebarTab(null)}
          />
        )}
        {activeSidebarTab === 'batch' && (
          <DesignerBatchPDFPanel
            canvas={fabricCanvas}
            backCanvas={backFabricCanvas}
            templateName={templateName}
            hasBackSide={hasBackSide}
            widthMm={widthMm}
            heightMm={heightMm}
            designJson={fabricCanvas?.toObject(['id', 'name', 'maskedPhoto', 'maskConfig', 'variableBinding', 'data'])}
            backDesignJson={hasBackSide ? backFabricCanvas?.toObject(['id', 'name', 'maskedPhoto', 'maskConfig', 'variableBinding', 'data']) : undefined}
            category={category}
            projectId={projectId}
            vendorId={user?.vendor_id}
            onPreviewRecord={(record) => {
              setPreviewData(record);
              setIsPreviewMode(true);
              handlePreviewData(record);
            }}
            onClose={() => setActiveSidebarTab(null)}
          />
        )}

        {/* Canvas Area */}
        <div className="flex-1 min-w-0 flex flex-col bg-muted/30 overflow-hidden">
          {/* Guide Controls */}
          <div className="flex items-center gap-4 px-3 py-1.5 bg-card/80 border-b text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Checkbox
                checked={showGuides}
                onCheckedChange={(checked) => setShowGuides(checked === true)}
                className="h-3.5 w-3.5"
              />
              <span className="text-muted-foreground">Show Guides</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Checkbox
                checked={showTopIndicator}
                onCheckedChange={(checked) => setShowTopIndicator(checked === true)}
                className="h-3.5 w-3.5"
              />
              <span className="text-muted-foreground">Show "TOP" Indicator</span>
            </label>
          </div>

          {/* Horizontal Ruler */}
          <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b">
            <div className="flex">
              <div className="w-6 h-6 bg-muted border-r" />
              <CanvasRuler orientation="horizontal" length={widthMm} zoom={zoom} />
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Vertical Ruler */}
            <div className="flex-shrink-0 sticky left-0 z-10 bg-background border-r">
              <CanvasRuler orientation="vertical" length={heightMm} zoom={zoom} />
            </div>

            {/* Canvas Container with Scrollbars */}
            <div className="flex-1 overflow-auto">
              <div
                ref={containerRef}
                className="flex items-center justify-center p-12"
                style={{
                  minWidth: `calc(${widthMm * mmToPixels}px * ${zoom} + 150px)`,
                  minHeight: `calc(${heightMm * mmToPixels}px * ${zoom} + 150px)`,
                  backgroundImage: showGrid ? `radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)` : 'none',
                  backgroundSize: `${gridSize}px ${gridSize}px`,
                  backgroundAttachment: 'local',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    if (data.type === 'variable-field' && !data.isPhoto) {
                      addText(data.placeholder, true);
                    }
                  } catch (err) {
                    // Not our drag data, ignore
                  }
                }}
              >
                {/* Canvas wrapper with overlays */}
                <div className="relative" style={{ padding: showGuides ? `${bleedMm * mmToPixels * zoom + 25}px` : '0' }}>
                  {/* Canvas Overlays */}
                  {showGuides && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: bleedMm * mmToPixels * zoom + 25,
                        left: bleedMm * mmToPixels * zoom + 25,
                        width: widthMm * mmToPixels * zoom,
                        height: heightMm * mmToPixels * zoom,
                      }}
                    >
                      <CanvasOverlays
                        widthPx={widthMm * mmToPixels}
                        heightPx={heightMm * mmToPixels}
                        widthMm={widthMm}
                        heightMm={heightMm}
                        bleedMm={bleedMm}
                        safeZoneMm={safeZoneMm}
                        marginTopMm={marginTop}
                        mmToPixels={mmToPixels}
                        zoom={zoom}
                        marginBottomMm={marginBottom}
                        marginLeftMm={marginLeft}
                        marginRightMm={marginRight}
                        showBleed={true}
                        showSafeZone={true}
                        showLabels={true}
                        showTopIndicator={showTopIndicator}
                      />
                    </div>
                  )}

                  {/* Main canvas container - size is now controlled by FabricCanvasComponent */}
                  <div
                    className="relative shadow-lg"
                  >
                    {activeSide === 'front' ? (
                      <FabricCanvasComponent
                        onReady={handleFrontCanvasReady}
                        width={widthMm * mmToPixels * zoom}
                        height={heightMm * mmToPixels * zoom}
                      />
                    ) : (
                      <FabricCanvasComponent
                        onReady={handleBackCanvasReady}
                        width={widthMm * mmToPixels * zoom}
                        height={heightMm * mmToPixels * zoom}
                      />
                    )}
                    <CanvasOverlays
                      widthPx={widthMm * mmToPixels}
                      heightPx={heightMm * mmToPixels}
                      widthMm={widthMm}
                      heightMm={heightMm}
                      bleedMm={bleedMm}
                      safeZoneMm={safeZoneMm}
                      marginTopMm={marginTop}
                      mmToPixels={mmToPixels}
                      zoom={zoom}
                      marginBottomMm={marginBottom}
                      marginLeftMm={marginLeft}
                      marginRightMm={marginRight}
                      showBleed={showGuides}
                      showSafeZone={showGuides}
                      showLabels={showGuides}
                      showTopIndicator={showTopIndicator}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Canvas Toolbar */}
          <DesignerCanvasToolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            historyStep={historyIndex}
            historyTotal={history.length}
            zoom={zoom}
            onZoomIn={() => handleZoom('in')}
            onZoomOut={() => handleZoom('out')}
            onZoomReset={() => setZoom(1)}
            onZoomChange={setZoom}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
            isPreviewMode={isPreviewMode}
            onTogglePreviewMode={() => { setIsPreviewMode(!isPreviewMode); if (!isPreviewMode) { setActiveSidebarTab('data'); } }}
            currentPage={currentPageIndex + 1}
            totalPages={pages.length}
            onPrevPage={() => currentPageIndex > 0 && handlePageSelect(currentPageIndex - 1)}
            onNextPage={() => currentPageIndex < pages.length - 1 && handlePageSelect(currentPageIndex + 1)}
            onSave={() => saveMutation.mutate()}
            onCopy={handleDuplicate}
            onDelete={handleDelete}
          />
        </div>

        {/* Right Panel - Properties, Layers, Templates, Gallery, FAQ, Help */}
        <div className="hidden md:flex flex-shrink-0 h-full sticky top-0 overflow-hidden">
          <DesignerRightPanel
            selectedObject={selectedObject}
            canvas={activeCanvas}
            objects={objects}
            onUpdate={() => {
              updateObjectsList();
              if (selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'i-text')) {
                lastTextSettingsRef.current = {
                  fontSize: selectedObject.fontSize || 14,
                  fontFamily: selectedObject.fontFamily || 'Arial',
                  fill: typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000',
                  textCase: selectedObject.data?.textCase || 'none',
                  autoFontSize: selectedObject.data?.autoFontSize || false,
                  wordWrap: selectedObject.splitByGrapheme !== false,
                };
              }
            }}
            onSelectObject={(obj) => {
              if (activeCanvas) {
                activeCanvas.setActiveObject(obj);
                activeCanvas.requestRenderAll();
              }
              setSelectedObject(obj);
            }}
            onDeleteObject={(obj) => {
              if (activeCanvas) {
                activeCanvas.remove(obj);
                activeCanvas.requestRenderAll();
              }
            }}
            onToggleVisibility={toggleVisibility}
            onToggleLock={toggleLock}
            onReorderObject={(obj, direction) => {
              if (direction === 'up') {
                bringForward(obj);
              } else {
                sendBackward(obj);
              }
            }}
            customFonts={customFonts}
            safeZoneMm={safeZoneMm}
            mmToPixels={mmToPixels}
            onApplyMask={handleApplyMask}
            projectId={projectId}
          />
        </div>

        {/* Mobile Right Panel */}
        <div className="md:hidden">
          <DesignerRightPanel
            selectedObject={selectedObject}
            canvas={activeCanvas}
            objects={objects}
            onUpdate={() => {
              updateObjectsList();
              if (selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'i-text')) {
                lastTextSettingsRef.current = {
                  fontSize: selectedObject.fontSize || 14,
                  fontFamily: selectedObject.fontFamily || 'Arial',
                  fill: typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000',
                  textCase: selectedObject.data?.textCase || 'none',
                  autoFontSize: selectedObject.data?.autoFontSize || false,
                  wordWrap: selectedObject.splitByGrapheme !== false,
                };
              }
            }}
            onSelectObject={(obj) => {
              if (activeCanvas) {
                activeCanvas.setActiveObject(obj);
                activeCanvas.requestRenderAll();
              }
              setSelectedObject(obj);
            }}
            onDeleteObject={(obj) => {
              if (activeCanvas) {
                activeCanvas.remove(obj);
                activeCanvas.requestRenderAll();
              }
            }}
            onToggleVisibility={toggleVisibility}
            onToggleLock={toggleLock}
            onReorderObject={(obj, direction) => {
              if (direction === 'up') {
                bringForward(obj);
              } else {
                sendBackward(obj);
              }
            }}
            customFonts={customFonts}
            safeZoneMm={safeZoneMm}
            mmToPixels={mmToPixels}
            onApplyMask={handleApplyMask}
            projectId={projectId}
          />
        </div>
      </div>

      {/* Context Menu */}
      <DesignerContextMenu x={contextMenu.x} y={contextMenu.y} visible={contextMenu.visible} selectedObject={selectedObject} onClose={closeContextMenu} onCopy={handleCopy} onPaste={handlePaste} onDuplicate={handleDuplicate} onDelete={handleDelete} onLock={() => selectedObject && toggleLock(selectedObject)} onToggleVisibility={() => selectedObject && toggleVisibility(selectedObject)} onBringForward={() => bringForward()} onSendBackward={() => sendBackward()} onBringToFront={bringToFront} onSendToBack={sendToBack} onFlipH={flipHorizontal} onFlipV={flipVertical} onAlignLeft={alignLeft} onAlignCenter={alignCenter} onAlignRight={alignRight} onAlignTop={alignTop} onAlignMiddle={alignMiddle} onAlignBottom={alignBottom} hasClipboard={!!clipboard} />
    </div>
  );
}

// Helper functions for creating polygon points
function createPolygonPoints(sides: number, radius: number) {
  const points = [];
  const angle = (2 * Math.PI) / sides;
  for (let i = 0; i < sides; i++) {
    points.push({
      x: radius + radius * Math.sin(i * angle),
      y: radius - radius * Math.cos(i * angle),
    });
  }
  return points;
}

function createStarPoints(points: number, outerRadius: number, innerRadius: number) {
  const starPoints = [];
  const angle = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    starPoints.push({
      x: outerRadius + r * Math.sin(i * angle),
      y: outerRadius - r * Math.cos(i * angle),
    });
  }
  return starPoints;
}

function createHeartPoints(size: number) {
  const points = [];
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const x = size * (16 * Math.pow(Math.sin(t), 3)) / 16;
    const y = -size * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
    points.push({ x: x + size, y: y + size });
  }
  return points;
}
