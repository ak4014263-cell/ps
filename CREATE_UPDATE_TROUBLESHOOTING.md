# CREATE/UPDATE OPERATIONS TROUBLESHOOTING

## Current Status

### ✅ What Should Work
- **Create Client**: Calls `POST /api/clients`
- **Create Project**: Calls `POST /api/projects`
- **Create Task**: Calls `POST /api/project-tasks`
- **Create Template**: Calls `POST /api/templates`

### ⚠️ What Needs Backend Support
- **Create Staff**: No backend endpoint yet
- **Update Operations**: Some endpoints may need PUT implementation
- **Delete Operations**: May need verification

---

## Testing Your API

### Step 1: Check if Backend is Running
```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Should show: Server running on port 5000

# Terminal 2 - API Test
node test-api-connectivity.js
```

### Step 2: Manual API Test
```bash
# Test creating a client
curl -X POST http://localhost:5000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Client",
    "company": "Test Co",
    "phone": "555-1234",
    "email": "test@example.com",
    "vendor_id": "your-vendor-id"
  }'
```

---

## Common Issues & Solutions

### Issue 1: "Failed to add client" - No error message
**Cause**: API endpoint not responding
**Solution**:
1. Check backend is running: `npm run dev:backend`
2. Check port 5000 is available
3. Check MySQL is running (port 3306)
4. Review backend logs for errors

### Issue 2: "Failed to add client" - 500 error
**Cause**: Database or query error
**Solution**:
1. Check MySQL is running: `mysql -u root -p id_card`
2. Verify tables exist: `SHOW TABLES;`
3. Check backend logs for SQL errors
4. Verify vendor_id exists in database

### Issue 3: "Failed to add client" - 400 error
**Cause**: Missing required fields
**Solution**:
1. Check console log to see what was sent
2. Verify client_name and vendor_id are included
3. Ensure fields match database schema

### Issue 4: "Vendor not found" on Staff page
**Cause**: User profile doesn't have vendor_id
**Solution**:
1. Check user auth is working (login again)
2. Verify user has vendor_id in profiles table
3. Check browser console for detailed errors

---

## Database Schema Verification

Run these SQL commands in MySQL to verify tables exist:

```sql
-- Check if tables exist
SHOW TABLES;

-- Check clients table structure
DESCRIBE clients;

-- Check if your vendor exists
SELECT id, business_name FROM vendors LIMIT 5;

-- Check user profiles
SELECT id, full_name, email FROM profiles LIMIT 5;
```

---

## Browser Console Debugging

1. Open DevTools (F12)
2. Go to Network tab
3. Try creating a client
4. Look for failed requests (red)
5. Click on the failed request
6. Check Response tab for error message

Example error responses:
```json
{
  "success": false,
  "error": "client_name is required"
}
```

---

## Frontend API Service Debug

Add this to browser console to test API directly:

```javascript
// Test API service
const { apiService } = await import('http://localhost:5000/api');

// Create test client
await apiService.clientsAPI.create({
  client_name: 'Test',
  vendor_id: 'your-vendor-id'
});
```

---

## Checklist

- [ ] Backend running on port 5000
- [ ] MySQL running on port 3306
- [ ] Database `id_card` exists
- [ ] Tables: clients, projects, project_tasks, templates exist
- [ ] User is logged in
- [ ] User has vendor_id in profiles table
- [ ] Browser can reach http://localhost:5000/api/health
- [ ] No CORS errors in browser console
- [ ] Form fields are not empty
- [ ] vendor_id is being sent with requests

---

## Still Having Issues?

1. **Check backend logs**: Look for error messages in terminal
2. **Check browser console**: F12 → Console tab
3. **Check Network tab**: F12 → Network → look for red requests
4. **Test with curl**: Verify API responds outside browser
5. **Review database**: Verify tables and data exist

---

## For Staff Creation

Staff creation requires a dedicated backend endpoint. For now:
- Form is available but shows info message
- Data is logged to console but not saved
- Need to implement: `POST /api/staff` or `POST /api/users`

To enable staff creation:
1. Create backend route: `backend/routes/staff.js`
2. Add endpoints for CREATE, READ, UPDATE, DELETE
3. Update `src/lib/api.ts` to call the new endpoint
4. Remove the [TODO] logs from Staff.tsx
