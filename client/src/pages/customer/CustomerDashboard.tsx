import { CreditCard, FileText, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
import { MetricCard } from '../../components/MetricCard';
import { DashboardLayout } from '../../layouts/DashboardLayout';

export function CustomerDashboard() {
  return (
    <DashboardLayout
      title="Customer Dashboard"
      subtitle="Wholesale shopping, order tracking, invoices, and payments."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={CreditCard} label="Outstanding Balance" tone="amber" value="Rs. 0" />
        <MetricCard icon={CreditCard} label="Available Credit" tone="green" value="Rs. 0" />
        <MetricCard icon={ShoppingCart} label="Pending Orders" tone="blue" value="0" />
        <MetricCard icon={Truck} label="Active Deliveries" value="0" />
        <MetricCard icon={PackageCheck} label="Previous Orders" value="0" />
        <MetricCard icon={FileText} label="Recent Payments" value="0" />
      </div>
    </DashboardLayout>
  );
}
