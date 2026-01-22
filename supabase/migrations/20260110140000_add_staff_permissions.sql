-- Add permissions column to vendor_staff table
-- Permissions are stored as a JSON array of section/tab names
ALTER TABLE public.vendor_staff 
ADD COLUMN permissions JSONB DEFAULT '["dashboard", "projects", "staff", "settings"]'::jsonb;

-- Create index for permissions queries
CREATE INDEX idx_vendor_staff_permissions ON public.vendor_staff USING GIN (permissions);

-- Add comment
COMMENT ON COLUMN public.vendor_staff.permissions IS 'JSON array of permitted sections/tabs: dashboard, projects, staff, settings, reports, data_management, etc.';
