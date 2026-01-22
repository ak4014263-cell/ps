-- Increase column sizes for logo storage
ALTER TABLE clients MODIFY COLUMN company_logo LONGTEXT;
ALTER TABLE clients MODIFY COLUMN signature_logo LONGTEXT;
