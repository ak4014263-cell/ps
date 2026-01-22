# Staff Permissions System Documentation

## Overview
The staff permissions system allows vendors/admins to control which sections and tabs are visible to staff members when they log in. Each staff member can be granted specific permissions to access different parts of the application.

## Features

✅ **Permission-Based Tab Visibility** - Control which sections staff can see  
✅ **Role-Based Defaults** - Each role has default permissions that can be customized  
✅ **Fine-Grained Control** - Permissions are stored as JSON arrays in the database  
✅ **Easy Integration** - Use `PermissionGuard` component to wrap sections  
✅ **Permission Checking Hooks** - `useStaffPermissions()` hook for programmatic checks  

## Available Permissions

```
- dashboard: Access to dashboard and analytics
- projects: View and manage projects and tasks
- staff: Manage staff members (create, edit, deactivate)
- settings: Access vendor settings and configurations
- reports: View and generate reports
- data_management: Manage data records and bulk operations
- transactions: View transaction history
- clients: View and manage client information
- vendors: View vendors
- items: Manage inventory items
- products: Manage products
- complaints: Handle complaints and support tickets
- print_orders: View and manage print orders
```

## Default Permissions by Role

### vendor_staff
- dashboard
- projects
- settings

### designer_staff
- dashboard
- projects
- data_management

### data_operator
- data_management
- transactions

### sales_person
- dashboard
- clients
- transactions
- reports

### accounts_manager
- dashboard
- transactions
- reports

### production_manager
- dashboard
- projects
- items
- print_orders

## Database Schema

### New Migration
File: `supabase/migrations/20260110140000_add_staff_permissions.sql`

Adds a `permissions` column to the `vendor_staff` table:
```sql
ALTER TABLE public.vendor_staff 
ADD COLUMN permissions JSONB DEFAULT '["dashboard", "projects", "staff", "settings"]'::jsonb;
```

The permissions are stored as a JSON array of section identifiers.

## Usage

### 1. Staff Management UI (Staff.tsx)

When adding or editing a staff member:

```tsx
import { StaffPermissionsSelector } from '@/components/project/StaffPermissionsSelector';

// In your form:
<StaffPermissionsSelector
  selectedPermissions={selectedPermissions}
  onPermissionsChange={setSelectedPermissions}
  role={formData.role}
  showDefaults={true}
/>
```

The UI will:
- Show all available permissions grouped by category
- Display default permissions for the selected role
- Allow admin to customize permissions for each staff member
- Show descriptions for each permission

### 2. Permission Guard Components

#### PermissionGuard - Conditional Rendering
```tsx
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

// Show content only if user has permission
<PermissionGuard permission={STAFF_PERMISSIONS.REPORTS}>
  <ReportsSection />
</PermissionGuard>

// With fallback content
<PermissionGuard 
  permission={STAFF_PERMISSIONS.STAFF}
  fallback={<div>No access to staff management</div>}
>
  <StaffManagementSection />
</PermissionGuard>

// Require ALL permissions
<PermissionGuard 
  permission={[STAFF_PERMISSIONS.REPORTS, STAFF_PERMISSIONS.TRANSACTIONS]}
  requireAll={true}
>
  <AdvancedReportsSection />
</PermissionGuard>
```

#### PermissionSection - Section Wrapper
```tsx
import { PermissionSection } from '@/components/permissions/PermissionGuard';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

<PermissionSection sectionId={STAFF_PERMISSIONS.REPORTS}>
  <ReportsPage />
</PermissionSection>
```

#### PermissionTab - Tab Visibility
```tsx
import { PermissionTab } from '@/components/permissions/PermissionGuard';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

<div className="tabs">
  <PermissionTab 
    label="Dashboard"
    permission={STAFF_PERMISSIONS.DASHBOARD}
    isActive={activeTab === 'dashboard'}
    onClick={() => setActiveTab('dashboard')}
  />
  <PermissionTab 
    label="Reports"
    permission={STAFF_PERMISSIONS.REPORTS}
    isActive={activeTab === 'reports'}
    onClick={() => setActiveTab('reports')}
  />
</div>
```

### 3. Permission Checking Hook

```tsx
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

export function MyComponent() {
  const { 
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions 
  } = useStaffPermissions();

  // Check single permission
  if (hasPermission(STAFF_PERMISSIONS.REPORTS)) {
    // Show reports
  }

  // Check if user has ANY of the permissions
  if (hasAnyPermission([STAFF_PERMISSIONS.REPORTS, STAFF_PERMISSIONS.TRANSACTIONS])) {
    // Show analytics
  }

  // Check if user has ALL permissions
  if (hasAllPermissions([STAFF_PERMISSIONS.PROJECTS, STAFF_PERMISSIONS.STAFF])) {
    // Show management dashboard
  }

  // Get all permissions as array
  console.log(permissions); // ['dashboard', 'projects', 'settings']
}
```

## Integration Steps

### Step 1: Run Migration
Apply the migration to add the `permissions` column to `vendor_staff` table:
```bash
supabase migration up
```

