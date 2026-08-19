import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { DeliveryStatusBadge } from '../../components/DeliveryStatusBadge';
import { PageToolbar } from '../../components/PageToolbar';
import { PaginationControls } from '../../components/PaginationControls';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Delivery, DeliveryStatus, Paginated } from '../../types/catalog';

const statuses: Array<DeliveryStatus | ''> = [
  '',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'FULLY_DELIVERED',
  'PARTIALLY_DELIVERED',
  'CUSTOMER_NOT_AVAILABLE',
  'DELIVERY_FAILED'
];

export function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pagination, setPagination] = useState<Paginated<Delivery>['pagination']>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [error, setError] = useState('');

  const loadDeliveries = async () => {
    const response = await api.get<Paginated<Delivery>>('/deliveries', {
      page,
      pageSize: 12,
      search,
      status
    });
    setDeliveries(response.data);
    setPagination(response.pagination);
  };

  useEffect(() => {
    loadDeliveries().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load deliveries'));
  }, [page, search, status]);

  return (
    <DashboardLayout title="Deliveries" subtitle="Driver assignments, active routes, completion results, and cash collection.">
      <div className="space-y-5">
        <PageToolbar
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search delivery, order, or customer"
          search={search}
        >
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as DeliveryStatus | '');
          }}>
            {statuses.map((item) => (
              <option key={item || 'ALL'} value={item}>
                {item ? item.replace(/_/g, ' ') : 'All statuses'}
              </option>
            ))}
          </select>
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => void loadDeliveries()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </PageToolbar>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Collected</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No deliveries found.</td></tr>
                ) : (
                  deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink">{delivery.delivery_number}</p>
                        <p className="text-xs text-slate-500">{delivery.order_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{delivery.customer_name}</p>
                        <p className="text-xs text-slate-500">{delivery.district ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3">{delivery.driver_name}</td>
                      <td className="px-4 py-3">Rs. {Number(delivery.outstanding_amount).toLocaleString()}</td>
                      <td className="px-4 py-3">Rs. {Number(delivery.amount_collected).toLocaleString()}</td>
                      <td className="px-4 py-3"><DeliveryStatusBadge status={delivery.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <PaginationControls pagination={pagination} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  );
}
