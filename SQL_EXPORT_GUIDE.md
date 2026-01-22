# Complete SQL Database Export Guide

## 📊 What You Have

Your Supabase database has been exported to SQL format:

### Files Created
1. **`DATABASE_COMPLETE_SCHEMA.sql`** - Complete schema with all tables, indexes, RLS policies, and triggers
2. **`DATABASE_MIGRATION_GUIDE.md`** - Migration instructions for different databases
3. **`MIGRATION_SYNC_GUIDE.md`** - Sync guide for migration history management

## 🎯 How to Use the SQL Export

### Option 1: PostgreSQL (Recommended - 100% Compatible)

**Best for:** Production databases, self-hosted servers, cloud databases

```bash
# If you have psql installed:
psql -h localhost -U postgres -d your_database -f DATABASE_COMPLETE_SCHEMA.sql

# Or using Docker:
docker exec -i postgres_container psql -U postgres -d database < DATABASE_COMPLETE_SCHEMA.sql

# Or using a GUI tool like pgAdmin/DBeaver:
# 1. Open your PostgreSQL connection
# 2. Right-click database → Query Tool
# 3. File → Open → Select DATABASE_COMPLETE_SCHEMA.sql
# 4. Execute query
```

**Connection String for .env:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

### Option 2: MySQL / MariaDB

**Compatibility: 70-80%** - Requires SQL conversions

```bash
# Export from Supabase (PostgreSQL)
# Then convert using migration tool or manually

# Quick conversion needed:
# - UUID → CHAR(36) or VARCHAR(36)
# - TIMESTAMPTZ → DATETIME
# - JSONB → JSON
# - Drop RLS policies (implement in app layer)
# - Convert trigger syntax

mysql -h localhost -u root -p database_name < converted_schema.sql
```

**Convert UUID types example:**
```sql
-- Before (PostgreSQL)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- After (MySQL)
id CHAR(36) PRIMARY KEY DEFAULT (UUID())
```

### Option 3: SQL Server

**Compatibility: 65-75%**

```bash
# Using sqlcmd (SQL Server command-line)
sqlcmd -S server_name -U sa -P password -d database_name -i DATABASE_COMPLETE_SCHEMA.sql

# Or using Azure Data Studio:
# 1. File → New Query
# 2. Paste contents of DATABASE_COMPLETE_SCHEMA.sql
# 3. Execute
```

**Type conversions:**
```sql
-- PostgreSQL → SQL Server
UUID → UNIQUEIDENTIFIER
TIMESTAMPTZ → DATETIMEOFFSET
TEXT → NVARCHAR(MAX)
BOOLEAN → BIT
```

### Option 4: SQLite

**Compatibility: 50%** - Good for development/testing only

```bash
# Convert and import:
sqlite3 database.db < converted_schema.sql

# Or using SQLiteStudio GUI:
# 1. Tools → Open SQL Editor
# 2. File → Open → Select converted schema
# 3. Execute
```

**Significant changes needed:**
```sql
-- No native ENUM support
CREATE TABLE IF NOT EXISTS app_role_enum (
  value TEXT PRIMARY KEY
);
INSERT INTO app_role_enum VALUES ('super_admin'), ('master_vendor'), ...;

-- No UUID support
id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))

-- No TIMESTAMPTZ
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

## 📋 Database Structure Overview

### Tables (13 total)

#### Authentication & User Management
- **profiles** - User profile information
- **user_roles** - User role assignments

#### Vendor Management
- **vendors** - Vendor/company information
- **vendor_staff** - Staff members employed by vendors
- **admin_staff** - System administrators

#### Project Management
- **projects** - Client projects
- **project_tasks** - Individual project tasks
- **project_assignments** - Staff assignments to projects

#### Products & Inventory
- **items** - Inventory items
- **products** - Saleable products

#### Client Management
- **clients** - Client/customer records
- **complaints** - Customer complaints/issues

#### Financial
- **transactions** - Financial transactions & payments

### Enums (3 total)

```sql
app_role (9 values)
├── super_admin
├── master_vendor
├── vendor_staff
├── designer_staff
├── data_operator
├── sales_person
├── accounts_manager
├── production_manager
└── client

project_status (9 values)
├── draft
├── data_upload
├── design
├── proof_ready
├── approved
├── printing
├── dispatched
├── delivered
└── cancelled

payment_status (4 values)
├── pending
├── partial
├── completed
└── refunded
```

## 🔐 Security Features Included

### Row Level Security (RLS)
- Users see only their own profiles
- Vendors see only their own data
- Clients see only relevant projects
- Staff see only authorized information

### Indexes (23 total)
- Foreign key relationships indexed
- Status columns indexed for filtering
- Email columns indexed for lookups
- Category columns indexed for searches

### Data Integrity
- UUID primary keys for global uniqueness
- Foreign key constraints with CASCADE deletes
- NOT NULL constraints on required fields
- UNIQUE constraints for business logic

### Audit Trail
- Auto-updated `created_at` timestamps
- Auto-updated `updated_at` timestamps on changes
- `created_by` fields track creation source

## 🚀 Migration Steps

### Step 1: Prepare
```powershell
# Backup your current database if it exists
# Windows PowerShell
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

