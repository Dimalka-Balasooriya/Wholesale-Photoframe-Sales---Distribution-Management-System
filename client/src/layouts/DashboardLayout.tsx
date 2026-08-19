import {
  Bell,
  Boxes,
  ChartNoAxesColumn,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types/auth';
import { roleLabels } from '../utils/roles';

const navItems: Record<Role, Array<{ label: string; icon: React.ElementType; path: string }>> = {
  ADMIN: [
    { label: 'Dashboard', icon: Home, path: '/admin/dashboard' },
    { label: 'Orders', icon: ShoppingCart, path: '/admin/orders' },
    { label: 'Customers', icon: Users, path: '/admin/customers' },
    { label: 'Products', icon: Boxes, path: '/admin/products' },
    { label: 'Inventory', icon: PackageCheck, path: '/admin/inventory' },
    { label: 'Deliveries', icon: Truck, path: '/admin/deliveries' },
    { label: 'Payments', icon: CreditCard, path: '/admin/payments' },
    { label: 'Targets', icon: ChartNoAxesColumn, path: '/admin/targets' },
    { label: 'Returns', icon: FileText, path: '/admin/returns' },
    { label: 'Reports', icon: ChartNoAxesColumn, path: '/admin/reports' },
    { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
    { label: 'Audit Logs', icon: ShieldCheck, path: '/admin/audit-logs' },
    { label: 'Settings', icon: Settings, path: '/admin/dashboard' }
  ],
  SALES_REP: [
    { label: 'Dashboard', icon: Home, path: '/sales/dashboard' },
    { label: 'Customers', icon: Users, path: '/sales/customers' },
    { label: 'New Order', icon: ShoppingCart, path: '/sales/new-order' },
    { label: 'My Orders', icon: FileText, path: '/sales/orders' },
    { label: 'Payments', icon: CreditCard, path: '/sales/payments' },
    { label: 'Commission', icon: ChartNoAxesColumn, path: '/sales/performance' },
    { label: 'Returns', icon: FileText, path: '/sales/returns' },
    { label: 'Targets', icon: ChartNoAxesColumn, path: '/sales/performance' },
    { label: 'Notifications', icon: Bell, path: '/sales/notifications' }
  ],
  DRIVER: [
    { label: 'Dashboard', icon: Home, path: '/driver/dashboard' },
    { label: "Today's Deliveries", icon: Truck, path: '/driver/dashboard' },
    { label: 'Pending', icon: FileText, path: '/driver/dashboard' },
    { label: 'Completed', icon: PackageCheck, path: '/driver/dashboard' },
    { label: 'Cash Collection', icon: CreditCard, path: '/driver/dashboard' },
    { label: 'Notifications', icon: Bell, path: '/driver/notifications' }
  ],
  CUSTOMER: [
    { label: 'Dashboard', icon: Home, path: '/customer/dashboard' },
    { label: 'Shop', icon: Boxes, path: '/customer/shop' },
    { label: 'Cart', icon: ShoppingCart, path: '/customer/cart' },
    { label: 'My Orders', icon: FileText, path: '/customer/orders' },
    { label: 'Invoices', icon: CreditCard, path: '/customer/invoices' },
    { label: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { label: 'Account', icon: Settings, path: '/customer/dashboard' }
  ]
};

const notificationPath: Record<Role, string> = {
  ADMIN: '/admin/notifications',
  SALES_REP: '/sales/notifications',
  DRIVER: '/driver/notifications',
  CUSTOMER: '/customer/notifications'
};

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function DashboardLayout({ title, subtitle, children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = navItems[user.role];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[272px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white shadow-xl transition-transform lg:static lg:w-auto lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Photoframe Wholesale
            </p>
            <h1 className="mt-1 text-lg font-bold text-ink">Distribution Hub</h1>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  className={({ isActive }) =>
                    `flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-50 text-brand'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                  to={item.path}
                  title={item.label}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 p-4">
            <button
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
              onClick={handleLogout}
              type="button"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {isOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden"
          onClick={() => setIsOpen(false)}
          type="button"
        />
      ) : null}

      <main className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Open navigation"
                className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 lg:hidden"
                onClick={() => setIsOpen(true)}
                type="button"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-ink">{title}</h2>
                <p className="truncate text-sm text-slate-500">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                aria-label="Notifications"
                className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600"
                onClick={() => navigate(notificationPath[user.role])}
                type="button"
              >
                <Bell size={18} />
              </button>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-ink">{user.name}</p>
                <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
              </div>
            </div>
          </div>
        </header>
        <section className="px-4 py-6 sm:px-6 lg:px-8">{children}</section>
      </main>
    </div>
  );
}
