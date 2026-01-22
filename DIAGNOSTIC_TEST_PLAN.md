# Dashboard & Project Creation Test Guide

## Issue 1: Dashboard Shows All Vendors' Data (Vendor Should See Only Own)

### Expected Behavior for Vendor User:
1. User logs in as vendor
2. Dashboard renders
3. Dashboard queries vendor-profile to get vendor_id
4. Dashboard queries dashboard-stats with `enabled: !!vendorData?.id || !isVendor`
5. Stats query fetches ONLY vendor's clients via `apiService.clientsAPI.getByVendor(vendorId)`
6. Stats query fetches all projects, then filters by `vendor_id === vendorId`
7. Dashboard shows only vendor's counts

### Current Issue:
- Vendor sees all clients in the system (not just their own)
- Vendor sees all projects (not just their own)

### Root Cause Analysis:
- The enabled condition might not be working properly
- OR vendorData?.id might be null/undefined
- OR response data structure might be different than expected
- OR filtering is not happening

---

## Issue 2: Vendor Unable to Create Projects

### Expected Behavior for Vendor User:
1. User opens Projects page
2. Clicks "New Project" button
3. Dialog opens with form
4. Form loads vendor data via profile lookup
5. Form loads client dropdown populated from `apiService.clientsAPI.getByVendor(vendorId)`
6. User fills in project_name (client now optional)
7. User clicks "Create Project"
8. Frontend calls `apiService.projectsAPI.create()` with vendor_id
9. Backend validates vendor_id is provided
10. Project is created successfully
11. Query cache invalidated, projects list refreshes

### Current Issue:
- Projects not being created
- Possible symptoms:
  - Client dropdown is empty
  - Button shows "Loading vendor..." indefinitely
  - Form validation fails
  - Network request fails

### Root Cause Analysis:
- vendor data lookup failing
- Client loading query failing
- Form submission failing
- Network error from backend

---

## Test Plan

### Prerequisites:
- Backend running on localhost:5000
- Frontend running on localhost:8080
- MySQL running with id_card database populated

### Step 1: Verify Database State
```sql
SELECT COUNT(*) as vendor_count FROM vendors;
SELECT COUNT(*) as client_count FROM clients;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as profile_count FROM profiles WHERE vendor_id IS NOT NULL;
```

### Step 2: Manual API Tests
1. GET http://localhost:5000/api/vendors → Should get vendor list
2. GET http://localhost:5000/api/profiles/{user_id} → Should get profile with vendor_id
3. GET http://localhost:5000/api/clients/vendor/{vendor_id} → Should get vendor's clients
4. POST http://localhost:5000/api/projects → Should create project with vendor_id

### Step 3: Frontend Manual Test
1. Open http://localhost:8080/admin
2. Login as vendor user
3. Check dashboard stats - should show only vendor's data
4. Go to Projects page
5. Click "New Project"
6. Check console for logs about vendor/client loading
7. Try to create project
8. Check if project appears in list

### Step 4: Browser Developer Tools
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by API requests
4. Watch for:
   - /api/profiles/{id} responses
   - /api/clients/vendor/{id} responses
   - /api/projects POST request and response

### Step 5: Backend Logs
1. Check terminal running backend server
2. Look for API request logs
3. Check if getByVendor endpoint is being called
4. Check if projects are being created

---

## Key Questions to Answer

1. Is vendor_id being extracted properly from user profile?
2. Are the API endpoints returning correct data structures?
3. Is the frontend correctly parsing the response?
4. Is the React Query enabled condition working?
5. Is the filtering logic working?
6. Is the project creation request including vendor_id?

