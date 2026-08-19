import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Boxes, CreditCard, PackageCheck, ShoppingCart, Truck, Users } from 'lucide-react';
import { MetricCard } from '../../components/MetricCard';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { ReportsPayload } from '../../types/catalog';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function money(value: string | number) {
  return `Rs. ${Number(value ?? 0).toLocaleString()}`;
}

function DataTable({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function AdminReportsPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [reports, setReports] = useState<ReportsPayload>();
  const [error, setError] = useState('');

  const loadReports = async () => {
    const response = await api.get<ReportsPayload>('/insights/reports', { dateFrom, dateTo });
    setReports(response);
  };

  useEffect(() => {
    loadReports().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load reports'));
  }, [dateFrom, dateTo]);

  const chartData = useMemo(
    () => reports?.salesByDay.map((point) => ({ ...point, value: Number(point.value) })) ?? [],
    [reports]
  );
  const statusData = useMemo(
    () => reports?.ordersByStatus.map((point) => ({ ...point, value: Number(point.value) })) ?? [],
    [reports]
  );

  return (
    <DashboardLayout title="Reports" subtitle="Sales, inventory, customer, delivery, and financial performance.">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Report Range</h3>
            <p className="mt-1 text-sm text-slate-500">Filter operational totals by order, payment, and delivery date.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase text-slate-500">
              From
              <input
                className="mt-1 block h-10 rounded-md border border-slate-300 px-3 text-sm font-medium normal-case text-ink"
                onChange={(event) => setDateFrom(event.target.value)}
                type="date"
                value={dateFrom}
              />
            </label>
            <label className="text-xs font-bold uppercase text-slate-500">
              To
              <input
                className="mt-1 block h-10 rounded-md border border-slate-300 px-3 text-sm font-medium normal-case text-ink"
                onChange={(event) => setDateTo(event.target.value)}
                type="date"
                value={dateTo}
              />
            </label>
          </div>
        </div>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={ShoppingCart} label="Gross Sales" tone="blue" value={money(reports?.summary.gross_sales ?? 0)} />
          <MetricCard icon={CreditCard} label="Payments Collected" tone="green" value={money(reports?.summary.payment_collected ?? 0)} />
          <MetricCard icon={Users} label="Active Customers" value={String(reports?.summary.active_customers ?? 0)} />
          <MetricCard icon={Boxes} label="Low Stock Variants" tone="amber" value={String(reports?.summary.low_stock_variants ?? 0)} />
          <MetricCard icon={ShoppingCart} label="Orders" value={String(reports?.summary.order_count ?? 0)} />
          <MetricCard icon={CreditCard} label="Outstanding" tone="amber" value={money(reports?.summary.outstanding_amount ?? 0)} />
          <MetricCard icon={Truck} label="Deliveries" tone="green" value={String(reports?.summary.delivery_count ?? 0)} />
          <MetricCard icon={PackageCheck} label="Returns" value={String(reports?.summary.return_count ?? 0)} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-ink">Sales Trend</h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Line dataKey="value" name="Sales" stroke="#2563eb" strokeWidth={2} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-ink">Orders By Status</h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={statusData} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" name="Orders" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <DataTable title="Best Sellers">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Sales</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(reports?.topProducts ?? []).map((product) => (
                  <tr key={`${product.product_name}-${product.variant_size}`}>
                    <td className="px-4 py-3 font-semibold text-ink">{product.product_name} <span className="text-slate-500">{product.variant_size}</span></td>
                    <td className="px-4 py-3">{Number(product.quantity_sold).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">{money(product.sales_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>

          <DataTable title="Top Customers & Credit">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Sales</th><th className="px-4 py-3">Outstanding</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(reports?.topCustomers ?? []).map((customer) => (
                  <tr key={customer.business_name}>
                    <td className="px-4 py-3 font-semibold text-ink">{customer.business_name}</td>
                    <td className="px-4 py-3">{money(customer.sales_total)}</td>
                    <td className="px-4 py-3 font-bold">{money(customer.outstanding_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>

          <DataTable title="Sales Rep Performance">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr><th className="px-4 py-3">Rep</th><th className="px-4 py-3">Sales</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Customers</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(reports?.salesReps ?? []).map((rep) => (
                  <tr key={rep.id}>
                    <td className="px-4 py-3 font-semibold text-ink">{rep.sales_rep_name}</td>
                    <td className="px-4 py-3">{money(rep.sales_total)}</td>
                    <td className="px-4 py-3 font-bold">{money(rep.commission_total)}</td>
                    <td className="px-4 py-3">{rep.customer_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>

          <DataTable title="Driver Cash & Delivery">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr><th className="px-4 py-3">Driver</th><th className="px-4 py-3">Deliveries</th><th className="px-4 py-3">Delivered</th><th className="px-4 py-3">Cash</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(reports?.drivers ?? []).map((driver) => (
                  <tr key={driver.id}>
                    <td className="px-4 py-3 font-semibold text-ink">{driver.driver_name}</td>
                    <td className="px-4 py-3">{driver.delivery_count}</td>
                    <td className="px-4 py-3">{driver.delivered_count}</td>
                    <td className="px-4 py-3 font-bold">{money(driver.cash_collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </div>
      </div>
    </DashboardLayout>
  );
}