# PostgreSQL backup
pg_dump your_database > backup_$timestamp.sql

# MySQL backup
mysqldump -u user -p database_name > backup_$timestamp.sql
```

### Step 2: Create New Database
```sql
-- PostgreSQL
CREATE DATABASE new_database_name;
GRANT ALL PRIVILEGES ON DATABASE new_database_name TO username;

-- MySQL
CREATE DATABASE new_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON new_database_name.* TO 'username'@'localhost';

-- SQL Server
CREATE DATABASE new_database_name;
```

### Step 3: Import Schema
```bash
# PostgreSQL
psql -h localhost -U user -d new_database_name -f DATABASE_COMPLETE_SCHEMA.sql

# MySQL
mysql -h localhost -u user -p new_database_name < converted_schema.sql

# SQL Server
sqlcmd -S server -U user -P password -d database -i schema.sql
```

### Step 4: Verify Tables
```sql
-- PostgreSQL/MySQL
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- SQL Server
SELECT name FROM sys.tables;

-- SQLite
.tables
```

### Step 5: Verify Schema
```sql
-- Check all tables created (should be 13)
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Check all indexes created
SELECT COUNT(*) as index_count FROM information_schema.statistics 
WHERE table_schema = 'public';

-- Check RLS policies are in place
SELECT schemaname, tablename, policyname FROM pg_policies;
```

### Step 6: Migrate Data (if transitioning from Supabase)
```bash
# Export data from Supabase
pg_dump -h db.your-project.supabase.co -U postgres -d postgres \
  -h your-db-host --data-only > supabase_data.sql

# Import to new database
psql -h new-host -U user -d new-database -f supabase_data.sql
```

## ⚙️ Configuration for Applications

### Node.js / TypeORM

```typescript
import { createConnection } from 'typeorm';

const connection = await createConnection({
  type: 'postgres',  // or 'mysql', 'mssql', 'sqlite'
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false,  // Use migrations instead
  logging: true,
});
```

### .env Configuration

```env
# PostgreSQL (Self-hosted)
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=database_name

# MySQL
DATABASE_URL=mysql://user:password@localhost:3306/database_name

# SQL Server
DATABASE_URL=mssql://user:password@localhost:1433/database_name?encrypt=true

# SQLite (Local Dev)
DATABASE_URL=sqlite:./local.db
```

## 🐳 Docker Setup

### PostgreSQL in Docker

```bash
# Run PostgreSQL container
docker run --name postgres-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=your_database \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:15

# Import schema
docker exec -i postgres-db psql -U postgres -d your_database < DATABASE_COMPLETE_SCHEMA.sql
```

### MySQL in Docker

```bash
docker run --name mysql-db \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=your_database \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  -d mysql:8.0

# Import schema
docker exec -i mysql-db mysql -u root -p your_password your_database < schema.sql
```

## 📊 Verification Checklist

- [ ] Database created successfully
- [ ] All 13 tables created
- [ ] All 3 enums created
- [ ] All 23 indexes created
- [ ] RLS policies enabled (PostgreSQL)
- [ ] Triggers created and working
- [ ] Foreign key constraints verified
- [ ] Sample data inserted successfully
- [ ] Queries execute without errors
- [ ] Performance acceptable (run EXPLAIN on key queries)
- [ ] Backups created before migration
- [ ] Application connected to new database
- [ ] All tests passing with new database

## 🆘 Troubleshooting

### Error: "Type UUID does not exist"
**Solution:** PostgreSQL extension not loaded
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "Enum type does not exist"
**Solution:** Create enums before tables that reference them
```sql
CREATE TYPE public.app_role AS ENUM (...)
```

### Error: "Foreign key constraint violated"
**Solution:** Insert data in correct order (parents before children)
```
profiles → user_roles
vendors → vendor_staff, items, products, projects
clients → projects
```

### Error: "Trigger not created"
**Solution:** Ensure trigger function exists first
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()...
CREATE TRIGGER trigger_name BEFORE UPDATE ON table_name...
```

### Performance Issue: "Queries running slow"
**Solution:** Missing indexes or statistics
```sql
-- PostgreSQL
ANALYZE;

-- MySQL
OPTIMIZE TABLE table_name;

-- SQL Server
UPDATE STATISTICS table_name;
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQL Server Documentation](https://learn.microsoft.com/en-us/sql/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Supabase Migration Guide](https://supabase.com/docs/guides/database)

## 🎯 Next Steps

1. **Choose your target database** (PostgreSQL recommended)
2. **Create a new database instance** in your infrastructure
3. **Run the schema export** to set up tables and structure
4. **Migrate data** from Supabase if needed
5. **Update application connection** strings
6. **Test thoroughly** before going to production
7. **Set up backup procedures** for new database
8. **Monitor performance** and optimize as needed

---

**Export Date:** January 10, 2026  
**Database:** Supabase PostgreSQL (jkcdwxkqzohibsxglhyk)  
**Schema Version:** Complete (23 migrations)  
**Status:** ✅ Ready for migration
