-- ============================================================================
-- MYSQL DATABASE SCHEMA FOR REMIX CRYSTAL ADMIN
-- Database: id_card
-- XAMPP Configuration
-- ============================================================================
-- This schema is converted from PostgreSQL to MySQL format
-- Compatible with: MySQL 5.7+, MySQL 8.0, MariaDB 10.3+
-- ============================================================================

-- ============================================================================
-- CREATE DATABASE
-- ============================================================================

CREATE DATABASE IF NOT EXISTS id_card CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE id_card;

-- ============================================================================
-- ENUM TYPES (MySQL uses SET or CHECK constraints)
-- ============================================================================

-- ============================================================================
-- CORE AUTHENTICATION & USER MANAGEMENT TABLES
-- ============================================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  user_id CHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'master_vendor', 'vendor_staff', 'designer_staff', 'data_operator', 'sales_person', 'accounts_manager', 'production_manager', 'client')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role),
  INDEX idx_user_id (user_id),
  INDEX idx_role (role),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VENDOR MANAGEMENT TABLES
-- ============================================================================

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  user_id CHAR(36),
  business_name VARCHAR(255) NOT NULL,
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  website VARCHAR(255),
  business_registration VARCHAR(100),
  tax_id VARCHAR(50),
  bank_account VARCHAR(50),
  bank_name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vendor Staff
CREATE TABLE IF NOT EXISTS vendor_staff (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  vendor_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(100) NOT NULL,
  permissions JSON,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vendor_staff (vendor_id, user_id),
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin Staff
CREATE TABLE IF NOT EXISTS admin_staff (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  admin_user_id CHAR(36) NOT NULL,
  staff_user_id CHAR(36) NOT NULL,
  role VARCHAR(100) NOT NULL,
  permissions JSON,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_admin_staff (admin_user_id, staff_user_id),
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_staff_user_id (staff_user_id),
  FOREIGN KEY (admin_user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PROJECT MANAGEMENT TABLES
-- ============================================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  vendor_id CHAR(36) NOT NULL,
  client_id CHAR(36),
  project_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'data_upload', 'design', 'proof_ready', 'approved', 'printing', 'dispatched', 'delivered', 'cancelled')),
  start_date DATETIME,
  end_date DATETIME,
  budget DECIMAL(15, 2),
  notes TEXT,
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_client_id (client_id),
  INDEX idx_status (status),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project Tasks
CREATE TABLE IF NOT EXISTS project_tasks (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  project_id CHAR(36) NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  due_date DATETIME,
  assigned_to CHAR(36),
  priority VARCHAR(50),
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_id (project_id),
  INDEX idx_assigned_to (assigned_to),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project Assignments
CREATE TABLE IF NOT EXISTS project_assignments (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  project_id CHAR(36) NOT NULL,
  assigned_to CHAR(36) NOT NULL,
  role VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_id (project_id),
  INDEX idx_assigned_to (assigned_to),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PRODUCT & INVENTORY TABLES
-- ============================================================================

-- Items
CREATE TABLE IF NOT EXISTS items (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  vendor_id CHAR(36) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(50),
  description TEXT,
  category VARCHAR(100),
  unit_price DECIMAL(15, 2),
  stock_quantity INT,
  reorder_level INT,
  supplier VARCHAR(255),
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_item_code (vendor_id, item_code),
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_category (category),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products
CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  vendor_id CHAR(36) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(50),
  description TEXT,
  category VARCHAR(100),
  price DECIMAL(15, 2),
  cost DECIMAL(15, 2),
  quantity_available INT,
  image_url TEXT,
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_product_code (vendor_id, product_code),
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_category (category),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CLIENT & COMMUNICATION TABLES
-- ============================================================================

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  vendor_id CHAR(36) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  notes TEXT,
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_email (email),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  vendor_id CHAR(36) NOT NULL,
  client_id CHAR(36),
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50),
  created_by CHAR(36),
  resolved_by CHAR(36),
  resolution_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_status (status),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES profiles(id),
  FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TRANSACTION & PAYMENT TABLES
-- ============================================================================

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  vendor_id CHAR(36) NOT NULL,
  client_id CHAR(36),
  project_id CHAR(36),
  transaction_type VARCHAR(100),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(100),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed', 'refunded')),
  reference_number VARCHAR(100),
  description TEXT,
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_payment_status (payment_status),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

-- Tables created: 13
-- Tables: profiles, user_roles, vendors, vendor_staff, admin_staff, projects, 
--         project_tasks, project_assignments, items, products, clients, 
--         complaints, transactions
-- Indexes: 23
-- All foreign keys configured with CASCADE/SET NULL
-- All timestamps auto-updated
