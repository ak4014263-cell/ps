# Admin vs Vendor Staff System

## Overview

The staff management system now distinguishes between two separate staff hierarchies:

1. **Admin Staff** - System administrators hired by the super admin to manage the overall platform
2. **Vendor Staff** - Staff members hired by individual vendors to manage their operations

Each has their own:
- Database table (`admin_staff` vs `vendor_staff`)
- Permission set
- Default permissions based on role
- Management interface

## Architecture

### Database Tables

#### `vendor_staff` Table
- `vendor_id` - Which vendor this staff belongs to
- `user_id` - The staff member's user ID
- `role` - Staff role (vendor_staff, designer_staff, data_operator, sales_person, accounts_manager, production_manager)
- `permissions` - JSON array of accessible sections
- `active` - Whether the staff member is active

#### `admin_staff` Table (NEW)
- `admin_user_id` - The super admin who created this staff
- `staff_user_id` - The admin staff member's user ID
- `role` - Admin role (admin_staff, admin_manager, admin_support)
- `permissions` - JSON array of accessible sections
- `active` - Whether the staff member is active

### User Roles

```
Super Admin (has_role('super_admin'))
├── Creates Admin Staff
│   ├── admin_staff (default permissions: dashboard, vendors, reports, settings)
│   ├── admin_manager (default: dashboard, vendors, staff, reports, settings)
│   └── admin_support (default: dashboard, clients, complaints, transactions)
│
Vendors (has_role('master_vendor'))
├── Creates Vendor Staff
│   ├── vendor_staff (default: dashboard, projects, settings)
│   ├── designer_staff (default: dashboard, projects, data_management)
│   ├── data_operator (default: data_management, transactions)
│   ├── sales_person (default: dashboard, clients, transactions, reports)
│   ├── accounts_manager (default: dashboard, transactions, reports)
│   └── production_manager (default: dashboard, projects, items, print_orders)
```

## Permissions

### Vendor Staff Permissions
```
DASHBOARD        - Access to dashboard
PROJECTS         - Project and task management
STAFF            - Staff management
SETTINGS         - Vendor settings
REPORTS          - Reports
DATA_MANAGEMENT  - Data records and bulk operations
TRANSACTIONS     - Transaction history
CLIENTS          - Client information
ITEMS            - Inventory management
PRODUCTS         - Product management
COMPLAINTS       - Complaints handling
PRINT_ORDERS     - Print order management
```

### Admin Staff Permissions
```
DASHBOARD        - System dashboard
VENDORS          - Vendor management
STAFF            - Admin staff management
REPORTS          - System-wide reports
SETTINGS         - System settings
CLIENTS          - All clients across vendors
TRANSACTIONS     - All transactions
COMPLAINTS       - All complaints
```

## UI Implementation

### Staff Management Page

The Staff management page now has:

1. **For Super Admins** - Two tabs:
   - "System Admin Staff" - Manage admin staff
   - "Vendor Staff" - Manage vendor staff (for testing/support)

2. **For Vendors** - Single tab:
   - Shows only vendor staff for their organization

### Dialog Structure

When creating/editing staff:
1. Select staff member details (name, email, password)
2. Select role from role-specific dropdown
3. StaffPermissionsSelector automatically shows:
   - Default permissions for selected role
   - Ability to customize which sections are visible
   - Reset to defaults button

## Implementation Guide

### Step 1: Run Migrations

```bash
# Apply the new migration to create admin_staff table
supabase migration up
```

Migration file: `supabase/migrations/20260110150000_create_admin_staff_table.sql`

### Step 2: Deploy Edge Functions

Deploy the new edge function for creating admin staff:
```bash
supabase functions deploy create-admin-staff
```

File: `supabase/functions/create-admin-staff/index.ts`

### Step 3: Update Staff Page

Replace the old Staff.tsx with the new implementation:
- Old: `src/pages/Staff.tsx`
- New: `src/pages/StaffNew.tsx`

Or rename to `Staff.tsx`:
```bash
mv src/pages/Staff.tsx src/pages/StaffOld.tsx
mv src/pages/StaffNew.tsx src/pages/Staff.tsx
```

### Step 4: Update Navigation

In your navigation/sidebar component, ensure it checks user role to show appropriate staff management link:

```tsx
import { useUserRole } from '@/hooks/useUserRole';

export function Sidebar() {
  const { isSuperAdmin, isVendor } = useUserRole();

  return (
    <nav>
      {/* Admin staff link - only for super admins */}
      {isSuperAdmin && (
        <NavLink to="/staff" label="Admin Staff" />
      )}

      {/* Vendor staff link - for vendors and admins */}
      {(isSuperAdmin || isVendor) && (
        <NavLink to="/staff" label="Staff Management" />
      )}
    </nav>
  );
}
```

## Usage Examples

### Super Admin Creating Admin Staff

1. Log in as super admin
2. Go to Staff Management page
3. Click "System Admin Staff" tab
4. Click "Add Admin Staff"
5. Fill form:
   - Name: "John Manager"
   - Email: "john@admin.com"
   - Password: "secure_password"
   - Role: "admin_manager"
6. Customize permissions or use defaults
7. Click "Create Staff Account"

### Vendor Creating Vendor Staff

1. Log in as vendor
2. Go to Staff Management page
3. Click "Add Vendor Staff"
4. Fill form:
   - Name: "Alice Designer"
   - Email: "alice@vendor.com"
   - Password: "secure_password"
   - Role: "designer_staff"
