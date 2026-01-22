# 🚀 XAMPP MySQL Setup Guide - Database: id_card

## ✅ Your MySQL Schema is Ready!

File: **`MYSQL_SCHEMA_id_card.sql`** - Ready to import into XAMPP

### What's Included
- ✅ 13 tables (profiles, vendors, projects, products, clients, etc.)
- ✅ All indexes for performance
- ✅ Foreign key relationships
- ✅ Auto-update timestamps
- ✅ JSON support for permissions

---

## 🎯 Quick Setup (2 Steps)

### Step 1: Open XAMPP Admin Panel

1. Start XAMPP Control Panel
2. Click **Start** next to MySQL
3. Wait for MySQL to show "Running" (green)
4. Click **Admin** button next to MySQL
   - This opens phpMyAdmin

### Step 2: Import the SQL Schema

#### Option A: Using phpMyAdmin (Easiest)

1. In phpMyAdmin, click **Import** (top menu)
2. Click **Choose File**
3. Select: `MYSQL_SCHEMA_id_card.sql`
4. Scroll down and click **Import**
5. ✅ Database created! Check left sidebar for `id_card`

#### Option B: Using MySQL Command Line

```bash
# Open Command Prompt or PowerShell

# Navigate to your MySQL bin folder (XAMPP installation)
cd "C:\xampp\mysql\bin"

# Connect to MySQL
mysql -u root

# Import the schema
mysql -u root id_card < "path\to\MYSQL_SCHEMA_id_card.sql"

# Verify tables created
mysql -u root id_card -e "SHOW TABLES;"
```

#### Option C: Using DBeaver or MySQL Workbench

1. Connect to your XAMPP MySQL server
   - Host: `localhost`
   - Port: `3306`
   - User: `root`
   - Password: (leave empty)
2. Right-click and create new database `id_card`
3. Select database
4. File → Open SQL Script → Select `MYSQL_SCHEMA_id_card.sql`
5. Execute

---

## 🔗 Connection Strings

### For Your Application

#### Node.js / Express
```javascript
const mysql = require('mysql2/promise');

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card',
  port: 3306
});
```

#### .env Configuration
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=id_card
DATABASE_URL=mysql://root:@localhost:3306/id_card
```

#### React/Frontend
```javascript
// API endpoint
const API_URL = 'http://localhost:3000/api'; // Your backend server

// Backend connects to:
// mysql://root:@localhost:3306/id_card
```

#### TypeORM (Node.js)
```typescript
import { createConnection } from 'typeorm';

const connection = await createConnection({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '',
  database: 'id_card',
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false
});
```

---

## ✅ Verify Setup

After importing, verify everything is working:

### In phpMyAdmin:
1. Left sidebar → Click `id_card` database
2. Should show **13 tables:**
   - profiles
   - user_roles
   - vendors
   - vendor_staff
   - admin_staff
   - projects
   - project_tasks
   - project_assignments
   - items
   - products
   - clients
   - complaints
   - transactions

### Via MySQL Command Line:
```bash
mysql -u root id_card -e "SHOW TABLES;"
mysql -u root id_card -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='id_card';"
```

Expected output: **13 tables**

---

## 📊 Database Structure

### Authentication Tables
```
profiles              - User profiles (email, name, phone, avatar)
user_roles           - User role assignments (admin, vendor, staff, client)
```

### Vendor Tables
```
vendors              - Vendor/company information
vendor_staff        - Staff members working for vendors
admin_staff         - System administrators
```

### Project Management
```
projects             - Client projects
project_tasks       - Tasks within projects
project_assignments - Staff assignments to projects
```

### Products & Inventory
```
items               - Inventory items (stock tracking)
products            - Saleable products
```

### Client Management
```
clients             - Client/customer records
complaints          - Customer complaints and issues
```

### Financial
```
transactions        - Financial transactions and payments
```

---

## 🔐 Default Security

### XAMPP MySQL Default Settings
- **Host:** localhost
- **User:** root
- **Password:** (empty)
- **Port:** 3306

⚠️ **For Development Only!** Before going to production:
1. Set a password for root user
2. Remove anonymous users
3. Use environment variables for credentials

---

## 🛠️ Common Tasks

### Add Sample Data

```sql
-- Add a profile
INSERT INTO profiles (id, full_name, email, phone, created_at, updated_at)
VALUES (UUID(), 'John Doe', 'john@example.com', '1234567890', NOW(), NOW());

