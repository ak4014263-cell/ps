-- Create admin_staff table for system admin staff management
-- Similar to vendor_staff but for system administrators
CREATE TABLE public.admin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin_staff',
  permissions JSONB DEFAULT '["dashboard", "vendors", "reports", "settings"]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, staff_user_id)
);

-- Enable RLS
ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;

-- Super admins can view all admin staff
CREATE POLICY "Super admins can view all admin staff"
ON public.admin_staff
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR admin_user_id = auth.uid()
  OR staff_user_id = auth.uid()
);

-- Super admins can manage all admin staff
CREATE POLICY "Super admins can manage all admin staff"
ON public.admin_staff
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR admin_user_id = auth.uid()
);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_staff_updated_at
BEFORE UPDATE ON public.admin_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.admin_staff IS 'System admin staff members and their permissions';
COMMENT ON COLUMN public.admin_staff.permissions IS 'JSON array of permitted sections: dashboard, vendors, reports, settings, etc.';
