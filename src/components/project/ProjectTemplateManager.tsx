import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, MoreVertical, Edit, Trash2, Eye, FileText, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Template {
  id: string;
  template_name: string;
  template_type?: string;
  vendor_id: string | null;
  template_data?: any;
  is_active?: number | boolean;
  created_at?: string;
  category?: string;
  width_mm?: number;
  height_mm?: number;
  name?: string;
}

interface ProjectTemplateManagerProps {
  vendorId: string;
  projectId: string;
}

const PAGE_FORMATS = [
  { label: 'Page: A4', sublabel: '297×210mm', width: 210, height: 297 },
  { label: 'Page: 13×19', sublabel: '330×482mm', width: 330, height: 482 },
];

const TEMPLATE_TYPES = [
  'id_card',
  'certificate',
  'label',
  'badge',
  'custom',
];

export function ProjectTemplateManager({ vendorId, projectId }: ProjectTemplateManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'id_card',
    pageFormat: 'a4',
    customWidth: 85.6,
    customHeight: 54,
    marginTop: 1,
    marginLeft: 1,
    marginRight: 1,
    marginBottom: 1,
    applicableFor: '__all__',
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['vendor-templates', vendorId],
    queryFn: async () => {
      const res = await apiService.templatesAPI.getByVendor(vendorId);
      const items = res?.data || res || [];
      return items as Template[];
    },
    enabled: !!vendorId,
  });

  // Project groups (optional). If backend route not available, keep empty array.
  const { data: groups = [] } = useQuery({
    queryKey: ['project-groups', projectId],
    queryFn: async () => {
      try {
        const projectRes = await apiService.projectsAPI.getById(projectId);
        const project = projectRes?.data || projectRes;
        return project?.groups || [];
      } catch {
        return [];
      }
    },
    enabled: !!projectId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let width = data.customWidth;
      let height = data.customHeight;

      if (data.pageFormat === 'a4') {
        width = 210;
        height = 297;
      } else if (data.pageFormat === '13x19') {
        width = 330;
        height = 482;
      }

      const designJson = {
        version: '1.0',
        objects: [],
        background: '#ffffff',
        pageMargins: {
          top: data.marginTop,
          left: data.marginLeft,
          right: data.marginRight,
          bottom: data.marginBottom,
        },
      };

      const payload = {
        template_name: data.name,
        vendor_id: vendorId,
        project_id: projectId, // Required: template belongs to this project
        template_type: data.category,
        template_data: {
          width_mm: width,
          height_mm: height,
          margin_top: data.marginTop,
          margin_left: data.marginLeft,
          margin_right: data.marginRight,
          margin_bottom: data.marginBottom,
          is_public: false, // Default to false, can be changed in designer
          design_json: designJson,
        },
        is_active: true,
      };

      const created = await apiService.templatesAPI.create(payload);

      // If applicable for a specific group, assign the template to that group (best-effort)
      // Group assignment skipped (not supported by backend yet)

      return created?.data || created;
    },
    onSuccess: (newTemplate) => {
      toast.success('Template created successfully');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['vendor-templates', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      
      // Navigate to template designer
      if (newTemplate) {
        navigate(`/template-designer?templateId=${newTemplate.id}`);
      }
    },
    onError: (error: any) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      let width = data.customWidth;
      let height = data.customHeight;

      if (data.pageFormat === 'a4') {
        width = 210;
        height = 297;
      } else if (data.pageFormat === '13x19') {
        width = 330;
        height = 482;
      }

      await apiService.templatesAPI.update(id, {
        template_name: data.name,
        template_type: data.category,
        template_data: {
          width_mm: width,
          height_mm: height,
          margin_top: data.marginTop,
          margin_left: data.marginLeft,
          margin_right: data.marginRight,
          margin_bottom: data.marginBottom,
        },
      });
    },
    onSuccess: () => {
      toast.success('Template updated');
      setIsEditOpen(false);
      setSelectedTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['vendor-templates', vendorId] });
    },
    onError: (error: any) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiService.templatesAPI.delete(id);
    },
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['vendor-templates', vendorId] });
    },
    onError: (error: any) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'id_card',
      pageFormat: 'a4',
      customWidth: 85.6,
      customHeight: 54,
      marginTop: 1,
      marginLeft: 1,
      marginRight: 1,
      marginBottom: 1,
      applicableFor: '__all__',
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    createTemplateMutation.mutate(formData);
  };

  const handleEditOpen = (template: Template) => {
    setSelectedTemplate(template);
    const width = template.template_data?.width_mm || 0;
    const height = template.template_data?.height_mm || 0;
    const isA4 = width === 210 && height === 297;
    const is13x19 = width === 330 && height === 482;
    
    setFormData({
      name: template.template_name || template.name || template.template_data?.template_name || 'Untitled',
      category: template.category || template.template_type || 'design',
      pageFormat: isA4 ? 'a4' : is13x19 ? '13x19' : 'custom',
      customWidth: width || 85.6,
      customHeight: height || 54,
      marginTop: template.template_data?.margin_top ?? 1,
      marginLeft: template.template_data?.margin_left ?? 1,
      marginRight: template.template_data?.margin_right ?? 1,
      marginBottom: template.template_data?.margin_bottom ?? 1,
      applicableFor: '__all__',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedTemplate || !formData.name.trim()) return;
    updateTemplateMutation.mutate({ id: selectedTemplate.id, data: formData });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage templates for this project
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No templates yet</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const width = template.template_data?.width_mm || template.width_mm || 0;
            const height = template.template_data?.height_mm || template.height_mm || 0;
            const name = template.template_name || template.name || template.template_data?.template_name || 'Untitled';
            const category = template.category || template.template_type || 'design';
            return (
            <Card key={template.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                <FileText className="h-16 w-16 text-muted-foreground/50" />
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/template-designer?templateId=${template.id}`)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Design
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditOpen(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {width} × {height} mm
                    </p>
                  </div>
                  <Badge variant="outline">{category}</Badge>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ID CARD 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Page Format</Label>
              <RadioGroup
                value={formData.pageFormat}
                onValueChange={(v) => setFormData({ ...formData, pageFormat: v })}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="a4" id="a4" />
                  <Label htmlFor="a4" className="cursor-pointer">
                    <div className="font-medium text-sm">A4</div>
                    <div className="text-xs text-muted-foreground">297×210mm</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="13x19" id="13x19" />
                  <Label htmlFor="13x19" className="cursor-pointer">
                    <div className="font-medium text-sm">13×19</div>
                    <div className="text-xs text-muted-foreground">330×482mm</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer">
                    <div className="font-medium text-sm flex items-center gap-1">
                      <Pencil className="h-3 w-3" /> Custom
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.pageFormat === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={formData.customWidth}
                    onChange={(e) => setFormData({ ...formData, customWidth: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={formData.customHeight}
                    onChange={(e) => setFormData({ ...formData, customHeight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Page margin(mm)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Top</Label>
                  <Input
                    type="number"
                    value={formData.marginTop}
                    onChange={(e) => setFormData({ ...formData, marginTop: parseFloat(e.target.value) || 0 })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Left</Label>
                  <Input
                    type="number"
                    value={formData.marginLeft}
                    onChange={(e) => setFormData({ ...formData, marginLeft: parseFloat(e.target.value) || 0 })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Right</Label>
                  <Input
                    type="number"
                    value={formData.marginRight}
                    onChange={(e) => setFormData({ ...formData, marginRight: parseFloat(e.target.value) || 0 })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bottom</Label>
                  <Input
                    type="number"
                    value={formData.marginBottom}
                    onChange={(e) => setFormData({ ...formData, marginBottom: parseFloat(e.target.value) || 0 })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applicable for</Label>
              <Select
                value={formData.applicableFor}
                onValueChange={(v) => setFormData({ ...formData, applicableFor: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select applicable for" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createTemplateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createTemplateMutation.isPending ? 'Creating...' : 'Add template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Page Format</Label>
              <RadioGroup
                value={formData.pageFormat}
                onValueChange={(v) => setFormData({ ...formData, pageFormat: v })}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="a4" id="edit-a4" />
                  <Label htmlFor="edit-a4" className="cursor-pointer">
                    <div className="font-medium text-sm">A4</div>
                    <div className="text-xs text-muted-foreground">297×210mm</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="13x19" id="edit-13x19" />
                  <Label htmlFor="edit-13x19" className="cursor-pointer">
                    <div className="font-medium text-sm">13×19</div>
                    <div className="text-xs text-muted-foreground">330×482mm</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="custom" id="edit-custom" />
                  <Label htmlFor="edit-custom" className="cursor-pointer">
                    <div className="font-medium text-sm">Custom</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.pageFormat === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={formData.customWidth}
                    onChange={(e) => setFormData({ ...formData, customWidth: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={formData.customHeight}
                    onChange={(e) => setFormData({ ...formData, customHeight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsEditOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateTemplateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
