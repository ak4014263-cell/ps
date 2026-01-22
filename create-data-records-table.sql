-- ============================================================================
-- CREATE DATA_RECORDS TABLE FOR STORING CSV DATA
-- ============================================================================
-- This table stores flexible data records with JSON field for CSV columns
-- CSV fields from the file will be stored in the data_json column as JSON
-- ============================================================================

-- Create data_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS data_records (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  group_id VARCHAR(36) NULL,
  record_number INT NOT NULL,
  
  -- JSON field to store all CSV data fields flexibly
  -- This will store fields like: schoolCode, admNo, firstName, lastName, dob,
  -- className, sec, gender, profilePic, link, fatherName, motherName, etc.
  data_json JSON NOT NULL,
  
  -- Photo/Image fields
  photo_url TEXT NULL,
  cropped_photo_url TEXT NULL,
  original_photo_url TEXT NULL,
  cloudinary_public_id VARCHAR(255) NULL,
  
  -- Processing status fields
  processing_status VARCHAR(50) DEFAULT 'pending',
  background_removed BOOLEAN DEFAULT FALSE,
  face_detected BOOLEAN DEFAULT FALSE,
  face_crop_coordinates JSON NULL,
  processing_error TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for better query performance
  INDEX idx_project_id (project_id),
  INDEX idx_group_id (group_id),
  INDEX idx_record_number (record_number),
  INDEX idx_processing_status (processing_status),
  INDEX idx_project_record (project_id, record_number)
  
  -- Foreign keys (commented out - uncomment if tables exist)
  -- FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  -- FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EXAMPLE DATA_JSON STRUCTURE FOR CSV FIELDS
-- ============================================================================
-- The data_json field will store all CSV columns as JSON:
-- {
--   "schoolCode": "44837",
--   "admNo": "10",
--   "firstName": "Nitin",
--   "lastName": "",
--   "dob": "",
--   "className": "4th",
--   "sec": "A",
--   "gender": "",
--   "profilePic": "44837_10_Nitin_.jpg",
--   "link": "",
--   "fatherName": "Ramesh",
--   "motherName": "Suman",
--   "fatherMobNo": "9984460454",
--   "email": "",
--   "admDate": "",
--   "session": "",
--   "fatherAadhaar": "",
--   "fatherOccupation": "",
--   "fatherProfilePic": "",
--   "fatherWhatsApp": "",
--   "motherAadhaar": "",
--   "motherMobNo": "",
--   "motherOccupation": "",
--   "motherWhatsApp": "",
--   "bloodGroup": "",
--   "religion": "",
--   "caste": "",
--   "subCaste": "",
--   "schoolHouse": "",
--   "address": "Tuiyapurwa Paindabad Kannauj",
--   "transportMode": "",
--   "rfid": ""
-- }
-- ============================================================================
-- 
-- NOTE: To add missing columns to an existing table, use the server.js
-- initialization code which checks for column existence before adding.
-- ============================================================================
