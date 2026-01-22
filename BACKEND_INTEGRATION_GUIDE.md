# 🚀 Backend Setup & Frontend Integration Guide

## ✅ Backend Setup Complete

### What Was Created

**Backend Folder Structure:**
```
backend/
├── server.js              # Main Express server
├── db.js                  # Database connection & helpers
├── package.json           # Dependencies
├── .env                   # Backend configuration
└── routes/
    ├── profiles.js        # Profile endpoints
    ├── vendors.js         # Vendor endpoints
    ├── clients.js         # Client endpoints
    ├── products.js        # Product endpoints
    ├── projects.js        # Project endpoints
    └── health.js          # Health check endpoint
```

### Backend Server Status

- ✅ **Running on**: http://localhost:5000
- ✅ **API Base**: http://localhost:5000/api
- ✅ **Database**: Connected (mysql://root:@localhost:3306/id_card)
- ✅ **CORS**: Enabled for frontend origins

## 🔗 API Endpoints

### Health Check
```
GET /api/health
```
Returns server and database status.

### Profiles
```
GET /api/profiles                    # Get all profiles
GET /api/profiles/:id                # Get profile by ID
GET /api/profiles/search/:email      # Search by email
```

### Vendors
```
GET /api/vendors                     # Get all vendors
GET /api/vendors/:id                 # Get vendor by ID
GET /api/vendors/:id/products        # Get vendor with products
GET /api/vendors/search/:name        # Search by name
```

### Clients
```
GET /api/clients                     # Get all clients
GET /api/clients/:id                 # Get client by ID
GET /api/clients/vendor/:vendorId    # Get clients by vendor
GET /api/clients/search/:name        # Search by name/email
```

### Products
```
GET /api/products                    # Get all products
GET /api/products/:id                # Get product by ID
GET /api/products/vendor/:vendorId   # Get vendor products
GET /api/products/category/:category # Get by category
GET /api/products/search/:query      # Search products
```

### Projects
```
GET /api/projects                    # Get all projects
GET /api/projects/:id                # Get project by ID
GET /api/projects/:id/tasks          # Get project with tasks
GET /api/projects/:id/assignments    # Get project assignments
GET /api/projects/search/:query      # Search projects
```

## 🔄 Frontend Integration

### 1. Using the API Client

The frontend has a built-in API client at `src/lib/apiClient.ts`.

**Import it in your components:**
```typescript
import { apiClient } from '@/lib/apiClient';
```

### 2. Example: Fetch All Vendors

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

export function VendorsList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.vendors.getAll()
      .then((response) => {
        setVendors(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading vendors...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {vendors.map((vendor) => (
        <div key={vendor.id}>
          <h3>{vendor.business_name}</h3>
          <p>{vendor.email}</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. Example: Fetch with Vendor Products

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

export function VendorDetail({ vendorId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiClient.vendors.getWithProducts(vendorId)
      .then((response) => {
        setData(response.data);
      });
  }, [vendorId]);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h2>{data.vendor.business_name}</h2>
      <h3>Products ({data.productCount})</h3>
      {data.products.map((product) => (
        <div key={product.id}>
          {product.product_name} - ${product.price}
        </div>
      ))}
    </div>
  );
}
```

### 4. Example: Search

```typescript
import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';

export function SearchProducts() {
  const [results, setResults] = useState([]);

  const handleSearch = async (query) => {
    const response = await apiClient.products.search(query);
    setResults(response.data);
  };

  return (
    <div>
      <input 
        onChange={(e) => handleSearch(e.target.value)} 
        placeholder="Search products..."
      />
      {results.map((product) => (
        <div key={product.id}>{product.product_name}</div>
      ))}
    </div>
  );
}
```

## 🔌 Running Both Frontend & Backend

### Terminal 1: Frontend (already running)
```bash
npm run dev
```
- Runs on: http://localhost:8080

### Terminal 2: Backend
```bash
cd backend
npm run dev    # Runs with auto-reload
# OR
npm start      # Regular run
```
- Runs on: http://localhost:5000

## 📊 Configuration

### Frontend Configuration (`.env.local`)
```
VITE_API_URL=http://localhost:5000
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend Configuration (`backend/.env`)
```
NODE_ENV=development
BACKEND_PORT=5000
DB_HOST=localhost
DB_NAME=id_card
```

## 🧪 Testing the Connection

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

### 2. Get All Vendors
```bash
curl http://localhost:5000/api/vendors
```

### 3. Search Products
```bash
curl http://localhost:5000/api/products/search/electronics
```

## 📈 Next Steps

### 1. **Update Page Components**
Replace Supabase queries with API client calls:

**Before:**
```typescript
const { data } = await supabase.from('vendors').select('*');
```

**After:**
```typescript
const { data } = await apiClient.vendors.getAll();
```

### 2. **Add More Endpoints**
Create additional routes in `backend/routes/` for:
- CREATE (POST)
- UPDATE (PUT)
- DELETE (DELETE)

### 3. **Add Authentication**
Implement JWT token validation in middleware

### 4. **Add Validation**
Add request validation for POST/PUT requests

### 5. **Add Error Handling**
Enhanced error responses and logging

## 🔐 Security Considerations

Currently:
- ✅ CORS enabled for frontend
- ✅ MySQL connection pooling
- ⚠️ No authentication (add JWT)
- ⚠️ No input validation (add validators)
- ⚠️ No rate limiting (add express-rate-limit)

For production:
1. Add JWT authentication
2. Validate all inputs
3. Add rate limiting
4. Enable HTTPS
5. Change MySQL password
6. Add environment-specific configs

## 📝 API Response Format

All API responses follow this format:

**Success (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

**Error (500):**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "Resource not found"
}
```

## 🚀 Quick Start

1. **Start backend**: 
   ```bash
   cd backend && npm run dev
   ```

2. **Start frontend** (already running):
   ```bash
   npm run dev
   ```

3. **Use in components**:
   ```typescript
   import { apiClient } from '@/lib/apiClient';
   ```

4. **Call API**:
   ```typescript
   const { data } = await apiClient.vendors.getAll();
   ```

---

**Status**: ✅ **Backend Connected to Frontend**

Your full-stack application is ready to use!
