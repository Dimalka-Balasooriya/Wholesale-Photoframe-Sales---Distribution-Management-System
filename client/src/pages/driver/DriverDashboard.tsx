import { useEffect, useMemo, useState } from 'react';
import { CreditCard, MapPinned, Navigation, PackageCheck, Phone, RefreshCcw, Truck } from 'lucide-react';
import { DeliveryStatusBadge } from '../../components/DeliveryStatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { PageToolbar } from '../../components/PageToolbar';
import { PaginationControls } from '../../components/PaginationControls';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Delivery, DeliveryResult, Paginated, PaymentMethod } from '../../types/catalog';

export function DriverDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pagination, setPagination] = useState<Paginated<Delivery>['pagination']>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [result, setResult] = useState<DeliveryResult>('FULLY_DELIVERED');
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadDeliveries = async () => {
    const response = await api.get<Paginated<Delivery>>('/deliveries', {
      page,
      pageSize: 10,
      search
    });
    setDeliveries(response.data);
    setPagination(response.pagination);
  };

  useEffect(() => {
    loadDeliveries().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load deliveries'));
  }, [page, search]);

  const metrics = useMemo(() => {
    const active = deliveries.filter((delivery) => ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(delivery.status));
    const completed = deliveries.filter((delivery) => ['FULLY_DELIVERED', 'PARTIALLY_DELIVERED'].includes(delivery.status));
    const cashToCollect = active.reduce((sum, delivery) => sum + Number(delivery.outstanding_amount), 0);
    const cashCollected = deliveries.reduce((sum, delivery) => sum + Number(delivery.amount_collected), 0);
    return {
      today: deliveries.length,
      active: active.length,
      completed: completed.length,
      cashToCollect,
      cashCollected
    };
  }, [deliveries]);

  const start = async (delivery: Delivery) => {
    setError('');
    setMessage('');
    try {
      await api.patch(`/deliveries/${delivery.id}/start`, {});
      setMessage(`${delivery.delivery_number} started.`);
      await loadDeliveries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to start delivery');
    }
  };

  const complete = async () => {
    if (!selected) return;
    setError('');
    setMessage('');
    try {
      await api.patch(`/deliveries/${selected.id}/complete`, {
        result,
        paymentReceived,
        paymentMethod: paymentReceived ? paymentMethod : undefined,
        amountReceived: paymentReceived ? Number(amountReceived) : 0,
        referenceNumber,
        notes
      });
      setMessage(`${selected.delivery_number} completed.`);
      setSelected(null);
      setPaymentReceived(false);
      setAmountReceived('');
      setReferenceNumber('');
      setNotes('');
      await loadDeliveries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to complete delivery');
    }
  };

  return (
    <DashboardLayout
      title="Driver Dashboard"
      subtitle="Assigned deliveries, route actions, and cash collection."
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Truck} label="Today's Deliveries" tone="blue" value={String(metrics.today)} />
          <MetricCard icon={MapPinned} label="Pending Deliveries" tone="amber" value={String(metrics.active)} />
          <MetricCard icon={PackageCheck} label="Completed" tone="green" value={String(metrics.completed)} />
          <MetricCard icon={CreditCard} label="Cash to Collect" tone="amber" value={`Rs. ${metrics.cashToCollect.toLocaleString()}`} />
          <MetricCard icon={CreditCard} label="Cash Collected" tone="green" value={`Rs. ${metrics.cashCollected.toLocaleString()}`} />
        </div>

        <PageToolbar
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search delivery, order, or customer"
          search={search}
        >
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => void loadDeliveries()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </PageToolbar>

        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <section className="grid gap-4 xl:grid-cols-2">
          {deliveries.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">No deliveries assigned.</p>
          ) : (
            deliveries.map((delivery) => {
              const mapsQuery = encodeURIComponent(`${delivery.delivery_address ?? ''} ${delivery.district ?? ''}`);
              return (
                <article key={delivery.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">{delivery.delivery_number}</p>
                      <h3 className="mt-1 text-lg font-bold text-ink">{delivery.order_number}</h3>
                      <p className="text-sm font-semibold text-slate-600">{delivery.customer_name}</p>
                    </div>
                    <DeliveryStatusBadge status={delivery.status} />
                  </div>

                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-slate-500">Phone</dt><dd className="font-semibold">{delivery.customer_phone}</dd></div>
                    <div><dt className="text-slate-500">District</dt><dd className="font-semibold">{delivery.district ?? '-'}</dd></div>
                    <div><dt className="text-slate-500">Order Amount</dt><dd className="font-semibold">Rs. {Number(delivery.grand_total).toLocaleString()}</dd></div>
                    <div><dt className="text-slate-500">Outstanding</dt><dd className="font-semibold">Rs. {Number(delivery.outstanding_amount).toLocaleString()}</dd></div>
                  </dl>
                  <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{delivery.delivery_address ?? 'No address recorded'}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700" href={`tel:${delivery.customer_phone}`}>
                      <Phone size={16} />
                      Call
                    </a>
                    <a className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} rel="noreferrer" target="_blank">
                      <Navigation size={16} />
                      Maps
                    </a>
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={delivery.status !== 'ASSIGNED'}
                      onClick={() => void start(delivery)}
                      type="button"
                    >
                      Start
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={delivery.status !== 'OUT_FOR_DELIVERY'}
                      onClick={() => {
                        setSelected(delivery);
                        setAmountReceived(Number(delivery.outstanding_amount) > 0 ? String(Number(delivery.outstanding_amount)) : '');
                      }}
                      type="button"
                    >
                      Mark Delivered
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <PaginationControls pagination={pagination} onPageChange={setPage} />

        {selected ? (
          <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
            <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Complete Delivery</p>
                  <h3 className="text-lg font-bold text-ink">{selected.order_number}</h3>
                </div>
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold" onClick={() => setSelected(null)} type="button">Close</button>
              </div>
              <div className="mt-4 grid gap-3">
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={result} onChange={(e) => setResult(e.target.value as DeliveryResult)}>
                  <option value="FULLY_DELIVERED">Fully delivered</option>
                  <option value="PARTIALLY_DELIVERED">Partially delivered</option>
                  <option value="CUSTOMER_NOT_AVAILABLE">Customer not available</option>
                  <option value="DELIVERY_FAILED">Delivery failed</option>
                </select>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input checked={paymentReceived} onChange={(e) => setPaymentReceived(e.target.checked)} type="checkbox" />
                  Payment received
                </label>
                {paymentReceived ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank transfer</option>
                      <option value="CARD">Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" placeholder="Amount received" type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} />
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="Reference number" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
                  </div>
                ) : null}
                <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Delivery notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white" onClick={() => void complete()} type="button">
                  Save Completion
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
