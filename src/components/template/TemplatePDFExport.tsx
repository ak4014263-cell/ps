import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Loader2, CheckCircle2, Settings, Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TemplatePDFExportProps {
  templateId: string;
  templateName: string;
  templateData: any;
  designJson: any;
  backDesignJson?: any;
  widthMm: number;
  heightMm: number;
  hasBackSide: boolean;
  vendorId?: string;
  marginTop?: number;
  marginLeft?: number;
  marginRight?: number;
  marginBottom?: number;
}

export function TemplatePDFExport({
  templateId,
  templateName,
  templateData,
  designJson,
  backDesignJson,
  widthMm,
  heightMm,
  hasBackSide,
  vendorId,
  marginTop,
  marginLeft,
  marginRight,
  marginBottom,
}: TemplatePDFExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'specifications' | 'design-preview' | 'technical-sheet'>('specifications');
  
  const [pdfOptions, setPdfOptions] = useState({
    includeBackSide: hasBackSide,
    includeSpecifications: true,
    includeDimensions: true,
    includeDesignPreview: true,
    includeTechnicalNotes: true,
    quality: 'high' as 'low' | 'medium' | 'high',
    pageSize: 'A4' as 'A4' | 'Letter',
  });

  const generateSpecificationsPDF = async () => {
    setIsExporting(true);
    try {
      const orientation = widthMm > heightMm ? 'landscape' : 'portrait';
      const pageSize = pdfOptions.pageSize === 'A4' ? 'a4' : 'letter';
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageSize,
      });

      let yPosition = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      // Header
      pdf.setFontSize(24);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Template: ${templateName}`, margin, yPosition);
      yPosition += 15;

      // Divider
      pdf.setDrawColor(66, 133, 244);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Template ID and Metadata
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Template ID: ${templateId}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 10;

      // Specifications Section
      if (pdfOptions.includeSpecifications) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Specifications', margin, yPosition);
        yPosition += 8;

        // Create specs table
        const specs = [
          ['Property', 'Value'],
          ['Width', `${widthMm} mm`],
          ['Height', `${heightMm} mm`],
          ['Aspect Ratio', `${(widthMm / heightMm).toFixed(2)}:1`],
          ['Format', widthMm > heightMm ? 'Landscape' : 'Portrait'],
          ['Back Side', hasBackSide ? 'Yes' : 'No'],
          ['Category', templateData?.category || 'N/A'],
          ['Color Space', 'RGB / CMYK compatible'],
          ['Bleed Area', '3mm recommended'],
          ['Margin Top', `${marginTop ?? templateData?.margin_top ?? 1} mm`],
          ['Margin Left', `${marginLeft ?? templateData?.margin_left ?? 1} mm`],
          ['Margin Right', `${marginRight ?? templateData?.margin_right ?? 1} mm`],
          ['Margin Bottom', `${marginBottom ?? templateData?.margin_bottom ?? 1} mm`],
        ];

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');

        let specY = yPosition;
        for (let i = 0; i < specs.length; i++) {
          const isHeader = i === 0;
          if (isHeader) {
            pdf.setFont(undefined, 'bold');
            pdf.setFillColor(240, 240, 240);
            pdf.rect(margin, specY - 5, contentWidth, 8, 'F');
          }

          pdf.text(specs[i][0], margin + 5, specY);
          pdf.text(specs[i][1], margin + 80, specY);
          specY += 8;
        }
        yPosition = specY + 10;
      }

      // Dimensions Section
      if (pdfOptions.includeDimensions) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Detailed Dimensions', margin, yPosition);
        yPosition += 8;

        const dimensions = [
          `Trim Size: ${widthMm} × ${heightMm} mm`,
          `With Bleed: ${widthMm + 6} × ${heightMm + 6} mm (3mm on each side)`,
          `Resolution: 300 DPI (minimum for print)`,
          `File Format: PDF/PNG/JPG`,
          `Color Profile: RGB (for digital) / CMYK (for print)`,
        ];

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        dimensions.forEach((dim) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`• ${dim}`, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }

      // Technical Notes Section
      if (pdfOptions.includeTechnicalNotes) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Technical Notes', margin, yPosition);
        yPosition += 8;

        const notes = [
          'Print Preparation: Ensure all text has at least 3mm margin from the edge.',
          'Color Accuracy: Use color profiles for accurate print results.',
          'Font Embedding: All fonts should be embedded in the PDF.',
          'Image Resolution: Minimum 300 DPI for all images.',
          'Bleeds: Include 3mm bleed area for cutting tolerance.',
        ];

        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        notes.forEach((note, idx) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          const lines = pdf.splitTextToSize(note, contentWidth - 10);
          pdf.text(lines, margin + 5, yPosition);
          yPosition += lines.length * 5 + 3;
        });
      }

      // Footer on each page
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`${templateName} - Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save(`${templateName}-specifications.pdf`);
      toast.success('Specifications PDF generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const generateDesignPreviewPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: widthMm > heightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: pdfOptions.pageSize === 'A4' ? 'a4' : 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate scaling
      const padding = 20;
      const maxWidth = pageWidth - padding * 2;
      const maxHeight = pageHeight - padding * 2;
      const scale = Math.min(maxWidth / widthMm, maxHeight / heightMm);

      // Add title
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Design Preview: ${templateName}`, padding, 15);

      // Draw template design representation
      const drawX = (pageWidth - widthMm * scale) / 2;
      const drawY = 30;

      // Draw card outline
      pdf.setDrawColor(66, 133, 244);
      pdf.setLineWidth(0.5);
      pdf.rect(drawX, drawY, widthMm * scale, heightMm * scale);

      // Add design info
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100, 100, 100);
      const infoY = drawY + heightMm * scale + 10;
      pdf.text(`Front Design • ${widthMm}mm × ${heightMm}mm`, padding, infoY);

      // Add back side if available
      if (hasBackSide && pdfOptions.includeBackSide) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Design Preview: ${templateName} (Back)`, padding, 15);

        const drawY2 = 30;
        pdf.setDrawColor(66, 133, 244);
        pdf.setLineWidth(0.5);
        pdf.rect(drawX, drawY2, widthMm * scale, heightMm * scale);

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(100, 100, 100);
        const infoY2 = drawY2 + heightMm * scale + 10;
        pdf.text(`Back Design • ${widthMm}mm × ${heightMm}mm`, padding, infoY2);
      }

      pdf.save(`${templateName}-design-preview.pdf`);
      toast.success('Design preview PDF generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate design preview PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const generateTechnicalSheetPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      let yPos = 20;

      // Header with brand styling
      pdf.setFillColor(66, 133, 244);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('TECHNICAL SPECIFICATION SHEET', margin, 15);

      // Reset to normal colors
      pdf.setTextColor(0, 0, 0);
      yPos = 35;

      // Template Name and Info
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(templateName, margin, yPos);
      yPos += 10;

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`ID: ${templateId}`, margin, yPos);
      yPos += 5;
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
      yPos += 8;

      // Quick Specs Box
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPos - 2, pageWidth - margin * 2, 40, 'FD');

      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.text('QUICK SPECIFICATIONS', margin + 5, yPos + 3);

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      pdf.text(`Dimensions: ${widthMm}mm × ${heightMm}mm`, margin + 5, yPos + 10);
      pdf.text(`Bleed: 3mm | Resolution: 300 DPI | Back Side: ${hasBackSide ? 'Yes' : 'No'}`, margin + 5, yPos + 16);
      pdf.text(`Format: ${widthMm > heightMm ? 'Landscape' : 'Portrait'} | Color: RGB/CMYK`, margin + 5, yPos + 22);
      pdf.text(`Category: ${templateData?.category || 'General'} | Margins: T:${marginTop ?? templateData?.margin_top ?? 1}mm L:${marginLeft ?? templateData?.margin_left ?? 1}mm R:${marginRight ?? templateData?.margin_right ?? 1}mm B:${marginBottom ?? templateData?.margin_bottom ?? 1}mm`, margin + 5, yPos + 28);

      yPos += 50;

      // Design Elements Section
      if (designJson?.objects && designJson.objects.length > 0) {
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(11);
        pdf.text('DESIGN ELEMENTS', margin, yPos);
        yPos += 8;

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);

        const elementTypes = new Map<string, number>();
        designJson.objects.forEach((obj: any) => {
          const type = obj.type || 'unknown';
          elementTypes.set(type, (elementTypes.get(type) || 0) + 1);
        });

        let elemIdx = 0;
        elementTypes.forEach((count, type) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`• ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count} item${count > 1 ? 's' : ''}`, margin + 5, yPos);
          yPos += 6;
          elemIdx++;
        });

        yPos += 5;
      }

      // Print Requirements
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('PRINT REQUIREMENTS', margin, yPos);
      yPos += 8;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      const requirements = [
        'Minimum resolution: 300 DPI',
        'Color profile: RGB for digital / CMYK for print',
        'All fonts must be embedded',
        'Include 3mm bleed area on all sides',
        'Use safe margins of at least 3mm from card edges',
        'Test print before mass production',
      ];

      requirements.forEach((req) => {
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.text(`✓ ${req}`, margin + 5, yPos);
        yPos += 6;
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.text(`Technical Sheet - ${templateName} | Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save(`${templateName}-technical-sheet.pdf`);
      toast.success('Technical sheet PDF generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate technical sheet PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    switch (exportFormat) {
      case 'specifications':
        await generateSpecificationsPDF();
        break;
      case 'design-preview':
        await generateDesignPreviewPDF();
        break;
      case 'technical-sheet':
        await generateTechnicalSheetPDF();
        break;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Template as PDF
            </DialogTitle>
            <DialogDescription>
              Choose what to include in your template PDF
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Export Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Format</Label>
              <Tabs value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="specifications" className="text-xs">
                    <FileText className="h-4 w-4 mr-1" />
                    Specs
                  </TabsTrigger>
                  <TabsTrigger value="design-preview" className="text-xs">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="technical-sheet" className="text-xs">
                    <Settings className="h-4 w-4 mr-1" />
                    Technical
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Options based on export format */}
            {exportFormat === 'specifications' && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <Label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch
                    checked={pdfOptions.includeSpecifications}
                    onCheckedChange={(checked) =>
                      setPdfOptions({ ...pdfOptions, includeSpecifications: checked })
                    }
                  />
                  <span>Include Specifications</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch
                    checked={pdfOptions.includeDimensions}
                    onCheckedChange={(checked) =>
                      setPdfOptions({ ...pdfOptions, includeDimensions: checked })
                    }
                  />
                  <span>Include Dimensions</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch
                    checked={pdfOptions.includeTechnicalNotes}
                    onCheckedChange={(checked) =>
                      setPdfOptions({ ...pdfOptions, includeTechnicalNotes: checked })
                    }
                  />
                  <span>Include Technical Notes</span>
                </Label>
              </div>
            )}

            {exportFormat === 'design-preview' && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                {hasBackSide && (
                  <Label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Switch
                      checked={pdfOptions.includeBackSide}
                      onCheckedChange={(checked) =>
                        setPdfOptions({ ...pdfOptions, includeBackSide: checked })
                      }
                    />
                    <span>Include Back Side</span>
                  </Label>
                )}
                <p className="text-xs text-muted-foreground">
                  Shows visual preview of template design
                </p>
              </div>
            )}

            {exportFormat === 'technical-sheet' && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Professional technical specification sheet with print requirements
                </p>
              </div>
            )}

            {/* Page Size Selection */}
            <div className="space-y-2">
              <Label className="text-sm">Page Size</Label>
              <Select value={pdfOptions.pageSize} onValueChange={(value: any) => setPdfOptions({ ...pdfOptions, pageSize: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210×297mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5×11in)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quality Selection */}
            <div className="space-y-2">
              <Label className="text-sm">Quality</Label>
              <Select value={pdfOptions.quality} onValueChange={(value: any) => setPdfOptions({ ...pdfOptions, quality: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Smaller file)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="high">High (Best quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="flex-1 gap-2">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
