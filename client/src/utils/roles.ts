import type { Role } from '../types/auth';

export const roleDashboardPath: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  SALES_REP: '/sales/dashboard',
  DRIVER: '/driver/dashboard',
  CUSTOMER: '/customer/dashboard'
};

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  SALES_REP: 'Sales Rep',
  DRIVER: 'Driver',
  CUSTOMER: 'Customer'
};
