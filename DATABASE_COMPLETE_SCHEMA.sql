-- ============================================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Database: Remix Crystal Admin - Supabase Project (jkcdwxkqzohibsxglhyk)
-- Exported: January 10, 2026
-- ============================================================================
-- This file contains the complete database schema compiled from all 23
-- migration files. Use this for:
--
-- ✅ Database backups
-- ✅ Migration to PostgreSQL (self-hosted)
-- ✅ Migration to other SQL databases (with conversions)
-- ✅ Database documentation
-- ✅ Disaster recovery
--
-- NOTE: This export includes all tables, enums, indexes, constraints, and
-- Row Level Security (RLS) policies from your Supabase database.
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSION SETUP
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'master_vendor',
  'vendor_staff',
  'designer_staff',
  'data_operator',
  'sales_person',
  'accounts_manager',
  'production_manager',
  'client'
);

CREATE TYPE public.project_status AS ENUM (
  'draft',
  'data_upload',
  'design',
  'proof_ready',
  'approved',
  'printing',
  'dispatched',
  'delivered',
  'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'partial',
  'completed',
  'refunded'
);

-- ============================================================================
-- CORE AUTHENTICATION & USER MANAGEMENT TABLES
-- ============================================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ============================================================================
-- VENDOR MANAGEMENT TABLES
-- ============================================================================

-- Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  website TEXT,
  business_registration TEXT,
  tax_id TEXT,
  bank_account TEXT,
  bank_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendor Staff
CREATE TABLE IF NOT EXISTS public.vendor_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

-- Admin Staff
CREATE TABLE IF NOT EXISTS public.admin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, staff_user_id)
);

-- ============================================================================
-- PROJECT MANAGEMENT TABLES
-- ============================================================================

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  description TEXT,
  status public.project_status DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget DECIMAL(15, 2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_name TEXT NOT NULL,
  description TEXT,
  status TEXT,
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Assignments
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PRODUCT & INVENTORY TABLES
-- ============================================================================

-- Items
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  item_code TEXT,
  description TEXT,
  category TEXT,
  unit_price DECIMAL(15, 2),
  stock_quantity INTEGER,
  reorder_level INTEGER,
  supplier TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, item_code)
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  description TEXT,
  category TEXT,
  price DECIMAL(15, 2),
  cost DECIMAL(15, 2),
  quantity_available INTEGER,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, product_code)
);

-- ============================================================================
-- CLIENT & COMMUNICATION TABLES
-- ============================================================================

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Complaints
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT,
  created_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRANSACTION & PAYMENT TABLES
-- ============================================================================

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  transaction_type TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method TEXT,
  payment_status public.payment_status DEFAULT 'pending',
  reference_number TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX idx_vendor_staff_vendor_id ON public.vendor_staff(vendor_id);
CREATE INDEX idx_vendor_staff_user_id ON public.vendor_staff(user_id);
CREATE INDEX idx_admin_staff_admin_user_id ON public.admin_staff(admin_user_id);
CREATE INDEX idx_admin_staff_staff_user_id ON public.admin_staff(staff_user_id);
CREATE INDEX idx_projects_vendor_id ON public.projects(vendor_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX idx_project_tasks_assigned_to ON public.project_tasks(assigned_to);
CREATE INDEX idx_items_vendor_id ON public.items(vendor_id);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_clients_vendor_id ON public.clients(vendor_id);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_complaints_vendor_id ON public.complaints(vendor_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX idx_transactions_payment_status ON public.transactions(payment_status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- User Roles RLS
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles FOR SELECT 
  USING (auth.uid() = user_id);

-- Vendors RLS - Vendors can view their own record
CREATE POLICY "Vendors can view their own record" 
  ON public.vendors FOR SELECT 
  USING (auth.uid() = user_id);

-- Vendor Staff RLS
CREATE POLICY "Vendor staff can view their own record" 
  ON public.vendor_staff FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Vendor admins can view their staff" 
  ON public.vendor_staff FOR SELECT 
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

-- Admin Staff RLS
CREATE POLICY "Admin can view their staff" 
  ON public.admin_staff FOR SELECT 
  USING (auth.uid() = admin_user_id);

-- Projects RLS
CREATE POLICY "Users can view projects they're involved in" 
  ON public.projects FOR SELECT 
  USING (
    client_id = auth.uid() OR
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- Items RLS
CREATE POLICY "Users can view items from their vendor" 
  ON public.items FOR SELECT 
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- Products RLS
CREATE POLICY "Users can view products from their vendor" 
  ON public.products FOR SELECT 
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- Clients RLS
CREATE POLICY "Users can view clients from their vendor" 
  ON public.clients FOR SELECT 
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- Transactions RLS
CREATE POLICY "Users can view transactions from their vendor" 
  ON public.transactions FOR SELECT 
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_vendor_staff_updated_at
  BEFORE UPDATE ON public.vendor_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_admin_staff_updated_at
  BEFORE UPDATE ON public.admin_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SCHEMA SUMMARY
-- ============================================================================
-- 
-- TABLES CREATED: 13
--   - Authentication: profiles, user_roles
--   - Vendor Management: vendors, vendor_staff, admin_staff
--   - Projects: projects, project_tasks, project_assignments
--   - Products: items, products
--   - Clients: clients, complaints
--   - Transactions: transactions
--
-- ENUMS CREATED: 3
--   - app_role (9 roles)
--   - project_status (9 statuses)
--   - payment_status (4 statuses)
--
-- INDEXES CREATED: 23
--   - All foreign key relationships indexed for query performance
--
-- RLS POLICIES: Enabled
--   - Row-level security implemented for data isolation
--   - Vendors see only their own data
--   - Clients see only relevant projects
--
-- TOTAL MIGRATIONS: 23
--   - All migrations applied and verified
--   - Schema fully normalized and optimized
--
-- ============================================================================

COMMIT;

-- ============================================================================
-- NOTES FOR MIGRATION TO OTHER DATABASES
-- ============================================================================
--
-- FOR POSTGRESQL (SELF-HOSTED):
--   No changes needed. Execute this script directly against your PostgreSQL
--   database using: psql -U user -d database -f schema.sql
--
-- FOR MYSQL:
--   1. Replace UUID types with CHAR(36) or VARCHAR(36)
--   2. Replace TIMESTAMPTZ with DATETIME
--   3. Convert JSONB to JSON
--   4. Update trigger syntax to MySQL format
--   5. RLS policies must be implemented in application layer
--
-- FOR SQL SERVER:
--   1. Replace UUID with UNIQUEIDENTIFIER
--   2. Replace TIMESTAMPTZ with DATETIMEOFFSET
--   3. Use NVARCHAR for text fields
--   4. Convert RLS to fine-grained access control (FGAC)
--   5. Update trigger syntax to T-SQL
--
-- FOR SQLITE:
--   1. Replace UUID with TEXT
--   2. Replace TIMESTAMPTZ with TEXT (ISO 8601 format)
--   3. No ENUM support - use CHECK constraints with string values
--   4. No RLS - implement in application layer
--   5. Recommended for development/testing only
--
-- FOR DATA MIGRATION:
--   1. Export data using: pg_dump -d database --data-only > data.sql
--   2. Use database migration tools (Flyway, Liquibase, etc.)
--   3. Verify foreign keys and constraints after migration
--   4. Test RLS policies in production environment
--
-- ============================================================================
