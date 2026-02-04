import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { templatesAPI } from '@/lib/api';
import { TemplatePDFExport } from './TemplatePDFExport';
import { 
  FileText, 
  Download, 
  Eye, 
  Grid3X3, 
  List, 
  Filter, 
  Search,
  Clock,
  Layers,
  Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface TemplatesGridProps {
  vendorId?: string;
  projectId?: string;
  showPublicOnly?: boolean;
}

export function TemplatesGrid({ vendorId, projectId, showPublicOnly = false }: TemplatesGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates-list', vendorId, projectId, showPublicOnly],
    queryFn: async () => {
      let allTemplates = [];

      if (showPublicOnly) {
        // Get only public templates
        const all = await templatesAPI.getAll();
        allTemplates = all.filter(t => t.is_public);
      } else if (vendorId) {
        // Get vendor's own templates + public templates
        const vendorTemplates = await templatesAPI.getByVendor(vendorId);
        const allPublicTemplates = await templatesAPI.getAll();
        const publicTemplates = allPublicTemplates.filter(t => t.is_public);
        allTemplates = [...vendorTemplates, ...publicTemplates];
        // Remove duplicates
        allTemplates = Array.from(new Map(allTemplates.map(t => [t.id, t])).values());
      } else {
        allTemplates = await templatesAPI.getAll();
      }

      // Sort by created_at descending
      allTemplates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return allTemplates;
    },
    enabled: !!vendorId || showPublicOnly,
  });

  const categories = ['all', ...new Set(templates.map((t: any) => t.category).filter(Boolean))];
  
  const filteredTemplates = templates.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Template Library</h2>
            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                <Filter className="h-3 w-3 mr-1" />
                {cat === 'all' ? 'All Templates' : cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template: any) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Template Preview */}
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-50 h-40 flex items-center justify-center overflow-hidden border-b">
                {template.thumbnail_url ? (
                  <img
                    src={template.thumbnail_url}
                    alt={template.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {template.width_mm}×{template.height_mm}mm
                    </p>
                  </div>
                )}

                {template.has_back_side && (
                  <Badge className="absolute top-2 right-2 bg-blue-500">Back Side</Badge>
                )}
              </div>

              {/* Template Info */}
              <CardHeader className="pb-3">
                <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <span className="text-xs">{template.category}</span>
                  {template.is_public && <Badge variant="secondary" className="text-xs">Public</Badge>}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Dimensions</p>
                    <p className="font-mono font-semibold">{template.width_mm}×{template.height_mm}mm</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Aspect Ratio</p>
                    <p className="font-mono font-semibold">{(template.width_mm / template.height_mm).toFixed(2)}:1</p>
                  </div>
                </div>

                {/* Created Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(template.created_at).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1 gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    <span className="hidden sm:inline">Preview</span>
                  </Button>
                  <TemplatePDFExport
                    templateId={template.id}
                    templateName={template.name}
                    templateData={template}
                    designJson={template.design_json}
                    backDesignJson={template.back_design_json}
                    widthMm={template.width_mm}
                    heightMm={template.height_mm}
                    hasBackSide={template.has_back_side}
                    vendorId={template.vendor_id}
                    marginTop={template.margin_top}
                    marginLeft={template.margin_left}
                    marginRight={template.margin_right}
                    marginBottom={template.margin_bottom}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && (
        <div className="space-y-2">
          {filteredTemplates.map((template: any) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {template.thumbnail_url && (
                    <img
                      src={template.thumbnail_url}
                      alt={template.name}
                      className="h-16 w-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{template.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {template.width_mm}×{template.height_mm}mm
                      </span>
                      {template.has_back_side && (
                        <Badge className="text-xs bg-blue-500">Back</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <TemplatePDFExport
                    templateId={template.id}
                    templateName={template.name}
                    templateData={template}
                    designJson={template.design_json}
                    backDesignJson={template.back_design_json}
                    widthMm={template.width_mm}
                    heightMm={template.height_mm}
                    hasBackSide={template.has_back_side}
                    vendorId={template.vendor_id}
                    marginTop={template.margin_top}
                    marginLeft={template.margin_left}
                    marginRight={template.margin_right}
                    marginBottom={template.margin_bottom}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No templates found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search criteria' : 'Create a new template to get started'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              {previewTemplate?.width_mm}×{previewTemplate?.height_mm}mm • {previewTemplate?.category}
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <Tabs defaultValue="front">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="front">Front</TabsTrigger>
                {previewTemplate.has_back_side && (
                  <TabsTrigger value="back">Back</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="front" className="mt-4">
                <div className="bg-muted/30 rounded-lg p-6 flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Front side preview</p>
                  </div>
                </div>
              </TabsContent>

              {previewTemplate.has_back_side && (
                <TabsContent value="back" className="mt-4">
                  <div className="bg-muted/30 rounded-lg p-6 flex items-center justify-center min-h-[300px]">
                    <div className="text-center">
                      <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Back side preview</p>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)} className="flex-1">
              Close
            </Button>
            {previewTemplate && (
              <TemplatePDFExport
                templateId={previewTemplate.id}
                templateName={previewTemplate.name}
                templateData={previewTemplate}
                designJson={previewTemplate.design_json}
                backDesignJson={previewTemplate.back_design_json}
                widthMm={previewTemplate.width_mm}
                heightMm={previewTemplate.height_mm}
                hasBackSide={previewTemplate.has_back_side}
                vendorId={previewTemplate.vendor_id}
                marginTop={previewTemplate.margin_top}
                marginLeft={previewTemplate.margin_left}
                marginRight={previewTemplate.margin_right}
                marginBottom={previewTemplate.margin_bottom}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
