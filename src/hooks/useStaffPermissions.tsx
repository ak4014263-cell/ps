import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { DEFAULT_ROLE_PERMISSIONS, type StaffPermission } from '@/lib/staffPermissions';

export function useStaffPermissions() {
  const { user } = useAuth();

  const { data: permissions = [] } = useQuery({
    queryKey: ['staff-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        // Using default permissions for authenticated users
        return DEFAULT_ROLE_PERMISSIONS['master_vendor'] || [];
      } catch (error) {
        console.error('Error fetching staff permissions:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  const hasPermission = (section: StaffPermission | string): boolean => {
    return permissions.includes(section);
  };

  const hasAnyPermission = (sections: (StaffPermission | string)[]): boolean => {
    return sections.some((section) => permissions.includes(section));
  };

  const hasAllPermissions = (sections: (StaffPermission | string)[]): boolean => {
    return sections.every((section) => permissions.includes(section));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
