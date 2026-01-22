-- Create teacher_data_links table
CREATE TABLE IF NOT EXISTS teacher_data_links (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  token VARCHAR(50) NOT NULL UNIQUE,
  teacher_name VARCHAR(255) NOT NULL,
  teacher_email VARCHAR(255),
  teacher_phone VARCHAR(20),
  max_submissions INT DEFAULT 100,
  current_submissions INT DEFAULT 0,
  project_id VARCHAR(36),
  vendor_id VARCHAR(36) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_token (token),
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_project_id (project_id),
  INDEX idx_created_at (created_at)
);

-- Create teacher_submissions table for tracking submissions
CREATE TABLE IF NOT EXISTS teacher_submissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  link_id VARCHAR(36) NOT NULL,
  submission_data LONGTEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (link_id) REFERENCES teacher_data_links(id) ON DELETE CASCADE,
  INDEX idx_link_id (link_id),
  INDEX idx_submitted_at (submitted_at)
);
