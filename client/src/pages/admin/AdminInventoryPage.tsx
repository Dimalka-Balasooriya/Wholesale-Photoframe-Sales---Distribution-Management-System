import { FormEvent, useEffect, useState } from 'react';
import { RefreshCcw, Save } from 'lucide-react';
import { PaginationControls } from '../../components/PaginationControls';
import { PageToolbar } from '../../components/PageToolbar';
import { StatusBadge } from '../../components/StatusBadge';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Paginated, StockTransaction, StockTransactionType, Variant } from '../../types/catalog';

const transactionTypes: StockTransactionType[] = [
  'STOCK_IN',
  'MANUAL_ADJUSTMENT',
  'DAMAGED',
  'RETURNED',
  'CANCELLED_ORDER_RESTOCK'
];

export function AdminInventoryPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [variantPagination, setVariantPagination] = useState<Paginated<Variant>['pagination']>();
  const [transactionPagination, setTransactionPagination] = useState<Paginated<StockTransaction>['pagination']>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [transactionPage, setTransactionPage] = useState(1);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    variantId: '',
    quantityChanged: '',
    transactionType: 'STOCK_IN' as StockTransactionType,
    note: ''
  });

  const loadInventory = async () => {
    setError('');
    const [variantResponse, transactionResponse] = await Promise.all([
      api.get<Paginated<Variant>>('/products/variants/list', {
        page,
        pageSize: 12,
        search,
        lowStockOnly
      }),
      api.get<Paginated<StockTransaction>>('/products/stock-transactions', {
        page: transactionPage,
        pageSize: 8,
        search
      })
    ]);
    setVariants(variantResponse.data);
    setVariantPagination(variantResponse.pagination);
    setTransactions(transactionResponse.data);
    setTransactionPagination(transactionResponse.pagination);
  };

  useEffect(() => {
    loadInventory().catch((err) => {
      setError(err instanceof ApiError ? err.message : 'Unable to load inventory');
    });
  }, [page, transactionPage, search, lowStockOnly]);

  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/products/stock-adjustments', {
        variantId: Number(form.variantId),
        quantityChanged: Number(form.quantityChanged),
        transactionType: form.transactionType,
        note: form.note
      });
      setForm({ variantId: '', quantityChanged: '', transactionType: 'STOCK_IN', note: '' });
      setMessage('Stock updated and transaction recorded.');
      await loadInventory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to adjust stock');
    }
  };

  return (
    <DashboardLayout
      title="Inventory"
      subtitle="View current stock, low stock, and complete stock transaction history."
    >
      <div className="space-y-5">
        <PageToolbar
          onSearchChange={(value) => {
            setPage(1);
            setTransactionPage(1);
            setSearch(value);
          }}
          placeholder="Search product, SKU, size, or transaction"
          search={search}
        >
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            <input checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} type="checkbox" />
            Low stock
          </label>
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => void loadInventory()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </PageToolbar>

        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1.2fr_0.7fr_0.9fr_1.4fr_auto]" onSubmit={submitAdjustment}>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" required value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })}>
            <option value="">Select variant</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>{variant.product_name} · {variant.size} · {variant.sku}</option>
            ))}
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="+/- quantity" required type="number" value={form.quantityChanged} onChange={(e) => setForm({ ...form, quantityChanged: e.target.value })} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value as StockTransactionType })}>
            {transactionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white" type="submit">
            <Save size={16} />
            Save
          </button>
        </form>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Wholesale</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Low Level</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variants.map((variant) => (
                  <tr key={variant.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{variant.product_name}</p>
                      <p className="text-xs text-slate-500">{variant.size} · {variant.category}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{variant.sku}</td>
                    <td className="px-4 py-3">Rs. {Number(variant.wholesale_price).toLocaleString()}</td>
                    <td className={`px-4 py-3 font-bold ${variant.current_stock_quantity <= variant.low_stock_level ? 'text-amber-700' : 'text-ink'}`}>{variant.current_stock_quantity}</td>
                    <td className="px-4 py-3">{variant.low_stock_level}</td>
                    <td className="px-4 py-3"><StatusBadge status={variant.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <PaginationControls pagination={variantPagination} onPageChange={setPage} />

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-bold text-ink">Stock Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Changed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 text-slate-500">{new Date(transaction.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{transaction.product_name}</p>
                      <p className="text-xs text-slate-500">{transaction.size} · {transaction.sku}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{transaction.transaction_type}</td>
                    <td className="px-4 py-3 font-bold">{transaction.quantity_changed}</td>
                    <td className="px-4 py-3">{transaction.previous_quantity} → {transaction.new_quantity}</td>
                    <td className="px-4 py-3">{transaction.changed_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <PaginationControls pagination={transactionPagination} onPageChange={setTransactionPage} />
      </div>
    </DashboardLayout>
  );
}
