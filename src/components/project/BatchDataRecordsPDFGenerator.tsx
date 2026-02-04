import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Canvas as FabricCanvas, Image as FabricImage, Rect as FabricRect } from 'fabric';
import { apiService } from '@/lib/api';

interface Group {
  id: string;
  name: string;
  template_id: string | null;
  record_count?: number;
}

interface Template {
  id: string;
  name: string;
  category: string;
  design_json?: any;
  width_mm: number;
  height_mm: number;
}

interface BatchDataRecordsPDFGeneratorProps {
  projectId: string;
  projectName: string;
  vendorId: string;
  groups: Group[];
  templates: Template[];
}

export function BatchDataRecordsPDFGenerator({
  projectId,
  projectName,
  vendorId,
  groups,
  templates,
}: BatchDataRecordsPDFGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('__all__');
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardsPerRow, setCardsPerRow] = useState<number>(2); // 2 cards per row
  const [cardsPerCol, setCardsPerCol] = useState<number>(4); // 4 rows = 8 cards per page
  const [printDPI, setPrintDPI] = useState<number>(300);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: records = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['batch-records', projectId, selectedGroupId],
    queryFn: async () => {
      try {
        console.log(`[BatchPDF] Fetching records for project ${projectId}, group: ${selectedGroupId}`);
        
        const RECORDS_PER_PAGE = 200;
        const allRecords = [];
        let offset = 0;
        let hasMore = true;

        // Fetch records in paginated chunks
        while (hasMore) {
          const response = await Promise.race([
            apiService.dataRecordsAPI.getByProject(projectId, {
              ...(selectedGroupId !== '__all__' && { group_id: selectedGroupId }),
              order_by: 'record_number',
              order: 'asc',
              limit: RECORDS_PER_PAGE,
              offset: offset
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout - took too long')), 90000)
            )
          ]);

          console.log(`[BatchPDF] API Response (offset ${offset}):`, response);
          
          const recordsData = response?.data || [];
          console.log(`[BatchPDF] Records count (batch): ${recordsData.length}`);
          
          if (!Array.isArray(recordsData)) {
            console.warn('[BatchPDF] API did not return array in .data field');
            break;
          }
          
          if (recordsData.length === 0) {
            hasMore = false;
            break;
          }
          
          allRecords.push(...recordsData);
          offset += RECORDS_PER_PAGE;
          
          if (recordsData.length < RECORDS_PER_PAGE) {
            hasMore = false;
          }
        }

        console.log(`[BatchPDF] Total records loaded: ${allRecords.length}`);
        
        return allRecords.map((record: any) => ({
          ...record,
          data_json: typeof record.data_json === 'string' 
            ? JSON.parse(record.data_json) 
            : record.data_json
        }));
      } catch (error) {
        console.error('[BatchPDF] Error fetching records:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to load records: ${errorMsg}`);
        throw error;
      }
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Convert mm to pixels based on DPI
  const mmToPxForDPI = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);

  // 🔥 Auto-fit text: shrinks font size if text overflows the textbox
  const autoFitText = (textbox: any) => {
    if (!textbox || (textbox.type !== 'text' && textbox.type !== 'textbox')) return;

    const maxFontSize = textbox.fontSize || 18;
    const minFontSize = textbox.minFontSize || 8;

    let fontSize = maxFontSize;
    textbox.set({ fontSize });

    // Iteratively reduce font size until text fits
    while (fontSize > minFontSize) {
      // Check if text height exceeds box or width overflows
      const textHeight = textbox.calcTextHeight();
      const textWidth = textbox.calcTextWidth();
      
      if (textHeight <= textbox.height && textWidth <= textbox.width) {
        break; // Text fits!
      }

      fontSize -= 1;
      textbox.set({ fontSize });
    }
  };

  // Single-canvas approach: load template once, then apply each record and export pages
  const loadTemplateOnFabric = async (template: Template, dpi: number = 300, p0: boolean, p1: number) => {
    const width = mmToPxForDPI(template.width_mm, dpi);
    const height = mmToPxForDPI(template.height_mm, dpi);

    const tempCanvasEl = document.createElement('canvas');
    tempCanvasEl.id = `fabric-canvas-${Date.now()}-${Math.random()}`;
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

    if (template.design_json) {
      // Load JSON once
      await new Promise<void>((resolve) => {
        fabricCanvas.loadFromJSON(
          { ...template.design_json, width: width, height: height },
          () => {
            // Lock objects (performance)
            fabricCanvas.getObjects().forEach((o: any) => {
              o.selectable = false;
              o.evented = false;
            });
            fabricCanvas.renderAll();
            resolve();
          }
        );
      });
    }

    return { fabricCanvas, tempCanvasEl, width, height };
  };

  const applyRecordToFabric = async (fabricCanvas: any, record: any) => {
    console.log('[applyRecordToFabric] Processing Record:', record); // Full record data
    const objects = fabricCanvas.getObjects();
    const imageLoads: Promise<void>[] = [];

    for (const obj of objects.slice()) {
      if (!obj || !obj.type || !obj.id) continue;

      console.log(`[applyRecordToFabric] Checking template object with ID: "${obj.id}" of type "${obj.type}"`);

      // Text replacement
      if ((obj.type === 'text' || obj.type === 'textbox')) {
        const fieldName = obj.id;
        const value = record[fieldName] ?? record.data_json?.[fieldName] ?? '';
        
        console.log(`  - Text field found. Trying to get value for "${fieldName}". Found value: "${value}"`);
        
        if (typeof value === 'string' && obj.text !== value) {
          obj.set('text', value);
          autoFitText(obj);
        }
      } 
      // Image replacement
      else if (obj.type === 'image') {
        const fieldName = obj.id;
        const url = record[fieldName] || record.data_json?.[fieldName] || record.photoUrl || record.photo || null;

        console.log(`  - Image field found. Trying to get URL for "${fieldName}". Found URL: "${url}"`);

        if (url) {
          imageLoads.push(new Promise<void>((resolve) => {
            const originalImage = obj;
            const preserveClipPath = originalImage.clipPath;

            FabricImage.fromURL(url, { crossOrigin: 'anonymous' }, (img: any) => {
              try {
                img.set({
                  left: originalImage.left,
                  top: originalImage.top,
                  scaleX: originalImage.scaleX,
                  scaleY: originalImage.scaleY,
                  angle: originalImage.angle,
                  originX: originalImage.originX,
                  originY: originalImage.originY,
                  selectable: false,
                  evented: false,
                  id: originalImage.id,
                  clipPath: preserveClipPath,
                });
                fabricCanvas.remove(originalImage);
                fabricCanvas.add(img);
                resolve();
              } catch (e) {
                console.warn('Failed to replace image for', fieldName, e);
                resolve();
              }
            });
          }));
        }
      }
    }

    if (imageLoads.length > 0) await Promise.all(imageLoads);
    fabricCanvas.renderAll();
  };

  const generateBatchPDF = async () => {
    if (!selectedTemplateId || !selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (records.length === 0) {
      toast.error('No records found');
      return;
    }

    setIsGenerating(true);
    let pdf: jsPDF;
    let cardCanvas: any, cardCanvasEl: any;

    try {
      const template = selectedTemplate;

      // Load card template at DPI
      const cardData = await loadTemplateOnFabric(template, printDPI, false, 0);
      cardCanvas = cardData.fabricCanvas;
      cardCanvasEl = cardData.tempCanvasEl;

      const cardWidth = cardData.width;
      const cardHeight = cardData.height;

      // A4 page dimensions in pixels (portrait)
      const PAGE_WIDTH = 595;
      const PAGE_HEIGHT = 841;
      const GAP_MM = 10;
      const GAP = mmToPxForDPI(GAP_MM, printDPI);

      // Calculate scaling to fit cards on page
      const cardsPerRowCount = cardsPerRow;
      const cardsPerColCount = cardsPerCol;
      
      const scale = Math.min(
        (PAGE_WIDTH - GAP * (cardsPerRowCount + 1)) / (cardsPerRowCount * cardWidth),
        (PAGE_HEIGHT - GAP * (cardsPerColCount + 1)) / (cardsPerColCount * cardHeight)
      );

      const scaledCardWidth = cardWidth * scale;
      const scaledCardHeight = cardHeight * scale;
      const cardsPerPage = cardsPerRowCount * cardsPerColCount;

      // Create PDF in A4 format
      pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });

      let cardIndex = 0;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        // Apply record to card
        await applyRecordToFabric(cardCanvas, record);

        // 🔥 KEY: Force a re-render and wait briefly for the canvas to update
        cardCanvas.requestRenderAll();
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay

        // Render card as image
        const cardImg = cardCanvas.toDataURL({ format: 'png', multiplier: 2 });

        // Calculate position in grid
        const positionInPage = cardIndex % cardsPerPage;
        const col = positionInPage % cardsPerRowCount;
        const row = Math.floor(positionInPage / cardsPerRowCount);

        const x = GAP + col * (scaledCardWidth + GAP);
        const y = GAP + row * (scaledCardHeight + GAP);

        // Add to PDF
        pdf.addImage(cardImg, 'PNG', x, y, scaledCardWidth, scaledCardHeight);

        cardIndex++;

        // Add new page after filling current page
        if (cardIndex % cardsPerPage === 0 && i < records.length - 1) {
          pdf.addPage();
        }
      }

      // Cleanup DOM canvas
      try {
        if (cardCanvasEl && cardCanvasEl.parentNode === document.body) document.body.removeChild(cardCanvasEl);
      } catch (e) {
        console.warn('Failed to cleanup temp canvas elements', e);
      }

      const filename = `${projectName}_${template.name}_cards_${new Date().getTime()}.pdf`;
      pdf.save(filename);
      const totalPages = Math.ceil(records.length / cardsPerPage);
      toast.success(`PDF generated: ${records.length} cards on ${totalPages} pages!`);
    } catch (error) {
      console.error('PDF generation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to generate PDF: ' + errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedTemplateId('');
      setSelectedGroupId('__all__');
      setPrintDPI(300);
      setCardsPerRow(2);
      setCardsPerCol(4);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
          <FileText className="h-4 w-4" />
          Generate Data PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Data Records PDF
          </DialogTitle>
          <DialogDescription>
            Generate PDF with all data records rendered with selected template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Template (Front)</Label>
            {templates.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground border rounded bg-muted/50">
                No templates available
              </div>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.width_mm}×{template.height_mm}mm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Cards Per Row */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cards Per Row</Label>
            <Select value={cardsPerRow.toString()} onValueChange={(val) => setCardsPerRow(parseInt(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Card</SelectItem>
                <SelectItem value="2">2 Cards</SelectItem>
                <SelectItem value="3">3 Cards</SelectItem>
                <SelectItem value="4">4 Cards</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards Per Column */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cards Per Column</Label>
            <Select value={cardsPerCol.toString()} onValueChange={(val) => setCardsPerCol(parseInt(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Row</SelectItem>
                <SelectItem value="2">2 Rows</SelectItem>
                <SelectItem value="3">3 Rows</SelectItem>
                <SelectItem value="4">4 Rows</SelectItem>
                <SelectItem value="5">5 Rows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Print DPI Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Print DPI</Label>
            <Select value={printDPI.toString()} onValueChange={(val) => setPrintDPI(parseInt(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="96">96 DPI (Screen Quality)</SelectItem>
                <SelectItem value="150">150 DPI (Standard)</SelectItem>
                <SelectItem value="300">300 DPI (Print Quality)</SelectItem>
                <SelectItem value="600">600 DPI (High Quality)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Higher DPI = larger file, better print quality</p>
          </div>

          {/* Group Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Records</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose records" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Records ({records.length})</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.record_count || 0} records)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {isLoading && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-800" />
                  <p className="text-xs text-yellow-800">Loading records...</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => refetch()}
                  className="text-xs"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
          
          {queryError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
              <p className="font-medium text-red-900">Error loading records</p>
              <p className="text-xs text-red-800 mt-1">
                {queryError instanceof Error ? queryError.message : 'Unknown error'}
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => refetch()}
                className="text-xs mt-2"
              >
                Try Again
              </Button>
            </div>
          )}
          
          {!isLoading && records.length === 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
              <p className="font-medium text-red-900">No records found</p>
              <p className="text-xs text-red-800 mt-1">
                {selectedGroupId === '__all__' 
                  ? 'This project has no data records'
                  : 'This group has no data records'}
              </p>
            </div>
          )}
          
          {selectedTemplate && records.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="font-medium text-blue-900">PDF Summary</p>
              <p className="text-xs text-blue-800 mt-1">
                Template: {selectedTemplate.name} ({selectedTemplate.width_mm}×{selectedTemplate.height_mm}mm)
              </p>
              <p className="text-xs text-blue-800">
                Records: {records.length} | Grid: {cardsPerRow}×{cardsPerCol} | DPI: {printDPI}
              </p>
              <p className="text-xs text-blue-800">
                Estimated pages: {Math.ceil(records.length / (cardsPerRow * cardsPerCol))}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={generateBatchPDF} 
            disabled={isGenerating || isLoading || !selectedTemplateId || records.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : records.length === 0 ? (
              <>
                <Download className="h-4 w-4" />
                No Records to Generate
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate PDF ({Math.ceil(records.length / (cardsPerRow * cardsPerCol))} pages)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
