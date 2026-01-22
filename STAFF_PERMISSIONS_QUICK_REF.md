# Staff Permissions - Quick Reference

## What's New?

You can now control which tabs/sections each staff member sees when they login in the **Staff Management** page.

## How to Use

### For Vendors/Admins

1. **Go to Staff Management** → "Add Staff Member" or edit existing staff
2. **Scroll to "Accessible Sections & Tabs"** section
3. **Select which sections** the staff member should see:
   - ✅ Navigation (Dashboard, Settings, Reports)
   - ✅ Management (Projects, Staff, Data Management, Items, Products)
   - ✅ Operations (Transactions, Print Orders, Complaints)
   - ✅ Clients (Clients, Vendors)
4. **Save** - Changes take effect immediately

### Default Permissions by Role

| Role | Can See | Sections |
|------|---------|----------|
| **Vendor Staff** | Dashboard, Projects, Settings | 3 |
| **Designer Staff** | Dashboard, Projects, Data Management | 3 |
| **Data Operator** | Data Management, Transactions | 2 |
| **Sales Person** | Dashboard, Clients, Transactions, Reports | 4 |
| **Accounts Manager** | Dashboard, Transactions, Reports | 3 |
| **Production Manager** | Dashboard, Projects, Items, Print Orders | 4 |

## Implementation in Code

### Hide/Show Based on Permission

```tsx
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

// Only show if user has permission
<PermissionGuard permission={STAFF_PERMISSIONS.REPORTS}>
  <ReportsTab />
</PermissionGuard>

// Multiple permissions (any one)
<PermissionGuard permission={[STAFF_PERMISSIONS.REPORTS, STAFF_PERMISSIONS.TRANSACTIONS]}>
  <AnalyticsSection />
</PermissionGuard>
```

### Check Permissions in Code

```tsx
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

export function MyPage() {
  const { hasPermission, permissions } = useStaffPermissions();

  if (!hasPermission(STAFF_PERMISSIONS.REPORTS)) {
    return <AccessDenied />;
  }

  return <ReportsPage />;
}
```

### Conditional Tabs

```tsx
import { PermissionTab } from '@/components/permissions/PermissionGuard';

<div className="tabs">
  <PermissionTab label="Reports" permission={STAFF_PERMISSIONS.REPORTS} />
  <PermissionTab label="Transactions" permission={STAFF_PERMISSIONS.TRANSACTIONS} />
</div>
```

## Files to Know

- **Staff permissions constants**: `src/lib/staffPermissions.ts`
- **Permission UI component**: `src/components/project/StaffPermissionsSelector.tsx`
- **Permission guard components**: `src/components/permissions/PermissionGuard.tsx`
- **Permission hook**: `src/hooks/useStaffPermissions.tsx`
- **Staff management page**: `src/pages/Staff.tsx`
- **Database migration**: `supabase/migrations/20260110140000_add_staff_permissions.sql`

## Key Concepts

🔐 **Permissions** = Array of section names stored in `vendor_staff.permissions` column  
👥 **Role** = Staff member's role (vendor_staff, designer_staff, etc.)  
📋 **Default Permissions** = Permissions auto-assigned based on role  
🛡️ **Permission Guard** = Component that conditionally renders based on permissions  

## Next Steps

1. Apply the database migration
2. Go to Staff Management page
3. Create/edit staff members
4. Customize their accessible sections
5. Test by logging in as that staff member
6. Wrap navigation sections with `PermissionGuard` components

## Questions?

See **STAFF_PERMISSIONS_GUIDE.md** for detailed documentation.
