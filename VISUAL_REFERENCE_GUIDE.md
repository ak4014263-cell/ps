# Admin vs Vendor Staff - Visual Reference Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION                              │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                    ┌─────────┴─────────┐
                    ↓                   ↓
            ┌──────────────┐    ┌──────────────┐
            │ SUPER ADMIN  │    │   VENDOR     │
            └──────────────┘    └──────────────┘
                    ↓                   ↓
            Creates Admin Staff   Creates Vendor Staff
                    ↓                   ↓
            ┌──────────────┐    ┌──────────────┐
            │ admin_staff  │    │ vendor_staff │
            │   Table      │    │   Table      │
            └──────────────┘    └──────────────┘
                    ↓                   ↓
          [Completely Separate] [Completely Separate]
                    ↓                   ↓
            Admin Staff          Vendor Staff
          (System-wide access)  (Vendor-only access)
```

## Staff Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                     SUPER ADMIN                              │
│                   (Can see everything)                       │
└──────────────────┬───────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
    ┌───────────┐         ┌─────────────┐
    │ ADMIN     │         │   VENDOR    │
    │ STAFF     │         │             │
    └───────────┘         └─────────────┘
   (System-wide)       (Vendor-specific)
        ↓                     ↓
    Manages:              Manages:
    - All vendors       - Own vendor
    - System settings   - Own staff
    - All reports       - Own projects


Admin Staff                    Vendor Staff
admin_staff                    vendor_staff
admin_manager           designer_staff
admin_support           data_operator
                        sales_person
                        accounts_manager
                        production_manager
```

## Permission Comparison

### Admin Staff Sections
```
Dashboard     → System overview & analytics
│
├─ Vendors    → Manage all vendors
│   ├─ View vendor details
│   ├─ View vendor metrics
│   ├─ Manage vendor settings
│   └─ Deactivate vendors
│
├─ Staff      → Manage admin staff
│   ├─ Create admin staff
│   ├─ Edit permissions
│   ├─ View staff activity
│   └─ Deactivate staff
│
├─ Reports    → System-wide reports
│   ├─ Revenue reports
│   ├─ Performance metrics
│   ├─ User analytics
│   └─ System health
│
├─ Settings   → System configuration
│   ├─ General settings
│   ├─ Email configuration
│   ├─ Payment settings
│   └─ Security settings
│
├─ Clients    → All clients across vendors
├─ Transactions → All transactions
└─ Complaints → All complaints
```

### Vendor Staff Sections
```
Dashboard     → Vendor overview
│
├─ Projects   → Project management
│   ├─ Create projects
│   ├─ Manage tasks
│   ├─ Assign tasks
│   └─ Track progress
│
├─ Staff      → Vendor staff management
│   ├─ Create staff
│   ├─ Edit permissions
│   ├─ View staff
│   └─ Deactivate staff
│
├─ Settings   → Vendor settings
│   ├─ Business details
│   ├─ Payment methods
│   ├─ Notification settings
│   └─ Team settings
│
├─ Reports    → Vendor reports
├─ Data Mgmt  → Data operations
├─ Transactions → Vendor transactions
├─ Clients    → Vendor clients
├─ Items      → Inventory
├─ Products   → Product catalog
├─ Complaints → Vendor complaints
└─ Print Orders → Order management
```

## Database Schema (Simplified)

```
┌──────────────────────┐      ┌──────────────────────┐
│    admin_staff       │      │    vendor_staff      │
├──────────────────────┤      ├──────────────────────┤
│ id (UUID)            │      │ id (UUID)            │
│ admin_user_id (FK)   │      │ vendor_id (FK)       │
│ staff_user_id (FK)   │      │ user_id (FK)         │
│ role (TEXT)          │      │ role (TEXT)          │
│ permissions (JSONB)  │      │ permissions (JSONB)  │
│ active (BOOLEAN)     │      │ active (BOOLEAN)     │
│ created_at (TIMESTAMP)      │ created_at (TIMESTAMP)
│ updated_at (TIMESTAMP)      │ updated_at (TIMESTAMP)
└──────────────────────┘      └──────────────────────┘

Both tables have:
- RLS Policies (Row Level Security)
- Unique constraints (no duplicates)
- Cascading delete policies
- Automatic updated_at trigger
```

## Data Flow Diagram

