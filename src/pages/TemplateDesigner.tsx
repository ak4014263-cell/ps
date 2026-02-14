import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { AdvancedTemplateDesigner } from '@/components/designer/AdvancedTemplateDesigner';

export default function TemplateDesigner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = searchParams.get('templateId');
  const projectId = searchParams.get('projectId');

  const { data: editTemplate, isLoading } = useQuery({
    queryKey: ['template-for-edit', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      // Fetch template from backend and map to designer-friendly shape
      const response = await apiService.templatesAPI.getById(templateId);
      const template = response?.data || response;
      if (!template) return null;

      const data = template.template_data || {};

      return {
        id: template.id,
        name: template.name || template.template_name,
        category: template.template_type || 'design',
        width_mm: data.width_mm || 85.6,
        height_mm: data.height_mm || 54,
        is_public: data.is_public ?? false,
        has_back_side: !!data.back_design_json,
        design_json: data.design_json || null,
        back_design_json: data.back_design_json || null,
        vendor_id: template.vendor_id,
        project_id: template.project_id || null, // Include project_id from template
      };
    },
    enabled: !!templateId,
  });

  // Determine which project_id to use: from URL param or from template
  const effectiveProjectId = projectId || editTemplate?.project_id;

  // Fetch project with client data for auto-population
  const { data: projectWithClient } = useQuery({
    queryKey: ['project-with-client', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return null;
      const response = await apiService.projectsAPI.getById(effectiveProjectId);
      return response.data || response;
    },
    enabled: !!effectiveProjectId,
  });

  if (templateId && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading template...</div>
      </div>
    );
  }

  return (
    <AdvancedTemplateDesigner
      editTemplate={editTemplate}
      onBack={() => navigate(-1)}
      projectId={effectiveProjectId || undefined}
      projectClient={projectWithClient?.clients || undefined}
    />
  );
}
