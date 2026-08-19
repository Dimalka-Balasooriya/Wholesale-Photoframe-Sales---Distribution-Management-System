import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminDeliveriesPage } from './pages/admin/AdminDeliveriesPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminTargetsPage } from './pages/admin/AdminTargetsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { CustomerShopPage } from './pages/customer/CustomerShopPage';
import { SalesNewOrderPage } from './pages/sales/SalesNewOrderPage';
import { SalesDashboard } from './pages/sales/SalesDashboard';
import { SalesPerformancePage } from './pages/sales/SalesPerformancePage';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { CustomersPage } from './pages/shared/CustomersPage';
import { CartCheckoutPage } from './pages/shared/CartCheckoutPage';
import { FinancePage } from './pages/shared/FinancePage';
import { NotificationsPage } from './pages/shared/NotificationsPage';
import { OrdersPage } from './pages/shared/OrdersPage';
import { ReturnsPage } from './pages/shared/ReturnsPage';
import { useAuth } from './hooks/useAuth';
import { roleDashboardPath } from './utils/roles';

function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-medium text-slate-600">
        Loading workspace...
      </div>
    );
  }

  return <Navigate to={user ? roleDashboardPath[user.role] : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProductsPage />} />
        <Route path="/admin/inventory" element={<AdminInventoryPage />} />
        <Route path="/admin/customers" element={<CustomersPage mode="admin" />} />
        <Route path="/admin/orders" element={<OrdersPage mode="admin" />} />
        <Route path="/admin/deliveries" element={<AdminDeliveriesPage />} />
        <Route path="/admin/payments" element={<FinancePage mode="admin" />} />
        <Route path="/admin/targets" element={<AdminTargetsPage />} />
        <Route path="/admin/returns" element={<ReturnsPage mode="admin" />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/notifications" element={<NotificationsPage />} />
        <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['SALES_REP']} />}>
        <Route path="/sales/dashboard" element={<SalesDashboard />} />
        <Route path="/sales/customers" element={<CustomersPage mode="sales" />} />
        <Route path="/sales/new-order" element={<SalesNewOrderPage />} />
        <Route path="/sales/cart" element={<CartCheckoutPage mode="sales" />} />
        <Route path="/sales/orders" element={<OrdersPage mode="sales" />} />
        <Route path="/sales/payments" element={<FinancePage mode="sales" />} />
        <Route path="/sales/performance" element={<SalesPerformancePage />} />
        <Route path="/sales/returns" element={<ReturnsPage mode="sales" />} />
        <Route path="/sales/notifications" element={<NotificationsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        <Route path="/driver/notifications" element={<NotificationsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/customer/shop" element={<CustomerShopPage />} />
        <Route path="/customer/cart" element={<CartCheckoutPage mode="customer" />} />
        <Route path="/customer/orders" element={<OrdersPage mode="customer" />} />
        <Route path="/customer/invoices" element={<FinancePage mode="customer" />} />
        <Route path="/customer/notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
