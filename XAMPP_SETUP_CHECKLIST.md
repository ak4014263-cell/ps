# ✅ XAMPP MySQL Setup Checklist - id_card Database

## Connection String
```
DATABASE_URL=mysql://root:@localhost:3306/id_card
```

---

## 📋 Setup Steps

### Step 1: Start XAMPP MySQL
- [ ] Open XAMPP Control Panel
- [ ] Click **Start** next to MySQL
- [ ] Verify green "Running" status

### Step 2: Import Database Schema
- [ ] Open phpMyAdmin (http://localhost/phpmyadmin)
- [ ] Click **Import** tab
- [ ] Select `MYSQL_SCHEMA_id_card.sql`
- [ ] Click **Import** button
- [ ] Verify `id_card` appears in left sidebar

### Step 3: Verify 13 Tables Created
- [ ] profiles
- [ ] user_roles
- [ ] vendors
- [ ] vendor_staff
- [ ] admin_staff
- [ ] projects
- [ ] project_tasks
- [ ] project_assignments
- [ ] items
- [ ] products
- [ ] clients
- [ ] complaints
- [ ] transactions

### Step 4: Update Configuration
- [ ] `.env.local` already created with DATABASE_URL
- [ ] Other config files: `db-config.js`, `test-db-connection.js`

### Step 5: Test Connection
```bash
node test-db-connection.js
```

Expected: ✅ ALL TESTS PASSED!

### Step 6: Start Application
```bash
npm run dev        # Frontend (React)
npm start          # Backend (Node.js)
```

---

## 🔗 Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Environment variables |
| `db-config.js` | Database connection for Node.js |
| `test-db-connection.js` | Connection test script |
| `MYSQL_SCHEMA_id_card.sql` | Database schema |

---

## 🎯 Quick Commands

```bash
# Test database connection
node test-db-connection.js

# Start frontend
npm run dev

# Start backend (if applicable)
npm start

# MySQL CLI (if installed)
mysql -u root
USE id_card;
SHOW TABLES;
```

---

## ✨ You're All Set!

Your XAMPP MySQL database is configured and ready to use with your Remix Crystal Admin application.

**Database:** id_card  
**Status:** ✅ Ready  
**Connection:** mysql://root:@localhost:3306/id_card