-- Add a vendor
INSERT INTO vendors (id, user_id, business_name, email, created_at, updated_at)
VALUES (UUID(), NULL, 'Acme Corp', 'acme@example.com', NOW(), NOW());

-- Add a vendor staff member
INSERT INTO vendor_staff (id, vendor_id, user_id, role, active, created_at, updated_at)
VALUES (UUID(), (SELECT id FROM vendors LIMIT 1), (SELECT id FROM profiles LIMIT 1), 'manager', TRUE, NOW(), NOW());
```

### View Table Structure

```sql
-- See all columns in a table
DESCRIBE profiles;
DESCRIBE vendors;

-- Or in phpMyAdmin:
-- Click table name → Structure tab
```

### Check Indexes

```sql
-- View all indexes
SHOW INDEXES FROM profiles;
SHOW INDEXES FROM vendors;

-- Count indexes
SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema='id_card';
```

### Verify Foreign Keys

```sql
-- Check table constraints
SELECT * FROM information_schema.table_constraints 
WHERE constraint_schema='id_card' AND constraint_type='FOREIGN KEY';
```

---

## 🔧 Troubleshooting

### Error: "Database already exists"
```sql
-- Drop existing database first
DROP DATABASE IF EXISTS id_card;
-- Then import schema
```

### Error: "Access denied for user 'root'"
1. XAMPP MySQL not running → Start it in Control Panel
2. Wrong password → XAMPP default is empty password
3. Check connection settings in phpMyAdmin

### Error: "Table creation failed"
1. Check MySQL is running (should be green in XAMPP)
2. Try importing via phpMyAdmin instead of command line
3. Clear any previous partial import (DROP DATABASE id_card)

### MySQL not starting?
1. Check if port 3306 is already in use:
   ```bash
   netstat -ano | findstr :3306
   ```
2. Kill process using port 3306
3. Restart XAMPP MySQL

### Need to reset XAMPP MySQL?
```bash
# Stop XAMPP MySQL
# Delete folder: C:\xampp\data\mysql\
# Restart XAMPP MySQL (will recreate)
```

---

## 📚 Next Steps

1. ✅ Import `MYSQL_SCHEMA_id_card.sql` into XAMPP
2. ✅ Verify 13 tables created
3. ✅ Update your app's `.env` file:
   ```env
   DATABASE_URL=mysql://root:@localhost:3306/id_card
   ```
4. ✅ Connect your application to the database
5. ✅ Test database queries
6. ✅ Add sample data

---

## 📝 Important Notes

### Data Types Converted
| PostgreSQL | MySQL |
|-----------|-------|
| UUID | CHAR(36) |
| TIMESTAMPTZ | DATETIME |
| JSONB | JSON |
| SERIAL | AUTO_INCREMENT INT |
| BOOLEAN | BOOLEAN/TINYINT(1) |

### No RLS in MySQL
- PostgreSQL RLS policies removed
- Implement access control in your application layer
- Use user authentication and role checking

### Auto-Timestamps
- `created_at` → Set once on creation
- `updated_at` → Auto-updates on any change via `ON UPDATE CURRENT_TIMESTAMP`

### UUID Generation in MySQL
Use in your application:
```javascript
// Node.js
const { v4: uuidv4 } = require('uuid');
const id = uuidv4();

// SQL
INSERT INTO profiles (id, full_name, email) 
VALUES (UUID(), 'John', 'john@example.com');
```

---

## ✨ Features Ready to Use

✅ Complete user management system  
✅ Vendor and staff hierarchy  
✅ Project workflow management  
✅ Client relationship management  
✅ Inventory tracking  
✅ Product catalog  
✅ Financial transactions  
✅ Complaint management  
✅ Audit trail (timestamps)  
✅ JSON-based permissions system  

---

## 🎯 Quick Command Reference

```bash
# Start MySQL (XAMPP)
# Windows: Use XAMPP Control Panel → Start MySQL

# Access MySQL Command Line
mysql -u root

# Select database
USE id_card;

# Show all tables
SHOW TABLES;

# Show database info
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema='id_card';

# Exit
EXIT;
```

---

**Status:** ✅ **READY TO IMPORT**

Your MySQL schema is fully configured for XAMPP and ready to use!

**Next Action:** Open phpMyAdmin and import `MYSQL_SCHEMA_id_card.sql`
