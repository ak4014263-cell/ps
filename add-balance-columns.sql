-- Add balance and credit_limit columns to clients table
ALTER TABLE clients ADD COLUMN balance DECIMAL(15, 2) DEFAULT 0.00 AFTER updated_at;
ALTER TABLE clients ADD COLUMN credit_limit DECIMAL(15, 2) DEFAULT 0.00 AFTER balance;

-- Verify columns
SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'clients'
AND COLUMN_NAME IN ('balance', 'credit_limit', 'company_logo', 'signature_logo');
