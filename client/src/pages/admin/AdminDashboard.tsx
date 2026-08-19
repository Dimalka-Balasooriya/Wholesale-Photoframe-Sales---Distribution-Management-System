import { Boxes, CreditCard, PackageCheck, ShoppingCart, Truck, Users } from 'lucide-react';
import { MetricCard } from '../../components/MetricCard';
import { DashboardLayout } from '../../layouts/DashboardLayout';

export function AdminDashboard() {
  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Company-wide sales, stock, delivery, and user controls."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={CreditCard} label="Today's Sales" tone="green" value="Rs. 0" />
        <MetricCard icon={ShoppingCart} label="Today's Orders" tone="blue" value="0" />
        <MetricCard icon={PackageCheck} label="Pending Orders" tone="amber" value="0" />
        <MetricCard icon={Truck} label="Ready for Delivery" value="0" />
        <MetricCard icon={Users} label="Total Customers" value="0" />
        <MetricCard icon={Boxes} label="Low Stock Products" tone="amber" value="0" />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-ink">Sales Overview</h3>
          <div className="mt-4 grid h-64 place-items-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">
            Charts arrive in later phases after orders and payments are live.
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-ink">Recent Activity</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-500">
            <p>No activity yet.</p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
