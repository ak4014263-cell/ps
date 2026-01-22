-- Check if columns exist, if not create them
SET @dbname = DATABASE();
SET @tablename = 'clients';
SET @columnname = 'company_logo';

IF NOT EXISTS (
  SELECT * FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'clients'
  AND COLUMN_NAME = 'company_logo'
)
THEN
  ALTER TABLE clients ADD COLUMN company_logo LONGTEXT;
END IF;

IF NOT EXISTS (
  SELECT * FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'clients'
  AND COLUMN_NAME = 'signature_logo'
)
THEN
  ALTER TABLE clients ADD COLUMN signature_logo LONGTEXT;
END IF;

-- Verify columns
SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'clients'
AND COLUMN_NAME IN ('company_logo', 'signature_logo');
