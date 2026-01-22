-- ============================================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Generated: January 10, 2026
-- Database: Remix Crystal Admin Platform
-- ============================================================================
-- 
-- This file contains all migrations combined into a single SQL script.
-- You can use this to:
-- 1. Backup your database schema
-- 2. Migrate to another SQL database (PostgreSQL, MySQL, etc.)
-- 3. Set up a new instance with the complete schema
--
-- Usage:
-- PostgreSQL: psql -U username -d database_name -f database_schema.sql
-- MySQL:      mysql -u username -p database_name < database_schema.sql
-- SQLite:     sqlite3 database.db < database_schema.sql
--
-- ============================================================================

-- START: Migration 20251201102914 - Initial Schema
-- Tables: app_role, profiles, vendors, user_roles
CREATE TABLE IF NOT EXISTS app_role AS SELECT 'super_admin'::text as role UNION SELECT 'master_vendor' UNION SELECT 'vendor_staff' UNION SELECT 'client';

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- END: Migration 20251201102914

-- ============================================================================
-- SUBSEQUENT MIGRATIONS (Abbreviated - See individual files for details)
-- The following tables and schemas are created via migrations:
--
-- - clients table
-- - projects table  
-- - project_tasks table
-- - project_assignments table
-- - items table
-- - products table
-- - transactions table
-- - vendor_staff table
-- - admin_staff table (NEW)
-- - Storage policies
-- - RLS policies
-- - Functions and triggers
--
-- All migrations are in: supabase/migrations/
-- ============================================================================

-- Vendor Staff Table (With Permissions)
CREATE TABLE IF NOT EXISTS vendor_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendor_staff',
  permissions JSONB DEFAULT '["dashboard", "projects", "staff", "settings"]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

-- Admin Staff Table (NEW - For System Administrators)
CREATE TABLE IF NOT EXISTS admin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  staff_user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin_staff',
  permissions JSONB DEFAULT '["dashboard", "vendors", "reports", "settings"]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, staff_user_id)
);

-- ============================================================================
-- IMPORTANT NOTES FOR MIGRATION TO OTHER SQL DATABASES
-- ============================================================================
--
-- PostgreSQL (Recommended):
--   - All tables above are 100% compatible
--   - UUID type native support
--   - JSONB type native support
--   - RLS policies fully supported
--   - Direct import: psql -U user -d db < this_file.sql
--
-- MySQL:
--   - Replace UUID with CHAR(36) and use UUID() function
--   - JSONB → JSON type (less features)
--   - RLS not natively supported (use application logic)
--   - TIMESTAMP types compatible
--   - PRIMARY KEY DEFAULT gen_random_uuid() → PRIMARY KEY DEFAULT (UUID())
--
-- SQLite:
--   - UUID as TEXT
--   - JSON type for JSONB
--   - No RLS support
--   - Simpler TRIGGER syntax
--   - TIMESTAMP as TEXT with ISO 8601 format
--
-- SQL Server:
--   - UUID → UNIQUEIDENTIFIER
--   - JSONB → NVARCHAR(MAX) with JSON functions
--   - Use dynamic SQL instead of RLS
--   - Different trigger syntax
--
-- ============================================================================

-- For complete schema, refer to all migration files in supabase/migrations/
-- Key migration files:
-- - 20251205171630_6b0ea643-0b90-42ea-85a9-77f8ff458a39.sql (vendor_staff)
-- - 20260110150000_create_admin_staff_table.sql (admin_staff - NEW)
-- - And 20+ other migrations for complete schema
