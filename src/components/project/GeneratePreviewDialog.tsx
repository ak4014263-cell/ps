import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
}

interface GeneratePreviewDialogProps {
  projectId: string;
  vendorId: string;
  groups: Group[];
}

export function GeneratePreviewDialog({ projectId, vendorId, groups }: GeneratePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('__all__');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['vendor-templates-preview', vendorId],
    queryFn: async () => {
      const response = await apiService.templatesAPI.getByVendor(vendorId);
      // Fallback to all if vendor filter returns nothing or handle public
      return (response.data || response || []) as Template[];
    },
    enabled: open && !!vendorId,
  });

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    setIsGenerating(true);
    setPreviewUrl(null);

    try {
      // Build options for records
      const options: any = {
        limit: 10,
        order_by: 'record_number',
        order: 'asc'
      };

      if (selectedGroupId !== '__all__') {
        options.group_id = selectedGroupId;
      }

      const recordsResponse = await apiService.dataRecordsAPI.getByProject(projectId, options);
      const records = recordsResponse.data || recordsResponse || [];

      if (!records || records.length === 0) {
        toast.error('No records found for the selected criteria');
        setIsGenerating(false);
        return;
      }

      // Get template
      const templateResponse = await apiService.templatesAPI.getById(selectedTemplateId);
      const template = templateResponse.data || templateResponse;

      // Call generate-pdf API
      const pdfData = await apiService.templatesAPI.generatePDF({
        projectId: projectId,
        groupId: selectedGroupId === '__all__' ? undefined : selectedGroupId,
        templateData: {
          design_json: template.design_json,
          back_design_json: template.back_design_json,
          has_back_side: template.has_back_side,
          width_mm: template.width_mm,
          height_mm: template.height_mm,
        },
        records: records,
        options: {
          pageSize: 'A4',
          orientation: 'portrait',
        },
      });

      if (pdfData?.url) {
        setPreviewUrl(pdfData.url);
        toast.success('Preview generated successfully');
      } else {
        throw new Error('No PDF URL returned');
      }
    } catch (error: any) {
      console.error('Preview generation error:', error);
      toast.error('Failed to generate preview: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setPreviewUrl(null);
      setSelectedTemplateId('');
      setSelectedGroupId('__all__');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Generate Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Preview (First 10 Records)</DialogTitle>
          <DialogDescription>
            This preview shows the first 10 records. Use the PDF Generator for full output.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Group</Label>
            <Select
              value={selectedGroupId}
              onValueChange={setSelectedGroupId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Records</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.record_count || 0} records)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewUrl && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2 flex items-center justify-between">
                <span className="text-sm font-medium">Preview</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  Open in new tab
                </Button>
              </div>
              <iframe
                src={previewUrl}
                className="w-full h-[400px]"
                title="PDF Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !selectedTemplateId}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
