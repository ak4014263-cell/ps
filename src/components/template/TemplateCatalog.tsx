import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { templatesAPI } from '@/lib/api';
import { TemplatePDFExport } from './TemplatePDFExport';
import {
  FileText,
  Download,
  Share2,
  Lock,
  Globe,
  Users,
  TrendingUp,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

interface TemplateCatalogProps {
  vendorId?: string;
  isAdmin?: boolean;
}

interface TemplateStats {
  totalTemplates: number;
  publicTemplates: number;
  privateTemplates: number;
  categoriesCount: number;
  totalExports: number;
}

export function TemplateCatalog({ vendorId, isAdmin = false }: TemplateCatalogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [stats, setStats] = useState<TemplateStats | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['templates-catalog', vendorId, isAdmin],
    queryFn: async () => {
      let allTemplates = [];
      
      if (isAdmin) {
        // Admin sees all templates
        allTemplates = await templatesAPI.getAll();
      } else if (vendorId) {
        // Vendor sees their own templates + public templates
        const vendorTemplates = await templatesAPI.getByVendor(vendorId);
        const allPublicTemplates = await templatesAPI.getAll();
        const publicTemplates = allPublicTemplates.filter(t => t.is_public);
        allTemplates = [...vendorTemplates, ...publicTemplates];
        // Remove duplicates
        allTemplates = Array.from(new Map(allTemplates.map(t => [t.id, t])).values());
      } else {
        // No vendorId - get only public templates
        const all = await templatesAPI.getAll();
        allTemplates = all.filter(t => t.is_public);
      }

      console.log('[TemplateCatalog] Raw API response:', allTemplates);
      if (allTemplates.length > 0) {
        console.log('[TemplateCatalog] First template:', allTemplates[0]);
      }

      // Sort by created_at descending
      allTemplates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Calculate stats
      const allCategories = new Set(allTemplates.map(t => t.category).filter(Boolean));
      setStats({
        totalTemplates: allTemplates.length,
        publicTemplates: allTemplates.filter(t => t.is_public).length,
        privateTemplates: allTemplates.filter(t => !t.is_public).length,
        categoriesCount: allCategories.size,
        totalExports: 0,
      });

      return allTemplates;
    },
    enabled: true, // Always enabled to load templates
  });

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTemplates}</div>
              <p className="text-xs text-muted-foreground mt-1">All available templates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Public
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.publicTemplates}</div>
              <p className="text-xs text-muted-foreground mt-1">Shared publicly</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Private
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.privateTemplates}</div>
              <p className="text-xs text-muted-foreground mt-1">Vendor only</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3" /> Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categoriesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Template types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Exports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExports}</div>
              <p className="text-xs text-muted-foreground mt-1">Total exports</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Catalog */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Template Catalog</h2>
          <span className="text-sm text-muted-foreground">{templates.length} templates</span>
        </div>

        {templatesLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading templates...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((template: any) => (
              <Card
                key={template.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Template Preview */}
                    <div className="flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg h-40 md:h-auto">
                      {template.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt={template.name}
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">
                            {template.width_mm}×{template.height_mm}mm
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Template Info */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">{template.category}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {template.is_public && (
                          <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                        {!template.is_public && (
                          <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        )}
                        {template.has_back_side && (
                          <Badge variant="secondary">
                            Back Side
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Specifications */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Dimensions</p>
                        <p className="font-mono font-semibold">{template.width_mm}×{template.height_mm}mm</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Aspect Ratio</p>
                        <p className="font-mono font-semibold">{(template.width_mm / template.height_mm).toFixed(2)}:1</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm">{new Date(template.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 justify-between">
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

                      {template.is_public && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/templates/${template.id}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Template link copied!');
                          }}
                          className="gap-2"
                        >
                          <Share2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Share</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!templatesLoading && templates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">No templates available</h3>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Create or import templates to get started' : 'Ask your vendor to create templates'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.category} • {selectedTemplate?.width_mm}×{selectedTemplate?.height_mm}mm
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Preview */}
              <div className="bg-muted/30 rounded-lg p-8 flex items-center justify-center min-h-[250px]">
                {selectedTemplate.thumbnail_url ? (
                  <img
                    src={selectedTemplate.thumbnail_url}
                    alt={selectedTemplate.name}
                    className="max-h-full max-w-full"
                  />
                ) : (
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Template preview</p>
                  </div>
                )}
              </div>

              {/* Details Table */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Dimensions</p>
                  <p className="font-semibold">{selectedTemplate.width_mm}×{selectedTemplate.height_mm}mm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aspect Ratio</p>
                  <p className="font-semibold">{(selectedTemplate.width_mm / selectedTemplate.height_mm).toFixed(2)}:1</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-semibold">
                    {selectedTemplate.is_public ? 'Public' : 'Private'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Back Side</p>
                  <p className="font-semibold">
                    {selectedTemplate.has_back_side ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {/* Design Elements Count */}
              {selectedTemplate.design_json?.objects && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Contains {selectedTemplate.design_json.objects.length} design element{selectedTemplate.design_json.objects.length !== 1 ? 's' : ''}
                  </AlertDescription>
                </Alert>
              )}

              {/* Created Date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Created {new Date(selectedTemplate.created_at).toLocaleDateString()}</span>
              </div>

              {/* Share Link for Public Templates */}
              {selectedTemplate.is_public && (
                <div>
                  <p className="text-sm font-medium mb-2">Share Link</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/templates/${selectedTemplate.id}`}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-md text-sm bg-muted"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/templates/${selectedTemplate.id}`
                        );
                        toast.success('Link copied!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedTemplate(null)} className="flex-1">
              Close
            </Button>
            {selectedTemplate && (
              <TemplatePDFExport
                templateId={selectedTemplate.id}
                templateName={selectedTemplate.name}
                templateData={selectedTemplate}
                designJson={selectedTemplate.design_json}
                backDesignJson={selectedTemplate.back_design_json}
                widthMm={selectedTemplate.width_mm}
                heightMm={selectedTemplate.height_mm}
                hasBackSide={selectedTemplate.has_back_side}
                vendorId={selectedTemplate.vendor_id}
                marginTop={selectedTemplate.margin_top}
                marginLeft={selectedTemplate.margin_left}
                marginRight={selectedTemplate.margin_right}
                marginBottom={selectedTemplate.margin_bottom}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
