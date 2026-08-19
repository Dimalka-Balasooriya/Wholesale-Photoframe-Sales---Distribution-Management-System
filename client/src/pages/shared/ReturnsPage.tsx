import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, RotateCcw, Save } from 'lucide-react';
import { PageToolbar } from '../../components/PageToolbar';
import { PaginationControls } from '../../components/PaginationControls';
import { ReturnStatusBadge } from '../../components/ReturnStatusBadge';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Paginated, RestockDecision, ReturnReason, ReturnRecord, ReturnStatus } from '../../types/catalog';

interface ReturnsPageProps {
  mode: 'admin' | 'sales';
}

const returnStatuses: ReturnStatus[] = ['APPROVED', 'REJECTED', 'RECEIVED', 'COMPLETED'];

export function ReturnsPage({ mode }: ReturnsPageProps) {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [pagination, setPagination] = useState<Paginated<ReturnRecord>['pagination']>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    orderId: '',
    orderItemId: '',
    quantity: '1',
    reason: 'CUSTOMER_REJECTION' as ReturnReason,
    restockDecision: 'RESTOCK' as RestockDecision,
    notes: ''
  });

  const title = useMemo(() => mode === 'admin' ? 'Returns' : 'Customer Returns', [mode]);

  const loadReturns = async () => {
    const response = await api.get<Paginated<ReturnRecord>>('/performance/returns', {
      page,
      pageSize: 12,
      search
    });
    setReturns(response.data);
    setPagination(response.pagination);
  };

  useEffect(() => {
    loadReturns().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load returns'));
  }, [page, search]);

  const createReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/performance/returns', {
        orderId: Number(form.orderId),
        reason: form.reason,
        restockDecision: form.restockDecision,
        notes: form.notes,
        items: [
          {
            orderItemId: Number(form.orderItemId),
            quantity: Number(form.quantity),
            conditionNote: form.notes
          }
        ]
      });
      setMessage('Return request created.');
      setForm({ ...form, orderId: '', orderItemId: '', quantity: '1', notes: '' });
      await loadReturns();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create return');
    }
  };

  const updateStatus = async (returnId: number, status: ReturnStatus) => {
    setError('');
    setMessage('');
    try {
      await api.patch(`/performance/returns/${returnId}/status`, { status });
      setMessage('Return status updated.');
      await loadReturns();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update return');
    }
  };

  return (
    <DashboardLayout title={title} subtitle="Return requests, approval, restocking, and commission adjustment.">
      <div className="space-y-5">
        <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6" onSubmit={(event) => void createReturn(event)}>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Order ID" required type="number" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Order item ID" required type="number" value={form.orderItemId} onChange={(e) => setForm({ ...form, orderItemId: e.target.value })} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="1" required type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as ReturnReason })}>
            <option value="CUSTOMER_REJECTION">Customer rejection</option>
            <option value="DAMAGED_PRODUCT">Damaged product</option>
            <option value="WRONG_PRODUCT">Wrong product</option>
            <option value="WRONG_SIZE">Wrong size</option>
            <option value="OTHER">Other</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.restockDecision} onChange={(e) => setForm({ ...form, restockDecision: e.target.value as RestockDecision })}>
            <option value="RESTOCK">Restock</option>
            <option value="DAMAGED">Damaged</option>
            <option value="NO_RESTOCK">No restock</option>
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white" type="submit">
            <RotateCcw size={16} />
            Create
          </button>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-6" placeholder="Return notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>

        <PageToolbar
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search return, order, or customer"
          search={search}
        >
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => void loadReturns()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </PageToolbar>

        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Return</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Refund</th>
                  <th className="px-4 py-3">Status</th>
                  {mode === 'admin' ? <th className="px-4 py-3">Action</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={mode === 'admin' ? 7 : 6}>No returns found.</td></tr>
                ) : returns.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{item.return_number}</p>
                      <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3">{item.order_number}</td>
                    <td className="px-4 py-3">{item.customer_name}</td>
                    <td className="px-4 py-3">{item.reason.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">Rs. {Number(item.refund_amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><ReturnStatusBadge status={item.status} /></td>
                    {mode === 'admin' ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {returnStatuses.map((status) => (
                            <button key={status} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" disabled={item.status === status || item.status === 'COMPLETED'} onClick={() => void updateStatus(item.id, status)} type="button">
                              <Save size={12} />
                              {status.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  );
}
