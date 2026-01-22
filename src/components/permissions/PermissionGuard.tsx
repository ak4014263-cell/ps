import { ReactNode } from 'react';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { STAFF_PERMISSIONS } from '@/lib/staffPermissions';

interface PermissionGuardProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

/**
 * Component that shows content only if the user has the required permission(s)
 * @param permission - Single permission string or array of permission strings
 * @param children - Content to show if user has permission
 * @param fallback - Content to show if user doesn't have permission (default: null)
 * @param requireAll - If true, requires ALL permissions; if false (default), requires ANY
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  requireAll = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } =
    useStaffPermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  return hasAccess ? children : fallback;
}

interface PermissionTabProps {
  label: string;
  permission: string;
  icon?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

/**
 * Tab component that's only shown if user has permission
 */
export function PermissionTab({
  label,
  permission,
  icon,
  badge,
  onClick,
  isActive = false,
  className = '',
}: PermissionTabProps) {
  const { hasPermission } = useStaffPermissions();

  if (!hasPermission(permission)) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-md
        transition-colors
        ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted text-foreground'
        }
        ${className}
      `}
    >
      {icon}
      <span>{label}</span>
      {badge && <span className="ml-1">{badge}</span>}
    </button>
  );
}

interface PermissionSectionProps {
  sectionId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrapper component for entire sections that should be hidden if user doesn't have permission
 */
export function PermissionSection({
  sectionId,
  children,
  fallback,
}: PermissionSectionProps) {
  return (
    <PermissionGuard permission={sectionId} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
