# 🚀 XAMPP Import - 3 Minutes to Setup

## File Ready: `MYSQL_SCHEMA_id_card.sql`

---

## ⚡ Fastest Way (phpMyAdmin)

### Steps:

1. **Start MySQL in XAMPP**
   - Open XAMPP Control Panel
   - Click Start next to MySQL
   - Wait for green "Running" status

2. **Open phpMyAdmin**
   - Click "Admin" button next to MySQL
   - Or go to: http://localhost/phpmyadmin

3. **Import Schema**
   - Top menu → **Import** tab
   - Click **Choose File**
   - Select: `MYSQL_SCHEMA_id_card.sql`
   - Click **Import** button
   - ✅ Done!

4. **Verify**
   - Left sidebar → Click `id_card`
   - Should show **13 tables**

---

## 📝 Connection for Your App

### Update your `.env` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=id_card
DATABASE_URL=mysql://root:@localhost:3306/id_card
```

### Or in your code:

```javascript
const mysql = require('mysql2/promise');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card'
});
```

---

## ✅ Tables Created

1. profiles
2. user_roles
3. vendors
4. vendor_staff
5. admin_staff
6. projects
7. project_tasks
8. project_assignments
9. items
10. products
11. clients
12. complaints
13. transactions

---

## 🎯 Next Steps

1. ✅ Import `MYSQL_SCHEMA_id_card.sql`
2. ✅ Update `.env` with `DATABASE_URL=mysql://root:@localhost:3306/id_card`
3. ✅ Restart your application
4. ✅ Test database connection

---

**Status:** ✅ Ready to import!
