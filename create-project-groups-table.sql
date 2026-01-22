-- Migration: Create project_groups table for MySQL
-- This table stores project groups for organizing data records

CREATE TABLE IF NOT EXISTS project_groups (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  project_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  template_id CHAR(36),
  record_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_project_id (project_id),
  INDEX idx_template_id (template_id),
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: Run this migration on your MySQL database before using group functionality
-- Example: mysql -u root -p id_card < create-project-groups-table.sql
