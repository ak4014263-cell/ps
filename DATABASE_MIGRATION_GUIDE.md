# Database Migration Guide - SQL Export & Transfer

## Overview

This guide explains how to export your Supabase PostgreSQL database to SQL format and migrate it to other SQL databases.

## Your Current Database Setup

**Current Database:** Supabase (PostgreSQL)  
**Total Migrations:** 22 migration files  
**Latest Tables:** vendor_staff, admin_staff (with permissions)  
**Status:** Production-ready schema

## Option 1: Export Supabase to SQL (Recommended)

### Method A: Using Supabase CLI

```bash
# Link your project
supabase link --project-ref your-project-ref

# Pull database schema
supabase db pull

# This creates: supabase/schema.sql with complete schema
```

### Method B: Using psql (Direct PostgreSQL Export)

```bash
# Get your Supabase connection string from: Dashboard → Settings → Database
# It looks like: postgresql://user:password@host:5432/postgres

export DATABASE_URL="postgresql://user:password@your-host.supabase.co:5432/postgres"

# Export complete schema
pg_dump $DATABASE_URL > database_backup.sql

# Export schema only (no data)
pg_dump --schema-only $DATABASE_URL > database_schema_only.sql

# Export data only
pg_dump --data-only $DATABASE_URL > database_data_only.sql
```

### Method C: Via Supabase Dashboard

1. Go to: Supabase Dashboard → Project Settings → Database
2. Click "Backup" → "Download"
3. This downloads your complete database as SQL

## Option 2: Manual SQL Compilation

All your migrations are SQL files in `supabase/migrations/`. Combine them:

```bash
# Linux/Mac
cat supabase/migrations/*.sql > combined_schema.sql

# PowerShell (Windows)
Get-Content supabase/migrations/*.sql | Out-File combined_schema.sql -Encoding UTF8
```

## Migration Steps to Different SQL Databases

### PostgreSQL (Easiest)

```bash
# If Supabase (already PostgreSQL):
# 1. Get SQL dump:
pg_dump postgresql://user:pass@host:port/db > backup.sql

# 2. Restore to new PostgreSQL:
psql -h new-host -U new-user -d new-database -f backup.sql

# All tables, RLS policies, functions, triggers migrate perfectly
```

### MySQL

**Compatibility: 70-80%** - Missing native RLS, JSONB support

```bash
# Export with MySQL format:
mysqldump -h source-host -u user -p database > backup.sql

# Key changes needed in SQL:
# 1. UUID → CHAR(36)
# 2. JSONB → JSON
# 3. Remove RLS policies
# 4. Adjust trigger syntax
# 5. Remove Supabase-specific functions

# Restore:
mysql -h target-host -u user -p target-database < backup.sql
```

**Required adaptations:**

```sql
-- PostgreSQL (Current)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- MySQL (Convert to)
id CHAR(36) PRIMARY KEY DEFAULT (UUID())
```

### SQLite

**Compatibility: 50%** - Limited features, good for dev/testing

```bash
# Export PostgreSQL → SQLite:
# Using pgloader (recommended):
pgloader postgresql://user:pass@host/db sqlite:///target.db

# Or manual conversion needed for:
# - UUID types
# - JSONB handling
# - No RLS support
```

### SQL Server

**Compatibility: 65%** - Good JSONB support, different RLS

```bash
# Using Azure Data Studio or SSMS:
# 1. Use "Import Data" wizard
# 2. Source: PostgreSQL connection
# 3. Target: SQL Server
# 4. Schema migration tool will handle most conversions

-- Convert types:
-- UUID → UNIQUEIDENTIFIER
-- JSONB → NVARCHAR(MAX) with JSON_VALUE()
-- Triggers → T-SQL syntax
```

## Your Current Schema Summary

### Core Tables

```sql
-- User Management
profiles (id, full_name, email, phone, created_at, updated_at)
user_roles (user_id, role, created_at)

-- Vendor Management
vendors (id, user_id, business_name, description, ... , created_at, updated_at)
vendor_staff (id, vendor_id, user_id, role, permissions, active, created_at, updated_at)
admin_staff (id, admin_user_id, staff_user_id, role, permissions, active, created_at, updated_at)

-- Projects & Tasks
projects (...)
project_tasks (...)
project_assignments (...)

-- Products & Inventory
items (...)
products (...)

-- Transactions
transactions (...)

-- Additional tables per your migrations (20+ total)
```

### Key Features to Preserve

1. **UUID Primary Keys** - Use for data integrity
2. **JSONB Permissions** - Store flexible permission arrays
3. **RLS Policies** - Security at database level
4. **Triggers** - Auto-update timestamps
5. **Cascade Deletes** - Foreign key constraints

## Step-by-Step Migration Plan

### For Staying with PostgreSQL (Recommended)

```
Step 1: Export from Supabase
  supabase db pull
  
Step 2: Get SQL file
  Option A: supabase/schema.sql (via CLI)
  Option B: pg_dump (via psql)
  Option C: Dashboard download
  
Step 3: Create new PostgreSQL database
  createdb new_database
  
Step 4: Restore schema
  psql -U user -d new_database -f schema.sql
  
Step 5: Verify tables
  psql -U user -d new_database -c "\dt"
  
Step 6: Update connection string in app
  Update .env with new database URL
```

### For Migrating to MySQL

```
Step 1: Export PostgreSQL
  pg_dump postgresql://... > backup.sql
  
Step 2: Convert SQL syntax
  - Replace UUID types
  - Simplify JSONB queries
  - Remove RLS policies
  - Convert triggers
  
Step 3: Create MySQL database
  CREATE DATABASE new_database;
  
Step 4: Import converted SQL
  mysql -u user -p new_database < backup.sql
  
Step 5: Test data integrity
  Compare table counts, row counts
  
Step 6: Update app connection
  Update .env with MySQL connection string
```

