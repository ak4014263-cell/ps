# Quick Test & Verification Guide

## Current Server Status
- **Backend:** Running on http://localhost:5000
- **Frontend:** Running on http://localhost:8080
- **Database:** MySQL id_card at localhost:3306

---

## Quick Test Checklist

### ✅ Pre-Flight Checks
- [ ] Backend terminal shows "🚀 Backend API Server Running"
- [ ] Frontend terminal shows "VITE ... ready"
- [ ] http://localhost:5000/api/health responds (200)
- [ ] http://localhost:8080 loads without errors

### ✅ Dashboard Test (Vendor Data Isolation)
1. [ ] Open Browser DevTools (F12) → Console tab
2. [ ] Login as vendor user
3. [ ] Navigate to Dashboard
4. [ ] Check console for logs containing "[Dashboard]" or "[AddProjectForm]"
5. [ ] Verify stats show: Clients, Ongoing Projects, Print Orders, Total Payments
6. [ ] ✅ PASS: Numbers match vendor's actual data only
7. [ ] ❌ FAIL: If shows all data from system, check logs for errors

**Expected Console Logs:**
```
✅ [Dashboard] Got vendor_id: abc123...
✅ [Dashboard] Stats query enabled
```

### ✅ Project Creation Test (Basic)
1. [ ] Open Browser DevTools (F12) → Console tab
2. [ ] Go to Projects page
3. [ ] Click "New Project" button
4. [ ] Check console for vendor lookup logs
5. [ ] Enter project name: "Test Project [timestamp]"
6. [ ] Leave client as "No Client" (optional)
7. [ ] Select status: "Draft"
8. [ ] Click "Create Project"
9. [ ] Check for success toast message
10. [ ] ✅ PASS: Project appears in list, success logs in console
11. [ ] ❌ FAIL: Check error logs in console

**Expected Console Logs:**
```
🔍 [AddProjectForm] Starting vendor lookup for user: xyz789...
📦 [AddProjectForm] Profile response: { data: { vendor_id: ... } }
✅ [AddProjectForm] Got vendor_id: abc123...
🔍 [AddProjectForm] Fetching clients for vendor: abc123...
📤 [AddProjectForm] Sending project creation payload: { project_name: ..., vendor_id: ..., client_id: null, ... }
✅ [AddProjectForm] Project created successfully: { data: { id: ... } }
```

### ✅ Project Creation Test (With Client)
1. [ ] Click "New Project" button
2. [ ] Enter project name
3. [ ] Select a client from dropdown
4. [ ] Fill in other optional fields (budget, description, etc.)
5. [ ] Click "Create Project"
6. [ ] ✅ PASS: Project created with client_id set
7. [ ] ❌ FAIL: Check dropdown population in console

---

## Troubleshooting Guide

### Problem: Dashboard shows all clients/projects (not vendor-filtered)
**Debug Steps:**
1. Open Console tab (F12)
2. Look for logs containing "vendor_id"
3. Check if vendor_id is being fetched:
   ```
   ✅ [Dashboard] Got vendor_id: <should see a UUID>
   ```
4. If NO vendor_id logs, vendor lookup is failing
5. Check if `profile.vendor_id` exists in database

**Fix:** Run database check
```
SELECT id, email, vendor_id FROM profiles WHERE id = '{current_user_id}';
```

### Problem: Project creation form stuck on "Loading vendor..."
**Debug Steps:**
1. Check if button is disabled with "Loading vendor..." text
2. Open Console tab (F12)
3. Look for logs starting with 🔍 [AddProjectForm]
4. If no logs, check Network tab for failed requests
5. Look for 404 or 500 errors on /api/profiles/{id}

**Fix:** Check if profile exists
```
SELECT id, email, vendor_id FROM profiles WHERE id = '{current_user_id}';
```

### Problem: Client dropdown is empty
**Debug Steps:**
1. Check console for logs:
   ```
   🔍 [AddProjectForm] Fetching clients for vendor: <vendor_id>
   📦 [AddProjectForm] Clients response: { data: [] }
   ```
2. If `data: []`, vendor has no clients
3. Check if clients exist in database for that vendor

**Fix:** Create a test client first or check vendor_id in database
```
SELECT COUNT(*) FROM clients WHERE vendor_id = '{vendor_id}';
```

### Problem: Project creation fails with error message
**Debug Steps:**
1. Note the exact error message shown
2. Check console for error logs:
   ```
   ❌ [AddProjectForm] Project creation failed: <error message>
   ```
3. Check Network tab → POST /api/projects → Response
4. Look for error details in response

**Common Errors:**
- `"vendor_id is required"` → vendorData.id is null, refresh page
- `"Failed to create project"` → Backend error, check backend logs
- `"Still loading vendor..."` → Wait for vendor to load, then try again

---

## Browser Console Quick Search

### Find Vendor Lookup Issues
```javascript
// Paste in Console to filter logs
console.log(document.querySelector('[data-testid="console"]')?.innerText.split('\n').filter(l => l.includes('vendor')));
```

Or just use Console filter:
1. Click filter icon (funnel)
2. Type: `[AddProjectForm]` or `[Dashboard]`
3. See only relevant logs

---

## API Direct Testing

### Test Vendor Profile Lookup
```bash
curl http://localhost:5000/api/profiles/{user_id}
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "vendor@example.com",
    "vendor_id": "vendor-uuid"
  }
}
```

### Test Client Loading
```bash
curl http://localhost:5000/api/clients/vendor/{vendor_id}
```

Expected response:
```json
{
  "success": true,
  "count": 3,
  "data": [
    { "id": "client-1", "client_name": "Client 1", "vendor_id": "vendor-uuid" },
    ...
  ]
}
```

### Test Project Creation
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Test Project",
    "vendor_id": "vendor-uuid",
    "client_id": null,
    "status": "draft"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "new-project-uuid",
    "project_name": "Test Project",
    "vendor_id": "vendor-uuid",
    "status": "draft"
  }
}
```

---

## Success Indicators ✅

- [ ] Dashboard shows vendor's data count (not system-wide)
- [ ] Project creation form loads without "Loading vendor..." delay
- [ ] Client dropdown populated (or shows "No clients available")
- [ ] Can create project with just name filled in
- [ ] Project appears in projects list after creation
- [ ] Console has no red error messages for [AddProjectForm] or [Dashboard]
- [ ] Backend logs show POST /api/projects with 201 response

---

