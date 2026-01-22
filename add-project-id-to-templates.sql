-- Migration: Add project_id column to templates table
-- This ensures templates belong to a specific project

-- Add project_id column to templates table
ALTER TABLE templates 
ADD COLUMN project_id CHAR(36) NULL AFTER vendor_id;

-- Add foreign key constraint
ALTER TABLE templates 
ADD CONSTRAINT fk_templates_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_templates_project_id ON templates(project_id);

-- Add index for vendor_id and is_public queries (for public template access)
CREATE INDEX idx_templates_vendor_public ON templates(vendor_id, is_public);

-- Note: For existing templates without project_id, they will be NULL
-- You may want to assign them to a default project or handle them separately
