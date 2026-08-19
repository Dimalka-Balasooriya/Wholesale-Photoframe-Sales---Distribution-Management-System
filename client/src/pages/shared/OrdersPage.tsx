import { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCcw, Save, Truck } from 'lucide-react';
import { OrderStatusBadge } from '../../components/OrderStatusBadge';
import { PaginationControls } from '../../components/PaginationControls';
import { PageToolbar } from '../../components/PageToolbar';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Driver, Order, OrderDetails, OrderStatus, Paginated } from '../../types/catalog';

const nextStatuses: OrderStatus[] = [
  'APPROVED',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'DRIVER_ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED'
];

interface OrdersPageProps {
  mode: 'admin' | 'sales' | 'customer';
}

export function OrdersPage({ mode }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Paginated<Order>['pagination']>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OrderDetails | null>(null);
  const [status, setStatus] = useState<OrderStatus>('APPROVED');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const title = useMemo(() => {
    if (mode === 'admin') return 'Orders';
    if (mode === 'sales') return 'My Orders';
    return 'My Orders';
  }, [mode]);

  const loadOrders = async () => {
    const response = await api.get<Paginated<Order>>('/orders', { page, pageSize: 12, search });
    setOrders(response.data);
    setPagination(response.pagination);
  };

  useEffect(() => {
    loadOrders().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load orders'));
  }, [page, search]);

  useEffect(() => {
    if (mode !== 'admin') return;
    api
      .get<{ data: Driver[] }>('/deliveries/drivers')
      .then((response) => setDrivers(response.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load drivers'));
  }, [mode]);

  const openOrder = async (orderId: number) => {
    setError('');
    try {
      const response = await api.get<OrderDetails>(`/orders/${orderId}`);
      setSelected(response);
      setStatus(response.order.order_status === 'PENDING' ? 'APPROVED' : response.order.order_status);
      setDriverId('');
      setDeliveryNote('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to open order');
    }
  };

  const assignDriver = async () => {
    if (!selected || !driverId) return;
    setError('');
    setMessage('');
    try {
      await api.post('/deliveries/assign', {
        orderId: selected.order.id,
        driverId: Number(driverId),
        notes: deliveryNote
      });
      setMessage('Driver assigned for delivery.');
      setDeliveryNote('');
      await loadOrders();
      await openOrder(selected.order.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to assign driver');
    }
  };

  const updateStatus = async () => {
    if (!selected) return;
    setError('');
    setMessage('');
    try {
      await api.patch(`/orders/${selected.order.id}/status`, { status, note });
      setMessage('Order status updated.');
      setNote('');
      await loadOrders();
      await openOrder(selected.order.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update status');
    }
  };

  return (
    <DashboardLayout title={title} subtitle="Track orders, line items, totals, and status history.">
      <div className="space-y-5">
        <PageToolbar
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search order number or customer"
          search={search}
        >
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => void loadOrders()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </PageToolbar>
        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No orders found.</td></tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-ink">{order.order_number}</p>
                          <p className="text-xs text-slate-500">{new Date(order.order_date).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-3">{order.customer_name}</td>
                        <td className="px-4 py-3 font-bold">Rs. {Number(order.grand_total).toLocaleString()}</td>
                        <td className="px-4 py-3">{order.payment_method}</td>
                        <td className="px-4 py-3"><OrderStatusBadge status={order.order_status} /></td>
                        <td className="px-4 py-3">
                          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold" onClick={() => void openOrder(order.id)} type="button">
                            <Eye size={14} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            {selected ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Selected Order</p>
                  <h3 className="mt-1 text-lg font-bold text-ink">{selected.order.order_number}</h3>
                  <div className="mt-2"><OrderStatusBadge status={selected.order.order_status} /></div>
                </div>
                <div className="space-y-2">
                  {selected.items.map((item) => (
                    <div key={item.id} className="rounded-md bg-slate-50 p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold">{item.product_name_snapshot} · {item.variant_size_snapshot}</span>
                        <span>Rs. {Number(item.line_total).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500">Qty {item.quantity} · Rs. {Number(item.unit_price).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between"><dt>Subtotal</dt><dd>Rs. {Number(selected.order.subtotal).toLocaleString()}</dd></div>
                  <div className="flex justify-between"><dt>Discount</dt><dd>Rs. {Number(selected.order.discount_amount).toLocaleString()}</dd></div>
                  <div className="flex justify-between"><dt>Delivery</dt><dd>Rs. {Number(selected.order.delivery_charge).toLocaleString()}</dd></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold"><dt>Grand Total</dt><dd>Rs. {Number(selected.order.grand_total).toLocaleString()}</dd></div>
                </dl>
                {mode === 'admin' ? (
                  <div className="space-y-3">
                    <div className="space-y-3 rounded-md border border-slate-200 p-3">
                      <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                        {nextStatuses.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
                      </select>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Status note" value={note} onChange={(e) => setNote(e.target.value)} />
                      <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white" onClick={() => void updateStatus()} type="button">
                        <Save size={16} />
                        Update Status
                      </button>
                    </div>
                    <div className="space-y-3 rounded-md border border-slate-200 p-3">
                      <p className="text-xs font-bold uppercase text-slate-500">Delivery Assignment</p>
                      <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                        <option value="">Select active driver</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} {driver.vehicle_number ? `- ${driver.vehicle_number}` : ''}
                          </option>
                        ))}
                      </select>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Delivery note" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
                      <button
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        disabled={!driverId || !['READY_FOR_DELIVERY', 'DRIVER_ASSIGNED'].includes(selected.order.order_status)}
                        onClick={() => void assignDriver()}
                        type="button"
                      >
                        <Truck size={16} />
                        Assign Driver
                      </button>
                    </div>
                  </div>
                ) : null}
                <div>
                  <h4 className="font-bold text-ink">Timeline</h4>
                  <div className="mt-3 space-y-3">
                    {selected.history.map((history) => (
                      <div key={history.id} className="border-l-2 border-blue-200 pl-3 text-sm">
                        <p className="font-semibold">{history.new_status.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500">{new Date(history.created_at).toLocaleString()} · {history.changed_by_name}</p>
                        {history.note ? <p className="mt-1 text-slate-600">{history.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select an order to view items and timeline.</p>
            )}
          </aside>
        </div>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  );
}
