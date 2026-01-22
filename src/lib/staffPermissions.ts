/**
 * Staff Permission Definitions
 * Each permission represents a section/tab accessible to staff members
 * 
 * VENDOR STAFF: permissions for vendor staff members
 * ADMIN STAFF: permissions for system admin staff members
 */

export const VENDOR_STAFF_PERMISSIONS = {
  DASHBOARD: 'dashboard',
  PROJECTS: 'projects',
  STAFF: 'staff',
  SETTINGS: 'settings',
  REPORTS: 'reports',
  DATA_MANAGEMENT: 'data_management',
  TRANSACTIONS: 'transactions',
  CLIENTS: 'clients',
  ITEMS: 'items',
  PRODUCTS: 'products',
  COMPLAINTS: 'complaints',
  PRINT_ORDERS: 'print_orders',
} as const;

export const ADMIN_STAFF_PERMISSIONS = {
  DASHBOARD: 'dashboard',
  VENDORS: 'vendors',
  STAFF: 'staff',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  CLIENTS: 'clients',
  TRANSACTIONS: 'transactions',
  COMPLAINTS: 'complaints',
} as const;

export const STAFF_PERMISSIONS = VENDOR_STAFF_PERMISSIONS;

export const PERMISSION_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'projects': 'Projects',
  'staff': 'Staff Management',
  'settings': 'Settings',
  'reports': 'Reports',
  'data_management': 'Data Management',
  'transactions': 'Transactions',
  'clients': 'Clients',
  'items': 'Items',
  'products': 'Products',
  'complaints': 'Complaints',
  'print_orders': 'Print Orders',
  'vendors': 'Vendors',
};

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'dashboard': 'Access to dashboard and analytics',
  'projects': 'View and manage projects and tasks',
  'staff': 'Manage staff members (create, edit, deactivate)',
  'settings': 'Access settings and configurations',
  'reports': 'View and generate reports',
  'data_management': 'Manage data records and bulk operations',
  'transactions': 'View transaction history',
  'clients': 'View and manage client information',
  'items': 'Manage inventory items',
  'products': 'Manage products',
  'complaints': 'Handle complaints and support tickets',
  'print_orders': 'View and manage print orders',
  'vendors': 'Manage vendors and their configurations',
};

// Default permissions for vendor staff roles
export const DEFAULT_VENDOR_STAFF_PERMISSIONS: Record<string, string[]> = {
  vendor_staff: [
    VENDOR_STAFF_PERMISSIONS.DASHBOARD,
    VENDOR_STAFF_PERMISSIONS.PROJECTS,
    VENDOR_STAFF_PERMISSIONS.SETTINGS,
  ],
  designer_staff: [
    VENDOR_STAFF_PERMISSIONS.DASHBOARD,
    VENDOR_STAFF_PERMISSIONS.PROJECTS,
    VENDOR_STAFF_PERMISSIONS.DATA_MANAGEMENT,
  ],
  data_operator: [
    VENDOR_STAFF_PERMISSIONS.DATA_MANAGEMENT,
    VENDOR_STAFF_PERMISSIONS.TRANSACTIONS,
  ],
  sales_person: [
    VENDOR_STAFF_PERMISSIONS.DASHBOARD,
    VENDOR_STAFF_PERMISSIONS.CLIENTS,
    VENDOR_STAFF_PERMISSIONS.TRANSACTIONS,
    VENDOR_STAFF_PERMISSIONS.REPORTS,
  ],
  accounts_manager: [
    VENDOR_STAFF_PERMISSIONS.DASHBOARD,
    VENDOR_STAFF_PERMISSIONS.TRANSACTIONS,
    VENDOR_STAFF_PERMISSIONS.REPORTS,
  ],
  production_manager: [
    VENDOR_STAFF_PERMISSIONS.DASHBOARD,
    VENDOR_STAFF_PERMISSIONS.PROJECTS,
    VENDOR_STAFF_PERMISSIONS.ITEMS,
    VENDOR_STAFF_PERMISSIONS.PRINT_ORDERS,
  ],
};

// Default permissions for admin staff roles
export const DEFAULT_ADMIN_STAFF_PERMISSIONS: Record<string, string[]> = {
  admin_staff: [
    ADMIN_STAFF_PERMISSIONS.DASHBOARD,
    ADMIN_STAFF_PERMISSIONS.VENDORS,
    ADMIN_STAFF_PERMISSIONS.REPORTS,
    ADMIN_STAFF_PERMISSIONS.SETTINGS,
  ],
  admin_manager: [
    ADMIN_STAFF_PERMISSIONS.DASHBOARD,
    ADMIN_STAFF_PERMISSIONS.VENDORS,
    ADMIN_STAFF_PERMISSIONS.STAFF,
    ADMIN_STAFF_PERMISSIONS.REPORTS,
    ADMIN_STAFF_PERMISSIONS.SETTINGS,
  ],
  admin_support: [
    ADMIN_STAFF_PERMISSIONS.DASHBOARD,
    ADMIN_STAFF_PERMISSIONS.CLIENTS,
    ADMIN_STAFF_PERMISSIONS.COMPLAINTS,
    ADMIN_STAFF_PERMISSIONS.TRANSACTIONS,
  ],
};

// Kept for backward compatibility
export const DEFAULT_ROLE_PERMISSIONS = DEFAULT_VENDOR_STAFF_PERMISSIONS;

export type VendorStaffPermission = typeof VENDOR_STAFF_PERMISSIONS[keyof typeof VENDOR_STAFF_PERMISSIONS];
export type AdminStaffPermission = typeof ADMIN_STAFF_PERMISSIONS[keyof typeof ADMIN_STAFF_PERMISSIONS];
export type StaffPermission = VendorStaffPermission | AdminStaffPermission;
