-- Add logo columns to clients table
ALTER TABLE clients ADD COLUMN company_logo VARCHAR(500) AFTER country;
ALTER TABLE clients ADD COLUMN signature_logo VARCHAR(500) AFTER company_logo;