### Step 2: Update Navigation Component
In your main navigation/sidebar component, wrap sections with `PermissionGuard`:

```tsx
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

export function Sidebar() {
  return (
    <nav>
      <NavLink to="/dashboard" label="Dashboard" />
      
      <PermissionGuard permission={STAFF_PERMISSIONS.PROJECTS}>
        <NavLink to="/projects" label="Projects" />
      </PermissionGuard>

      <PermissionGuard permission={STAFF_PERMISSIONS.REPORTS}>
        <NavLink to="/reports" label="Reports" />
      </PermissionGuard>

      <PermissionGuard permission={STAFF_PERMISSIONS.STAFF}>
        <NavLink to="/staff" label="Staff" />
      </PermissionGuard>

      <PermissionGuard permission={STAFF_PERMISSIONS.SETTINGS}>
        <NavLink to="/settings" label="Settings" />
      </PermissionGuard>

      <PermissionGuard permission={STAFF_PERMISSIONS.DATA_MANAGEMENT}>
        <NavLink to="/data-management" label="Data Management" />
      </PermissionGuard>
    </nav>
  );
}
```

### Step 3: Protect Page Components
Wrap entire pages with permission checks:

```tsx
import { PermissionSection } from '@/components/permissions/PermissionGuard';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

export function ReportsPage() {
  return (
    <PermissionSection 
      sectionId={STAFF_PERMISSIONS.REPORTS}
      fallback={<NotAuthorized />}
    >
      {/* Reports content */}
    </PermissionSection>
  );
}
```

### Step 4: Update the create-user Edge Function
Modify the Supabase edge function to include permissions when creating staff:

```typescript
// In your create-user function
const { data: vendorStaff, error: staffError } = await supabase
  .from('vendor_staff')
  .insert([
    {
      vendor_id: vendorId,
      user_id: newUser.user.id,
      role: role,
      active: true,
      permissions: permissions || DEFAULT_ROLE_PERMISSIONS[role], // Add permissions
    },
  ])
  .select();
```

## Example: Complete Staff Management Flow

1. **Admin opens Staff Management page**
   - Sees list of all staff members
   - Each staff shows how many sections they have access to

2. **Admin clicks "Add Staff Member"**
   - Dialog opens with form
   - Admin enters name, email, password, and role
   - StaffPermissionsSelector shows default permissions for the role
   - Admin can customize which sections the staff member can see
   - Admin clicks "Create Staff Account"

3. **New staff member logs in**
   - `useStaffPermissions()` hook fetches their permissions from database
   - Navigation/sidebar renders only sections they have permission for
   - Attempting to access restricted sections redirects to 403 or shows access denied

4. **Existing staff member with restrictions**
   - Admin clicks edit button on staff row
   - Dialog opens with current permissions checked
   - Admin can modify which sections are visible
   - Changes are saved to database
   - Staff member sees updates on next page refresh/login

## Security Notes

⚠️ **Client-Side Enforcement**
- This system hides UI elements based on permissions
- Always validate permissions on the backend as well
- Use Row Level Security (RLS) policies to restrict database access
- Never rely solely on client-side permission checks for security

✅ **Backend Protection**
- Ensure your Supabase RLS policies restrict data based on user roles
- Validate permissions on every API call
- Don't expose sensitive data in responses even if UI is hidden

## Files Created/Modified

### New Files
- `supabase/migrations/20260110140000_add_staff_permissions.sql` - Database migration
- `src/lib/staffPermissions.ts` - Permission constants and defaults
- `src/components/project/StaffPermissionsSelector.tsx` - Permission selector UI
- `src/components/permissions/PermissionGuard.tsx` - Permission guard components
- `src/hooks/useStaffPermissions.tsx` - Permission checking hook

### Modified Files
- `src/pages/Staff.tsx` - Updated staff management page with permissions UI

## Testing

### Manual Testing Checklist
- [ ] Create staff with different roles - verify defaults are set
- [ ] Create staff with custom permissions - verify only selected sections visible
- [ ] Edit staff permissions - verify changes take effect
- [ ] Test with different roles - verify role-specific defaults work
- [ ] Log in as different staff members - verify correct sections visible
- [ ] Try accessing restricted URL directly - verify redirect/403 handling

### Permission Test Matrix
Test each role with various permission combinations:
```
vendor_staff:    dashboard, projects, settings (default)
designer_staff:  dashboard, projects, data_management (default)
data_operator:   data_management, transactions (default)
sales_person:    dashboard, clients, transactions, reports (default)
accounts_manager: dashboard, transactions, reports (default)
production_mgr:  dashboard, projects, items, print_orders (default)
```

## Future Enhancements

- [ ] Bulk permission updates (select multiple staff, change permissions at once)
- [ ] Permission templates (save common permission combinations)
- [ ] Audit logs (track who changed permissions and when)
- [ ] Permission inheritance (staff inherits parent vendor's restrictions)
- [ ] Time-based permissions (temporary access for specific periods)
- [ ] Feature flags integration (link permissions to feature flags)