5. Customize permissions or use defaults
6. Click "Create Staff Account"

## Permission Guard Usage

### Checking Admin Staff Status

```tsx
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { ADMIN_STAFF_PERMISSIONS } from '@/lib/staffPermissions';

export function AdminDashboard() {
  const { hasPermission } = useStaffPermissions();

  return (
    <PermissionGuard permission={ADMIN_STAFF_PERMISSIONS.VENDORS}>
      <VendorManagementSection />
    </PermissionGuard>
  );
}
```

### Checking Both Staff Types

```tsx
export function SuperAdminPanel() {
  const { hasPermission, hasAnyPermission } = useStaffPermissions();

  return (
    <div>
      {hasPermission(ADMIN_STAFF_PERMISSIONS.VENDORS) && (
        <VendorSection />
      )}
      
      {hasPermission(ADMIN_STAFF_PERMISSIONS.STAFF) && (
        <AdminStaffSection />
      )}
    </div>
  );
}
```

## Data Flow

### Creating Admin Staff

```
Super Admin
    ↓
Fills form with staff details + permissions
    ↓
API calls create-admin-staff edge function
    ↓
Function creates:
  1. Auth user (via admin API)
  2. Profile record
  3. user_role entry with 'admin_staff' role
  4. admin_staff record with permissions
    ↓
Admin staff can now log in
    ↓
useStaffPermissions() fetches permissions from admin_staff.permissions
    ↓
UI renders only accessible sections
```

### Creating Vendor Staff

```
Vendor
    ↓
Fills form with staff details + permissions
    ↓
API calls create-user edge function
    ↓
Function creates:
  1. Auth user (via admin API)
  2. Profile record
  3. user_role entry with selected role
  4. vendor_staff record with permissions
    ↓
Vendor staff can now log in
    ↓
useStaffPermissions() fetches permissions from vendor_staff.permissions
    ↓
UI renders only accessible sections
```

## Security Considerations

### Database Level (RLS Policies)

✅ **vendor_staff table**
- Vendors can view/manage only their own staff
- Staff can view themselves
- Super admins can manage all

✅ **admin_staff table**
- Only the admin who created them can view/manage
- Staff can view themselves
- Super admins can manage all

### Application Level

⚠️ **Always validate on backend:**
- Check user role before granting access
- Use Supabase RLS policies on sensitive tables
- Don't rely solely on client-side permission checks

### Permission Hierarchies

```
Super Admin > Admin Staff > Vendor > Vendor Staff
     ↓           ↓          ↓          ↓
  Full access  System mgmt  Own vendor  Limited access
```

## Testing Checklist

- [ ] Super admin can create admin staff with different roles
- [ ] Admin staff see only their permitted sections
- [ ] Admin staff can be edited (permissions updated)
- [ ] Vendor can create vendor staff
- [ ] Vendor staff see only their permitted sections
- [ ] Admin staff and vendor staff are completely separate (no cross-access)
- [ ] Both can log in and see appropriate UI
- [ ] Permissions changes take effect after refresh
- [ ] Default permissions set correctly for each role
- [ ] Custom permissions saved and loaded correctly

## File Structure

### New Files Created
```
supabase/
  functions/
    create-admin-staff/
      index.ts              # Edge function for creating admin staff
  migrations/
    20260110150000_create_admin_staff_table.sql  # Create admin_staff table

src/
  pages/
    StaffNew.tsx           # New staff management page (rename to Staff.tsx)
  
  lib/
    staffPermissions.ts    # Updated with admin permissions
  
  components/
    project/
      StaffPermissionsSelector.tsx  # Updated to support both staff types
    permissions/
      PermissionGuard.tsx   # Existing
  
  hooks/
    useStaffPermissions.tsx  # Existing
```

### Updated Files
```
src/
  lib/
    staffPermissions.ts        # Added admin staff permissions
  components/
    project/
      StaffPermissionsSelector.tsx  # Added staffType parameter
```

## Migration Path for Existing Installations

If you already have the vendor staff system deployed:

1. Run new migration to create `admin_staff` table
2. Update `staffPermissions.ts` with new constants
3. Update `StaffPermissionsSelector.tsx` to accept `staffType`
4. Replace `Staff.tsx` with `StaffNew.tsx`
5. Deploy new edge function `create-admin-staff`
6. Existing vendor staff continue working as before

## Troubleshooting

### Issue: Admin staff not appearing in list
- Check if logged-in user is super admin
- Verify `admin_staff` table has records
- Check RLS policies on `admin_staff` table
- Check browser console for errors

### Issue: Permissions not showing up
- Verify `permissions` column exists in `admin_staff` table
- Check if permissions JSON is valid
- Verify edge function is passing permissions correctly
- Clear browser cache and refresh

### Issue: Staff can access restricted sections
- Verify `PermissionGuard` is wrapping the section
- Check if `useStaffPermissions()` is fetching correct data
- Verify backend RLS policies are also restricting access
- Check user's permissions array in database

## Future Enhancements

- [ ] Bulk permission updates for multiple staff members
- [ ] Permission templates/presets
- [ ] Audit logs for permission changes
- [ ] Time-based permissions
- [ ] Session management and activity tracking
- [ ] Two-factor authentication for admin staff
- [ ] IP whitelist for admin staff access
