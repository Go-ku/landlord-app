import { useSession } from 'next-auth/react';

export function useRoleAccess() {
  const { data: session, status } = useSession();

  const hasRole = (role) => {
    return session?.user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(session?.user?.role);
  };

  const hasPermission = (permission) => {
    return session?.user?.permissions?.includes(permission) || false;
  };

  const canAccessProperties = () => {
    return hasAnyRole(['landlord', 'manager', 'admin']);
  };

  const canEditProperty = (propertyLandlordId) => {
    if (hasRole('admin')) return true;
    if (hasRole('manager')) return true;
    if (hasRole('landlord')) return session?.user?.id === propertyLandlordId;
    return false;
  };

  const canCreateProperty = () => {
    return hasAnyRole(['landlord', 'manager', 'admin']);
  };

  const canManagePayments = () => {
    return hasRole('admin') && hasPermission('manage_payments');
  };

  const canManageInvoices = () => {
    return hasRole('admin') && hasPermission('manage_invoices');
  };

  const canManageUsers = () => {
    return hasRole('admin') && hasPermission('manage_users');
  };

  const canViewReports = () => {
    return hasRole('admin') && hasPermission('view_reports');
  };

  const canAccessAdmin = () => {
    return hasRole('admin');
  };

  const isFinancialAdmin = () => {
    return hasRole('admin') && session?.user?.adminLevel === 'financial';
  };

  const isSuperAdmin = () => {
    return hasRole('admin') && session?.user?.adminLevel === 'super';
  };

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    userRole: session?.user?.role,
    userId: session?.user?.id,
    adminLevel: session?.user?.adminLevel,
    permissions: session?.user?.permissions || [],
    hasRole,
    hasAnyRole,
    hasPermission,
    canAccessProperties,
    canEditProperty,
    canCreateProperty,
    canManagePayments,
    canManageInvoices,
    canManageUsers,
    canViewReports,
    canAccessAdmin,
    isFinancialAdmin,
    isSuperAdmin,
  };
}