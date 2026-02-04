/**
 * EXAMPLE PAGE: Template Management
 * 
 * This file shows how to integrate the professional PDF generation
 * components into your application. Copy and adapt as needed.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { templatesAPI } from '@/lib/api';

// Import the new PDF components
import { TemplatePDFExport } from '@/components/template/TemplatePDFExport';
import { TemplatesGrid } from '@/components/template/TemplatesGrid';
import { TemplateCatalog } from '@/components/template/TemplateCatalog';

import { FileText, Grid3X3, List, BarChart3, Download } from 'lucide-react';

/**
 * EXAMPLE 1: Simple Template List with PDF Export
 * Use this in a simple template list page
 */
export function TemplateListWithPDF() {
  const [vendorId] = useState('vendor-123'); // Get from auth context

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', vendorId],
    queryFn: async () => {
      const allTemplates = await templatesAPI.getByVendor(vendorId);
      return allTemplates || [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {templates.map((template: any) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
            >
              <div>
                <h4 className="font-medium">{template.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {template.width_mm}×{template.height_mm}mm
                </p>
              </div>
              
              {/* PDF Export Button */}
              <TemplatePDFExport
                templateId={template.id}
                templateName={template.name}
                templateData={template}
                designJson={template.design_json}
                backDesignJson={template.back_design_json}
                widthMm={template.width_mm}
                heightMm={template.height_mm}
                hasBackSide={template.has_back_side}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * EXAMPLE 2: Full Template Library Page
 * Use this to replace an existing template library
 */
export function TemplateLibraryPage() {
  const { vendorId } = useParams<{ vendorId: string }>();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Template Library</h1>
        <p className="text-muted-foreground">
          Browse, preview, and export professional template documentation
        </p>
      </div>

      {/* Replace old template list with new grid */}
      {vendorId && <TemplatesGrid vendorId={vendorId} />}
    </div>
  );
}

/**
 * EXAMPLE 3: Admin Dashboard with Template Catalog
 * Use this in an admin or vendor dashboard
 */
export function AdminTemplatesDashboard() {
  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Templates Management</h1>
        <p className="text-muted-foreground">
          View all templates, generate documentation, and manage versions
        </p>
      </div>

      {/* Use the professional catalog component */}
      <TemplateCatalog isAdmin={true} />
    </div>
  );
}

/**
 * EXAMPLE 4: Vendor Dashboard with Templates
 * Use this in a vendor-specific dashboard
 */
export function VendorDashboard() {
  const vendorId = 'vendor-123'; // Get from auth context

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Your Templates</h1>
        <p className="text-muted-foreground">
          Manage and export your template documentation
        </p>
      </div>

      {/* Use catalog for vendor view */}
      <TemplateCatalog vendorId={vendorId} isAdmin={false} />
    </div>
  );
}

/**
 * EXAMPLE 5: Public Template Showcase
 * Use this to show public templates to all users
 */
export function PublicTemplateShowcase() {
  return (
    <div className="container py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Public Template Library</h1>
        <p className="text-lg text-muted-foreground">
          Browse our collection of professionally designed templates
        </p>
      </div>

      {/* Show only public templates */}
      <TemplatesGrid showPublicOnly={true} />
    </div>
  );
}

/**
 * EXAMPLE 6: Template Details Page with Export
 * Use this as a single template details view
 */
export function TemplateDetailsPage() {
  const { templateId } = useParams<{ templateId: string }>();

  const { data: template } = useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      return await templatesAPI.getById(templateId);
    },
    enabled: !!templateId,
  });

  if (!template) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header with Export Button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{template.name}</h1>
          <p className="text-muted-foreground text-lg">{template.category}</p>
        </div>

        {/* PDF Export - prominent position */}
        <TemplatePDFExport
          templateId={template.id}
          templateName={template.name}
          templateData={template}
          designJson={template.design_json}
          backDesignJson={template.back_design_json}
          widthMm={template.width_mm}
          heightMm={template.height_mm}
          hasBackSide={template.has_back_side}
        />
      </div>

      {/* Template Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {template.width_mm}×{template.height_mm}mm
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aspect Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {(template.width_mm / template.height_mm).toFixed(2)}:1
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Features</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {template.is_public && <Badge>Public</Badge>}
            {template.has_back_side && <Badge variant="secondary">Back Side</Badge>}
          </CardContent>
        </Card>
      </div>

      {/* Template Preview Area */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {template.thumbnail_url ? (
            <img
              src={template.thumbnail_url}
              alt={template.name}
              className="w-full max-h-96 object-contain rounded-lg"
            />
          ) : (
            <div className="bg-muted rounded-lg p-12 text-center text-muted-foreground">
              No preview available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Design Details */}
      <Card>
        <CardHeader>
          <CardTitle>Design Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Front Design Elements</h4>
            <p className="text-sm text-muted-foreground">
              {template.design_json?.objects?.length || 0} element
              {template.design_json?.objects?.length !== 1 ? 's' : ''}
            </p>
          </div>

          {template.has_back_side && (
            <div>
              <h4 className="font-medium mb-2">Back Design Elements</h4>
              <p className="text-sm text-muted-foreground">
                {template.back_design_json?.objects?.length || 0} element
                {template.back_design_json?.objects?.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * EXAMPLE 7: Tabbed Template Management
 * Use this for a comprehensive template management interface
 */
export function TemplateManagementPage() {
  const vendorId = 'vendor-123';

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Template Management</h1>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Catalog</span>
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exports</span>
          </TabsTrigger>
        </TabsList>

        {/* Grid View Tab */}
        <TabsContent value="library" className="mt-6">
          <TemplatesGrid vendorId={vendorId} />
        </TabsContent>

        {/* Catalog View Tab */}
        <TabsContent value="catalog" className="mt-6">
          <TemplateCatalog vendorId={vendorId} />
        </TabsContent>

        {/* Exports Tab */}
        <TabsContent value="exports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your recently exported PDF files will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * USAGE GUIDE
 * 
 * 1. Simple List:
 *    <TemplateListWithPDF />
 * 
 * 2. Full Library:
 *    <TemplateLibraryPage />
 * 
 * 3. Admin Dashboard:
 *    <AdminTemplatesDashboard />
 * 
 * 4. Vendor Dashboard:
 *    <VendorDashboard />
 * 
 * 5. Public Showcase:
 *    <PublicTemplateShowcase />
 * 
 * 6. Single Template:
 *    <TemplateDetailsPage />
 * 
 * 7. Full Management:
 *    <TemplateManagementPage />
 */

export default TemplateLibraryPage;