## Backup & Disaster Recovery

### Regular Backups

```bash
# Automated daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump postgresql://user:pass@host/db > backups/backup_$DATE.sql
gzip backups/backup_$DATE.sql

# Keep only last 30 days
find backups -name "backup_*.sql.gz" -mtime +30 -delete
```

### Point-in-Time Recovery

```bash
# PostgreSQL PITR setup:
# 1. Enable WAL archiving in postgresql.conf
# 2. Regularly backup WAL files
# 3. Restore: pg_restore with --transaction-isolation

# Supabase handles this automatically
# Backups available: 7 days (free), 30 days (pro)
```

## Data Export Formats

### Complete Database Dump
```bash
pg_dump -Fc postgresql://... > backup.dump
# Can restore individual tables/objects as needed
```

### SQL Format (Text)
```bash
pg_dump -Fp postgresql://... > backup.sql
# Human-readable, can edit before restore
```

### CSV Export (For Analysis/Reporting)
```bash
psql postgresql://... -c "COPY table_name TO STDOUT WITH CSV HEADER" > data.csv
```

### JSON Export
```bash
psql postgresql://... -c "SELECT jsonb_pretty(jsonb_agg(row_to_json(t))) FROM table_name t" > data.json
```

## Verification After Migration

### Check Table Structure
```sql
-- PostgreSQL
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
SELECT * FROM information_schema.columns WHERE table_name = 'vendor_staff';

-- MySQL
SELECT * FROM information_schema.tables WHERE table_schema = DATABASE();
DESCRIBE vendor_staff;

-- SQLite
.tables
PRAGMA table_info(vendor_staff);
```

### Verify Data Integrity
```sql
-- Count rows in key tables
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM vendor_staff;
SELECT COUNT(*) FROM admin_staff;
SELECT COUNT(*) FROM projects;

-- Check for orphaned records
SELECT * FROM vendor_staff WHERE vendor_id NOT IN (SELECT id FROM vendors);

-- Verify permissions are valid JSON
SELECT staff_user_id, permissions FROM admin_staff WHERE permissions::jsonb IS NULL;
```

### Test Application Queries
```sql
-- Test vendor staff permissions fetch
SELECT u.id, u.email, vs.permissions 
FROM admin_staff vs
JOIN profiles u ON vs.staff_user_id = u.id
WHERE vs.admin_user_id = 'admin-id';

-- Test vendor isolation
SELECT * FROM vendor_staff vs
JOIN profiles p ON vs.user_id = p.id
WHERE vs.vendor_id = 'vendor-id';
```

## Application Connection String Updates

### .env.local Updates

```env
# PostgreSQL (Supabase)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://user:password@localhost:5432/database

# MySQL
DATABASE_URL=mysql://user:password@localhost:3306/database

# SQL Server
DATABASE_URL=mssql://user:password@localhost:1433/database?encrypt=true

# SQLite (Local Dev)
DATABASE_URL=file:./local.db
```

### TypeORM Connection (If Used)
```typescript
import { createConnection } from 'typeorm';

const connection = await createConnection({
  type: 'postgres',  // or 'mysql', 'mssql', 'sqlite'
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'database',
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false,
});
```

## Troubleshooting

### Issue: "Unknown type: JSONB"
**Solution:** MySQL doesn't support JSONB, use JSON instead
```sql
-- PostgreSQL
permissions JSONB

-- MySQL
permissions JSON
```

### Issue: "RLS policies not supported"
**Solution:** Implement RLS logic in application layer
```typescript
// Check permissions in app
const hasPermission = (userPermissions: string[], section: string) => {
  return userPermissions.includes(section);
};
```

### Issue: "UUID type unknown"
**Solution:** Convert to VARCHAR(36) for compatibility
```sql
-- PostgreSQL
id UUID PRIMARY KEY

-- MySQL/SQLite
id VARCHAR(36) PRIMARY KEY
```

### Issue: "Trigger syntax error"
**Solution:** Each database has different trigger syntax
```sql
-- PostgreSQL
CREATE TRIGGER update_timestamp
BEFORE UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- MySQL
CREATE TRIGGER update_timestamp
BEFORE UPDATE ON table_name
FOR EACH ROW
SET NEW.updated_at = CURRENT_TIMESTAMP;
```

## Migration Checklist

- [ ] Backup current Supabase database
- [ ] Choose target database (PostgreSQL recommended)
- [ ] Export schema using appropriate method
- [ ] Review SQL for compatibility issues
- [ ] Create new database instance
- [ ] Import schema
- [ ] Verify table structure
- [ ] Verify data integrity
- [ ] Test key queries
- [ ] Update app connection string
- [ ] Test application functionality
- [ ] Monitor for errors
- [ ] Schedule regular backups

## Recommended Approach

**Best Option: Stay with PostgreSQL**

Why:
- ✅ 100% schema compatibility
- ✅ Full JSONB support
- ✅ Native RLS policies
- ✅ Best performance for your schema
- ✅ All features work without modification
- ✅ Can use Supabase or self-hosted

**For Self-Hosted PostgreSQL:**

```bash
# Using Docker
docker run --name postgres_db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=database \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15

# Restore
psql -h localhost -U postgres -d database -f backup.sql
```

## Support Resources

- Supabase Docs: https://supabase.com/docs/guides/database
- PostgreSQL Docs: https://www.postgresql.org/docs/
- MySQL Docs: https://dev.mysql.com/doc/
- Database Migration Tools: https://www.sqlalchemy.org/

---

**Last Updated:** January 10, 2026  
**Database Type:** PostgreSQL (Supabase)  
**Schema Version:** 1.0 (22 migrations)
