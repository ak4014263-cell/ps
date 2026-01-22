# Admin vs Vendor Staff - Quick Reference

## Key Differences

| Feature | Admin Staff | Vendor Staff |
|---------|------------|--------------|
| **Created By** | Super Admin | Vendor |
| **Table** | `admin_staff` | `vendor_staff` |
| **Roles** | admin_staff, admin_manager, admin_support | vendor_staff, designer_staff, data_operator, sales_person, accounts_manager, production_manager |
| **Scope** | System-wide | Vendor-specific |
| **Permissions** | Dashboard, Vendors, Staff, Reports, Settings, Clients, Transactions, Complaints | Dashboard, Projects, Staff, Settings, Reports, Data Management, Transactions, Clients, Items, Products, Complaints, Print Orders |

## Quick Implementation Steps

### 1. Run Migration
```bash
supabase migration up
```

### 2. Deploy Edge Function
```bash
supabase functions deploy create-admin-staff
```

### 3. Update Files

Replace old `Staff.tsx`:
```bash
cp src/pages/StaffNew.tsx src/pages/Staff.tsx
```

### 4. Verify Imports

Make sure these files are updated:
- ✅ `src/lib/staffPermissions.ts` - Has `ADMIN_STAFF_PERMISSIONS` and `VENDOR_STAFF_PERMISSIONS`
- ✅ `src/components/project/StaffPermissionsSelector.tsx` - Has `staffType` parameter
- ✅ `src/pages/Staff.tsx` - Has both admin and vendor tabs

## Admin Staff Default Permissions

| Role | Default Permissions |
|------|-------------------|
| **admin_staff** | Dashboard, Vendors, Reports, Settings |
| **admin_manager** | Dashboard, Vendors, Staff, Reports, Settings |
| **admin_support** | Dashboard, Clients, Complaints, Transactions |

## Vendor Staff Default Permissions

| Role | Default Permissions |
|------|-------------------|
| **vendor_staff** | Dashboard, Projects, Settings |
| **designer_staff** | Dashboard, Projects, Data Management |
| **data_operator** | Data Management, Transactions |
| **sales_person** | Dashboard, Clients, Transactions, Reports |
| **accounts_manager** | Dashboard, Transactions, Reports |
| **production_manager** | Dashboard, Projects, Items, Print Orders |

## How It Works

### Super Admin Creates Admin Staff
```
Super Admin Login
    ↓
Staff Management → "System Admin Staff" tab
    ↓
Add Admin Staff Member
    ↓
Select role (admin_staff, admin_manager, admin_support)
    ↓
Customize permissions or use defaults
    ↓
Admin staff created in admin_staff table
    ↓
Admin staff logs in → sees only their permitted sections
```

### Vendor Creates Vendor Staff
```
Vendor Login
    ↓
Staff Management
    ↓
Add Vendor Staff Member
    ↓
Select role (vendor_staff, designer_staff, etc.)
    ↓
Customize permissions or use defaults
    ↓
Staff created in vendor_staff table
    ↓
Vendor staff logs in → sees only their permitted sections
```

## Key Files

### New Migration
- `supabase/migrations/20260110150000_create_admin_staff_table.sql`

### New Edge Function
- `supabase/functions/create-admin-staff/index.ts`

### Updated Components
- `src/pages/Staff.tsx` (or `StaffNew.tsx`)
- `src/lib/staffPermissions.ts`
- `src/components/project/StaffPermissionsSelector.tsx`

## API Endpoints

### Create Vendor Staff
```
POST /functions/v1/create-user
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "email": "staff@vendor.com",
  "password": "password",
  "fullName": "John Doe",
  "role": "vendor_staff",
  "permissions": ["dashboard", "projects", "settings"],
  "staffType": "vendor"
}
```

### Create Admin Staff
```
POST /functions/v1/create-admin-staff
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "email": "admin@company.com",
  "password": "password",
  "fullName": "Jane Admin",
  "role": "admin_manager",
  "permissions": ["dashboard", "vendors", "staff", "reports", "settings"]
}
```

## Permission Guard Examples

### Show Section if Admin
```tsx
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { ADMIN_STAFF_PERMISSIONS } from '@/lib/staffPermissions';

<PermissionGuard permission={ADMIN_STAFF_PERMISSIONS.VENDORS}>
  <VendorManagement />
</PermissionGuard>
```

### Show Section if Vendor
```tsx
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { VENDOR_STAFF_PERMISSIONS } from '@/lib/staffPermissions';

<PermissionGuard permission={VENDOR_STAFF_PERMISSIONS.PROJECTS}>
  <ProjectManagement />
</PermissionGuard>
```

## Database Queries

### Get Admin Staff
```sql
SELECT * FROM admin_staff 
WHERE admin_user_id = '<current_admin_id>'
AND active = true;
```

### Get Vendor Staff
```sql
SELECT * FROM vendor_staff 
WHERE vendor_id = '<current_vendor_id>'
AND active = true;
```

### Get User Permissions (Admin)
```sql
SELECT permissions FROM admin_staff 
WHERE staff_user_id = '<user_id>';
```

### Get User Permissions (Vendor)
```sql
SELECT permissions FROM vendor_staff 
WHERE user_id = '<user_id>';
```

## Testing

### Test Admin Staff Flow
1. Log in as super admin
2. Navigate to Staff Management
3. Ensure "System Admin Staff" tab is visible
4. Create admin staff with custom permissions
5. Log in as new admin staff
6. Verify only selected sections are visible

### Test Vendor Staff Flow
1. Log in as vendor
2. Navigate to Staff Management
3. Create vendor staff with custom permissions
4. Log in as new vendor staff
5. Verify only selected sections are visible
6. Verify admin staff cannot access this vendor's staff

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Admin staff tab not showing | Verify user is super admin via `useUserRole()` |
| Permissions not loading | Check if migration was applied and `permissions` column exists |
| Staff can't log in | Verify auth user and profile were created in edge function |
| Wrong permissions showing | Clear browser cache, verify database record |

## Environment Setup

### Required Tables
- ✅ `admin_staff` (new)
- ✅ `vendor_staff` (existing)
- ✅ `profiles` (existing)
- ✅ `user_roles` (existing)

### Required Columns
- ✅ `admin_staff.permissions` (JSONB)
- ✅ `vendor_staff.permissions` (JSONB)

### Required Edge Functions
- ✅ `create-admin-staff` (new)
- ✅ `create-user` (updated to accept `staffType`)

## Security Notes

🔒 **Always Enforce on Backend:**
- Don't trust client-side permissions alone
- Use RLS policies on all sensitive tables
- Validate permissions on every API call
- Log permission changes for audit

🔒 **Separate Access Scopes:**
- Admin staff cannot access vendor data
- Vendor staff cannot access admin areas
- Each vendor's staff is isolated from other vendors

🔒 **Role-Based Access:**
- Permission checks happen at authentication
- Sections hidden if user lacks permission
- Backend enforces actual access control
