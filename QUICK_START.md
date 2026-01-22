# 🚀 QUICK START - Backend & Frontend Connected

## What You Have

✅ **Frontend** (React + Vite)
✅ **Backend** (Express.js)
✅ **Database** (XAMPP MySQL)
✅ **Connected** (Full-stack ready)

## Run Your Application (3 Steps)

### Step 1: Start XAMPP MySQL
- Open XAMPP Control Panel
- Click "Start" next to MySQL

### Step 2: Start Frontend
```bash
npm run dev
```
- Opens: http://localhost:8080

### Step 3: Start Backend
```bash
cd backend
npm run dev
```
- Runs on: http://localhost:5000
- API: http://localhost:5000/api

## Use in Your React Components

```typescript
import { apiClient } from '@/lib/apiClient';

// Get all vendors
const { data } = await apiClient.vendors.getAll();

// Get specific vendor
const vendor = await apiClient.vendors.getById(id);

// Search products
const products = await apiClient.products.search('electronics');

// Get vendor with products
const { vendor, products } = await apiClient.vendors.getWithProducts(id);
```

## Available API Endpoints

```
Profiles:  GET /api/profiles
Vendors:   GET /api/vendors
Clients:   GET /api/clients
Products:  GET /api/products
Projects:  GET /api/projects
Health:    GET /api/health
```

## Sample Data Included

- **3 User Profiles**
- **2 Vendors**
- **3 Clients**  
- **5 Products**
- **Ready to use!**

## Next: Replace Supabase Calls

### Before (Supabase):
```typescript
const { data } = await supabase
  .from('vendors')
  .select('*');
```

### After (Backend API):
```typescript
const { data } = await apiClient.vendors.getAll();
```

## Documentation Files

- `COMPLETE_SETUP_GUIDE.md` - Full architecture overview
- `BACKEND_INTEGRATION_GUIDE.md` - Detailed integration guide
- `SUPABASE_DISCONNECTION_GUIDE.md` - Supabase removal notes
- `DATA_MIGRATION_SUMMARY.md` - Database migration info

## Backend Structure

```
backend/
├── server.js           # Main server
├── db.js               # Database helpers
├── package.json
└── routes/
    ├── profiles.js
    ├── vendors.js
    ├── clients.js
    ├── products.js
    ├── projects.js
    └── health.js
```

## Database (MySQL)

- **Host**: localhost:3306
- **Database**: id_card
- **User**: root
- **Password**: (empty)
- **Tables**: 13
- **Records**: 16 sample records

## That's It!

Your full-stack application is ready to go! 🎉

1. Run frontend: `npm run dev`
2. Run backend: `cd backend && npm run dev`
3. Use API: `import { apiClient } from '@/lib/apiClient'`
4. Start building!

---

**Everything connected and working!** ✅
