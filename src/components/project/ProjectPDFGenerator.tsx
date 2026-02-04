import { useState } from 'react';
import { apiService } from '@/lib/api';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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
  back_design_json?: any;
  has_back_side?: boolean;
  width_mm?: number;
  height_mm?: number;
}

interface ProjectPDFGeneratorProps {
  projectId: string;
  projectName: string;
  vendorId: string;
  groups: Group[];
  templates: Template[];
}

export function ProjectPDFGenerator({
  projectId,
  projectName,
  vendorId,
  groups,
  templates,
}: ProjectPDFGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'specifications' | 'data-summary'>('data-summary');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('__all__');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    includeGroupInfo: true,
    includeRecordCount: true,
    includeTemplateDetails: true,
    pageSize: 'A4' as 'A4' | 'Letter',
  });

  // Simulate records count based on groups
  const records = groups.reduce((total, g) => total + (g.record_count || 0), 0);

  // Debug logging
  console.log('ProjectPDFGenerator - templates received:', {
    count: templates?.length || 0,
    templates: templates?.map(t => ({ id: t.id, name: t.name })) || [],
    projectId,
    vendorId,
    groupsCount: groups?.length || 0
  });

  const generateDataSummaryPDF = async () => {
    setIsGenerating(true);
    try {
      const pageSize = pdfOptions.pageSize === 'A4' ? 'a4' : 'letter';
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageSize,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = 20;

      // Header
      pdf.setFillColor(66, 133, 244);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Project PDF: ${projectName}`, margin, 15);

      // Reset colors
      pdf.setTextColor(0, 0, 0);
      yPosition = 35;

      // Project Information
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Project Information', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Project ID: ${projectId}`, margin + 5, yPosition);
      yPosition += 6;
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin + 5, yPosition);
      yPosition += 10;

      // Group Information
      if (pdfOptions.includeGroupInfo) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Group Details', margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');

        if (selectedGroupId === '__all__') {
          pdf.text(`Selected: All Groups (${groups.length} total)`, margin + 5, yPosition);
          yPosition += 6;
          groups.forEach((group) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(`• ${group.name}: ${group.record_count || 0} records`, margin + 10, yPosition);
            yPosition += 5;
          });
        } else {
          const selectedGroup = groups.find((g) => g.id === selectedGroupId);
          if (selectedGroup) {
            pdf.text(`Selected Group: ${selectedGroup.name}`, margin + 5, yPosition);
            yPosition += 6;
            pdf.text(`Records in Group: ${selectedGroup.record_count || 0}`, margin + 10, yPosition);
            yPosition += 6;
          }
        }
        yPosition += 5;
      }

      // Record Count Summary
      if (pdfOptions.includeRecordCount) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Record Summary', margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Total Records: ${records}`, margin + 5, yPosition);
        yPosition += 8;

        // Display record count summary
        if (records > 0) {
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'bold');
          pdf.text('Record Distribution:', margin + 5, yPosition);
          yPosition += 6;

          pdf.setFont(undefined, 'normal');
          if (selectedGroupId === '__all__') {
            groups.forEach((group) => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = 20;
              }
              pdf.text(`${group.name}: ${group.record_count || 0} records`, margin + 10, yPosition);
              yPosition += 5;
            });
          } else {
            const selectedGroup = groups.find((g) => g.id === selectedGroupId);
            if (selectedGroup) {
              pdf.text(`${selectedGroup.name}: ${selectedGroup.record_count || 0} records`, margin + 10, yPosition);
              yPosition += 5;
            }
          }
        }

        yPosition += 5;
      }

      // Template Details
      if (pdfOptions.includeTemplateDetails && selectedTemplateId) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
        if (selectedTemplate) {
          pdf.setFontSize(14);
          pdf.setFont(undefined, 'bold');
          pdf.text('Template Information', margin, yPosition);
          yPosition += 8;

          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          pdf.text(`Template: ${selectedTemplate.name}`, margin + 5, yPosition);
          yPosition += 6;
          pdf.text(`Category: ${selectedTemplate.category}`, margin + 5, yPosition);
          yPosition += 6;

          if (selectedTemplate.width_mm && selectedTemplate.height_mm) {
            pdf.text(
              `Dimensions: ${selectedTemplate.width_mm}mm × ${selectedTemplate.height_mm}mm`,
              margin + 5,
              yPosition
            );
            yPosition += 6;
          }

          if (selectedTemplate.has_back_side) {
            pdf.text('Back Side: Yes', margin + 5, yPosition);
            yPosition += 6;
          }
        }
      }

      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `${projectName} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      const filename = `${projectName.replace(/\s+/g, '_')}-summary.pdf`;
      pdf.save(filename);
      toast.success('Project summary PDF generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateProjectInfoPDF = async () => {
    setIsGenerating(true);
    try {
      const pageSize = pdfOptions.pageSize === 'A4' ? 'a4' : 'letter';
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageSize,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Project Specifications: ${projectName}`, margin, yPosition);
      yPosition += 12;

      // Divider
      pdf.setDrawColor(66, 133, 244);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Overview Section
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Project Overview', margin, yPosition);
      yPosition += 7;

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const overviewItems = [
        [`Project ID:`, projectId],
        [`Total Groups:`, groups.length.toString()],
        [`Total Templates:`, templates.length.toString()],
        [`Total Records:`, records.toString()],
        [`Generated:`, new Date().toLocaleDateString()],
      ];

      overviewItems.forEach(([label, value]) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFont(undefined, 'bold');
        pdf.text(label, margin + 5, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text(value, margin + 50, yPosition);
        yPosition += 6;
      });

      yPosition += 5;

      // Groups Section
      if (pdfOptions.includeGroupInfo && groups.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Groups', margin, yPosition);
        yPosition += 7;

        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');

        groups.forEach((group) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`• ${group.name}`, margin + 5, yPosition);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(`(${group.record_count || 0} records)`, margin + 70, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 5;
        });

        yPosition += 5;
      }

      // Templates Section
      if (pdfOptions.includeTemplateDetails && templates.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Templates', margin, yPosition);
        yPosition += 7;

        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');

        templates.forEach((template) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.setFont(undefined, 'bold');
          pdf.text(`• ${template.name}`, margin + 5, yPosition);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(`(${template.category})`, margin + 70, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 5;
        });
      }

      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Project Specifications | ${projectName} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      const filename = `${projectName.replace(/\s+/g, '_')}-specifications.pdf`;
      pdf.save(filename);
      toast.success('Project specifications PDF generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    switch (exportFormat) {
      case 'data-summary':
        await generateDataSummaryPDF();
        break;
      case 'specifications':
        await generateProjectInfoPDF();
        break;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedTemplateId('');
      setSelectedGroupId('__all__');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Generate PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Project PDF
          </DialogTitle>
          <DialogDescription>
            Export project details and data summary as PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <Tabs value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="data-summary" className="text-xs">
                  <FileText className="h-4 w-4 mr-1" />
                  Data Summary
                </TabsTrigger>
                <TabsTrigger value="specifications" className="text-xs">
                  <FileText className="h-4 w-4 mr-1" />
                  Specifications
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Data Summary Options */}
          {exportFormat === 'data-summary' && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm font-medium mb-3 block">Select Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Groups</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.record_count || 0} records)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block flex items-center justify-between">
                  <span>Select Template</span>
                  <span className="text-xs text-muted-foreground font-normal">({templates.length} available)</span>
                </Label>
                {templates.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground border rounded bg-muted/50">
                    <p className="font-medium">No templates available</p>
                    <p className="text-xs mt-1">Please create templates in your project first.</p>
                  </div>
                ) : (
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.category ? `(${template.category})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={pdfOptions.includeGroupInfo}
                    onCheckedChange={(checked) =>
                      setPdfOptions({ ...pdfOptions, includeGroupInfo: checked as boolean })
                    }
                  />
                  <span>Include Group Information</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={pdfOptions.includeRecordCount}
                    onCheckedChange={(checked) =>
                      setPdfOptions({ ...pdfOptions, includeRecordCount: checked as boolean })
                    }
                  />
                  <span>Include Record Count</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={pdfOptions.includeTemplateDetails}
                    onCheckedChange={(checked) =>
                      setPdfOptions({ ...pdfOptions, includeTemplateDetails: checked as boolean })
                    }
                  />
                  <span>Include Template Details</span>
                </Label>
              </div>
            </div>
          )}

          {/* Specifications Options */}
          {exportFormat === 'specifications' && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Professional project specification sheet with complete overview
              </p>
              <div className="space-y-2 border-t pt-3">
                <Label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={pdfOptions.includeGroupInfo}
                    onCheckedChange={(checked) =>
                      setPdfOptions({ ...pdfOptions, includeGroupInfo: checked as boolean })
                    }
                  />
                  <span>Include Groups</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={pdfOptions.includeTemplateDetails}
                    onCheckedChange={(checked) =>
                      setPdfOptions({ ...pdfOptions, includeTemplateDetails: checked as boolean })
                    }
                  />
                  <span>Include Templates</span>
                </Label>
              </div>
            </div>
          )}

          {/* Page Size Selection */}
          <div className="space-y-2 border-t pt-4">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