### Admin Staff Creation Flow
```
Super Admin User
      │
      ↓
Provides: email, password, name, role, permissions
      │
      ↓
POST /create-admin-staff
      │
      ├─ Verify: user is super admin
      ├─ Create: auth.users record
      ├─ Create: profiles record
      ├─ Create: user_roles entry
      └─ Create: admin_staff record with permissions
      │
      ↓
Admin Staff Member
      │
      ├─ Can log in
      ├─ Sees system dashboard
      ├─ Can access: vendors, staff, reports, settings
      │
      └─ Cannot:
         ├─ See vendor staff
         ├─ Access vendor data
         ├─ Manage vendor operations
         └─ Access other vendors' projects
```

### Vendor Staff Creation Flow
```
Vendor User
      │
      ↓
Provides: email, password, name, role, permissions
      │
      ↓
POST /create-user
      │
      ├─ Verify: user is vendor
      ├─ Create: auth.users record
      ├─ Create: profiles record
      ├─ Create: user_roles entry
      └─ Create: vendor_staff record with permissions
      │
      ↓
Vendor Staff Member
      │
      ├─ Can log in
      ├─ Sees vendor dashboard
      ├─ Can access: projects, staff, settings, etc.
      │
      └─ Cannot:
         ├─ See admin panel
         ├─ Access other vendors' data
         ├─ See system settings
         ├─ View all vendors
         └─ Access admin reports
```

## Permission Matrix

```
                ADMIN STAFF              VENDOR STAFF
                ───────────              ────────────
Dashboard       ✓ (System)               ✓ (Vendor)
Projects        ✗                        ✓
Staff           ✓ (Admin only)           ✓ (Vendor only)
Settings        ✓ (System)               ✓ (Vendor)
Reports         ✓ (System)               ✓ (Vendor)
Data Mgmt       ✗                        ✓
Transactions    ✓ (All)                  ✓ (Vendor)
Clients         ✓ (All)                  ✓ (Vendor)
Vendors         ✓ (Manage)               ✗
Items           ✗                        ✓
Products        ✗                        ✓
Complaints      ✓ (All)                  ✓ (Vendor)
Print Orders    ✗                        ✓
```

## Access Control Flowchart

```
User Login
      │
      ↓
Check user_roles table
      │
   ┌──┴──┬──────┐
   ↓     ↓      ↓
Super  Admin  Vendor
Admin  Staff  Staff
│      │      │
├─ Can access admin panel
│
├─ Check admin_staff.permissions
│    ↓
│    Show: Dashboard, Vendors, Staff, Reports, Settings
│    Hide: Projects, Items, Print Orders, etc.
│
└─ For each staff member:
    Fetch their specific permissions from admin_staff
    Apply row-level security policies
```

## UI Component Hierarchy

```
Staff Management Page (Staff.tsx)
├─ Tab Container (Super Admin Only)
│  ├─ Tab 1: "System Admin Staff"
│  │  └─ Add Admin Staff Button
│  │     └─ Dialog
│  │        ├─ Form Fields
│  │        ├─ StaffPermissionsSelector
│  │        │  ├─ Navigation Group
│  │        │  ├─ Management Group
│  │        │  ├─ Operations Group
│  │        │  └─ Clients Group
│  │        └─ Create Button
│  │
│  └─ Tab 2: "Vendor Staff"
│     └─ (Same structure)
│
└─ Vendor Interface (Vendor Only)
   └─ Add Vendor Staff Button
      └─ Dialog
         ├─ Form Fields
         ├─ StaffPermissionsSelector
         │  ├─ Navigation Group
         │  ├─ Management Group
         │  ├─ Operations Group
         │  └─ Clients Group
         └─ Create Button

Staff Table (Both)
├─ Name Column
├─ Email Column
├─ Phone Column
├─ Role Column
├─ Sections Count
├─ Status Badge
└─ Edit Button → Opens Same Dialog
```

## Permission Request Flow

```
Frontend (React Component)
      │
      ↓
useStaffPermissions() Hook
      │
      ├─ Get auth.user()
      ├─ Check if admin staff or vendor staff
      │
      ├─ If admin staff:
      │  └─ Query admin_staff table for permissions
      │
      └─ If vendor staff:
         └─ Query vendor_staff table for permissions
      │
      ↓
Returns: {
  permissions: ['dashboard', 'vendors', 'reports'],
  hasPermission: (section) => boolean,
  hasAnyPermission: (sections) => boolean,
  hasAllPermissions: (sections) => boolean
}
      │
      ↓
Component Uses Hook
      │
      ├─ <PermissionGuard permission="vendors">
      │    <VendorSection />
      │  </PermissionGuard>
      │
      └─ Renders or hides section based on permission
```

