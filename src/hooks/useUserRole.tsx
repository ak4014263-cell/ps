import { useAuth } from './useAuth';

export type AppRole = 
  | 'super_admin'
  | 'master_vendor'
  | 'vendor_staff'
  | 'designer_staff'
  | 'data_operator'
  | 'sales_person'
  | 'accounts_manager'
  | 'production_manager'
  | 'client';

export const useUserRole = () => {
  const { user } = useAuth();

  // Use the role directly from the user object returned by auth
  const roles = user?.role ? [user.role as AppRole] : [];

  const hasRole = (role: AppRole) => roles.includes(role);
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isVendor = user?.role === 'master_vendor' || user?.role === 'vendor_staff';
  const isClient = user?.role === 'client';

  return { roles, hasRole, isSuperAdmin, isVendor, isClient, isLoading: false };
};