import { useState } from 'react';
import {
  VENDOR_STAFF_PERMISSIONS,
  ADMIN_STAFF_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  DEFAULT_VENDOR_STAFF_PERMISSIONS,
  DEFAULT_ADMIN_STAFF_PERMISSIONS,
  type StaffPermission,
} from '@/lib/staffPermissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StaffPermissionsSelectorProps {
  selectedPermissions: string[];
  onPermissionsChange: (permissions: string[]) => void;
  role?: string;
  showDefaults?: boolean;
  staffType?: 'vendor' | 'admin';
}

export function StaffPermissionsSelector({
  selectedPermissions,
  onPermissionsChange,
  role,
  showDefaults = true,
  staffType = 'vendor',
}: StaffPermissionsSelectorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const isAdminStaff = staffType === 'admin';
  const allPermissions = isAdminStaff 
    ? Object.values(ADMIN_STAFF_PERMISSIONS)
    : Object.values(VENDOR_STAFF_PERMISSIONS);
  const defaultPerms = role 
    ? (isAdminStaff 
        ? DEFAULT_ADMIN_STAFF_PERMISSIONS[role]
        : DEFAULT_VENDOR_STAFF_PERMISSIONS[role])
    : [];

  const togglePermission = (permission: StaffPermission) => {
    if (selectedPermissions.includes(permission)) {
      onPermissionsChange(selectedPermissions.filter((p) => p !== permission));
    } else {
      onPermissionsChange([...selectedPermissions, permission]);
    }
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const selectAllPermissions = () => {
    onPermissionsChange([...allPermissions]);
  };

  const clearAllPermissions = () => {
    onPermissionsChange([]);
  };

  const resetToDefaults = () => {
    if (role) {
      const defaults = isAdminStaff
        ? DEFAULT_ADMIN_STAFF_PERMISSIONS[role]
        : DEFAULT_VENDOR_STAFF_PERMISSIONS[role];
      onPermissionsChange(defaults || []);
    }
  };

  // Group permissions by category based on staff type
  const permissionGroups = isAdminStaff
    ? {
        Navigation: [
          ADMIN_STAFF_PERMISSIONS.DASHBOARD,
          ADMIN_STAFF_PERMISSIONS.SETTINGS,
          ADMIN_STAFF_PERMISSIONS.REPORTS,
        ],
        Management: [
          ADMIN_STAFF_PERMISSIONS.VENDORS,
          ADMIN_STAFF_PERMISSIONS.STAFF,
        ],
        Operations: [
          ADMIN_STAFF_PERMISSIONS.TRANSACTIONS,
          ADMIN_STAFF_PERMISSIONS.COMPLAINTS,
        ],
        Clients: [ADMIN_STAFF_PERMISSIONS.CLIENTS],
      }
    : {
        Navigation: [
          VENDOR_STAFF_PERMISSIONS.DASHBOARD,
          VENDOR_STAFF_PERMISSIONS.SETTINGS,
          VENDOR_STAFF_PERMISSIONS.REPORTS,
        ],
        Management: [
          VENDOR_STAFF_PERMISSIONS.PROJECTS,
          VENDOR_STAFF_PERMISSIONS.STAFF,
          VENDOR_STAFF_PERMISSIONS.DATA_MANAGEMENT,
          VENDOR_STAFF_PERMISSIONS.ITEMS,
          VENDOR_STAFF_PERMISSIONS.PRODUCTS,
        ],
        Operations: [
          VENDOR_STAFF_PERMISSIONS.TRANSACTIONS,
          VENDOR_STAFF_PERMISSIONS.PRINT_ORDERS,
          VENDOR_STAFF_PERMISSIONS.COMPLAINTS,
        ],
        Clients: [VENDOR_STAFF_PERMISSIONS.CLIENTS],
      };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">
            Accessible Sections & Tabs
          </h3>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllPermissions}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllPermissions}
              className="text-xs"
            >
              Clear
            </Button>
            {showDefaults && role && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="text-xs"
              >
                Reset to Defaults
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select which sections this {staffType === 'admin' ? 'admin' : 'vendor'} staff member can access when logged in.
          {showDefaults && defaultPerms?.length > 0 && (
            <span> Default for {role?.replace(/_/g, ' ')}: {defaultPerms.length} section(s)</span>
          )}
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/20">
        {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => (
          <div key={groupName} className="space-y-2">
            <button
              type="button"
              onClick={() => toggleGroup(groupName)}
              className="flex items-center gap-2 font-medium text-sm text-foreground hover:text-primary transition-colors"
            >
              <span className="text-lg">
                {expandedGroups.has(groupName) ? '▼' : '▶'}
              </span>
              {groupName}
            </button>

            {expandedGroups.has(groupName) && (
              <div className="ml-6 space-y-2">
                {groupPermissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`perm-${permission}`}
                      checked={selectedPermissions.includes(permission)}
                      onCheckedChange={() =>
                        togglePermission(permission as StaffPermission)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`perm-${permission}`}
                        className="text-sm font-medium cursor-pointer block mb-0.5"
                      >
                        {PERMISSION_LABELS[permission]}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {PERMISSION_DESCRIPTIONS[permission]}
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          {PERMISSION_DESCRIPTIONS[permission]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <strong>Note:</strong> Selected sections ({selectedPermissions.length}) will be
          visible to this {staffType === 'admin' ? 'admin' : 'vendor'} staff member when they log in. They can still only perform
          actions allowed by their role.
        </p>
      </div>
    </div>
  );
}