## Role Default Permissions

### Admin Roles
```
admin_staff:          admin_manager:           admin_support:
├─ Dashboard          ├─ Dashboard              ├─ Dashboard
├─ Vendors            ├─ Vendors                ├─ Clients
├─ Reports            ├─ Staff                  ├─ Complaints
└─ Settings           ├─ Reports                └─ Transactions
                      └─ Settings
```

### Vendor Roles
```
vendor_staff:         designer_staff:          data_operator:
├─ Dashboard          ├─ Dashboard              ├─ Data Management
├─ Projects           ├─ Projects               └─ Transactions
└─ Settings           └─ Data Management

sales_person:         accounts_manager:        production_mgr:
├─ Dashboard          ├─ Dashboard              ├─ Dashboard
├─ Clients            ├─ Transactions           ├─ Projects
├─ Transactions       └─ Reports               ├─ Items
└─ Reports                                      └─ Print Orders
```

## Security Boundaries (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│ SUPER ADMIN - Can manage everything                         │
├──────────────────────────┬──────────────────────────────────┤
│ ADMIN STAFF              │ VENDOR ABC STAFF                 │
│ Can see:                 │ Can see:                         │
│ - All vendors            │ - Vendor ABC only                │
│ - All transactions       │ - Vendor ABC staff               │
│ - All reports            │ - Vendor ABC projects            │
│ - All clients            │ - Vendor ABC clients             │
│ - System settings        │ - Vendor ABC settings            │
│ Cannot:                  │ Cannot:                          │
│ - Edit vendor ops        │ - See Vendor XYZ                 │
│ - See projects           │ - See admin panel                │
│                          │ - See other vendors              │
├──────────────────────────┼──────────────────────────────────┤
│ VENDOR XYZ STAFF         │                                  │
│ Can see:                 │                                  │
│ - Vendor XYZ only        │                                  │
│ - Vendor XYZ staff       │                                  │
│ - Vendor XYZ projects    │                                  │
│ Cannot:                  │                                  │
│ - See Vendor ABC         │                                  │
│ - See admin panel        │                                  │
│ - See system settings    │                                  │
└──────────────────────────┴──────────────────────────────────┘

→ Complete Isolation Enforced at Database Level (RLS Policies)
```

## Testing Checklist Diagram

```
Test Case: Create Admin Staff
    ↓
├─ Log in as super admin ................... ✓
├─ Navigate to Staff Management ........... ✓
├─ Click "System Admin Staff" tab ......... ✓
├─ Click "Add Admin Staff" ................ ✓
├─ Fill form + customize permissions ..... ✓
├─ Click "Create Staff Account" .......... ✓
├─ Check admin_staff table ............... ✓
├─ Log out .......................... ✓
└─ Log in as new admin staff
    ├─ See permitted sections ............ ✓
    ├─ Cannot access vendor sections ... ✓
    └─ Cannot access projects ........... ✓

Test Case: Create Vendor Staff
    ↓
├─ Log in as vendor ...................... ✓
├─ Navigate to Staff Management ......... ✓
├─ Click "Add Vendor Staff" ............ ✓
├─ Fill form + customize permissions ... ✓
├─ Click "Create Staff Account" ....... ✓
├─ Check vendor_staff table ........... ✓
├─ Log out .............................. ✓
└─ Log in as new vendor staff
    ├─ See permitted sections ........... ✓
    ├─ Cannot access admin panel ...... ✓
    ├─ Cannot access other vendors .... ✓
    └─ Can only see own vendor data ... ✓
```

## Key Takeaways

```
┌────────────────────────────────────────────────┐
│ COMPLETE SEPARATION                            │
│                                                │
│ Admin Staff ≠ Vendor Staff                     │
│ Different tables, different access, different │
│ permissions, complete isolation.              │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ WHO CREATES WHOM?                              │
│                                                │
│ Super Admin → Creates → Admin Staff            │
│ Vendor     → Creates → Vendor Staff            │
│                                                │
│ Admin Staff can see System                     │
│ Vendor Staff can see their Vendor only         │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ PERMISSIONS ARE CUSTOMIZABLE                   │
│                                                │
│ Role has defaults                              │
│ Can be customized per staff member             │
│ Stored in database as JSON                     │
│ Fetched on each login/session                  │
└────────────────────────────────────────────────┘
```

---

**Visual Reference Complete** ✓
