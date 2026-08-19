import { FormEvent, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Save } from 'lucide-react';
import { PageToolbar } from '../../components/PageToolbar';
import { PaginationControls } from '../../components/PaginationControls';
import { PaymentStatusBadge } from '../../components/PaymentStatusBadge';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type {
  Invoice,
  LedgerEntry,
  Paginated,
  Payment,
  PaymentMethod
} from '../../types/catalog';

interface FinancePageProps {
  mode: 'admin' | 'sales' | 'customer';
}

export function FinancePage({ mode }: FinancePageProps) {
  const [search, setSearch] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [invoicePagination, setInvoicePagination] = useState<Paginated<Invoice>['pagination']>();
  const [paymentPagination, setPaymentPagination] = useState<Paginated<Payment>['pagination']>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'CASH' as PaymentMethod | 'OTHER',
    referenceNumber: '',
    note: '',
    allowOverpayment: false
  });

  const title = useMemo(() => {
    if (mode === 'admin') return 'Payments & Invoices';
    if (mode === 'sales') return 'Customer Payments';
    return 'Invoices & Payments';
  }, [mode]);

  const loadFinance = async () => {
    setError('');
    const [invoiceResponse, paymentResponse, ledgerResponse] = await Promise.all([
      api.get<Paginated<Invoice>>('/finance/invoices', {
        page: invoicePage,
        pageSize: 10,
        search
      }),
      api.get<Paginated<Payment>>('/finance/payments', {
        page: paymentPage,
        pageSize: 10,
        search
      }),
      api.get<{ data: LedgerEntry[] }>('/finance/ledger')
    ]);
    setInvoices(invoiceResponse.data);
    setInvoicePagination(invoiceResponse.pagination);
    setPayments(paymentResponse.data);
    setPaymentPagination(paymentResponse.pagination);
    setLedger(ledgerResponse.data);
  };

  useEffect(() => {
    loadFinance().catch((err) => {
      setError(err instanceof ApiError ? err.message : 'Unable to load finance data');
    });
  }, [invoicePage, paymentPage, search]);

  const recordPayment = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/finance/payments', {
        invoiceId: Number(paymentForm.invoiceId),
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        note: paymentForm.note,
        allowOverpayment: paymentForm.allowOverpayment
      });
      setPaymentForm({
        invoiceId: '',
        amount: '',
        paymentMethod: 'CASH',
        referenceNumber: '',
        note: '',
        allowOverpayment: false
      });
      setMessage('Payment recorded and customer ledger updated.');
      await loadFinance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record payment');
    }
  };

  return (
    <DashboardLayout
      title={title}
      subtitle="Invoices, payments, outstanding balances, and customer ledger history."
    >
      <div className="space-y-5">
        <PageToolbar
          onSearchChange={(value) => {
            setInvoicePage(1);
            setPaymentPage(1);
            setSearch(value);
          }}
          placeholder="Search invoice, payment, order, or customer"
          search={search}
        >
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => void loadFinance()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </PageToolbar>

        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        {mode !== 'customer' ? (
          <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1.4fr_0.8fr_0.9fr_1fr_1fr_auto]" onSubmit={recordPayment}>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" required value={paymentForm.invoiceId} onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}>
              <option value="">Select unpaid invoice</option>
              {invoices.filter((invoice) => Number(invoice.outstanding_amount) > 0).map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} · {invoice.customer_name} · Rs. {Number(invoice.outstanding_amount).toLocaleString()}
                </option>
              ))}
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="1" placeholder="Amount" required type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod | 'OTHER' })}>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CARD">Card</option>
              <option value="COD">COD</option>
              <option value="OTHER">Other</option>
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Reference" value={paymentForm.referenceNumber} onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Note" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white" type="submit">
              <Save size={16} />
              Save
            </button>
          </form>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-bold text-ink">Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{invoice.invoice_number}</p>
                      <p className="text-xs text-slate-500">{invoice.order_number}</p>
                    </td>
                    <td className="px-4 py-3">{invoice.customer_name}</td>
                    <td className="px-4 py-3">Rs. {Number(invoice.grand_total).toLocaleString()}</td>
                    <td className="px-4 py-3">Rs. {Number(invoice.amount_paid).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">Rs. {Number(invoice.outstanding_amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={invoice.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <PaginationControls pagination={invoicePagination} onPageChange={setInvoicePage} />

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-bold text-ink">Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No payments found.</td></tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink">{payment.payment_number}</p>
                        <p className="text-xs text-slate-500">{new Date(payment.payment_date).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">{payment.customer_name}</td>
                      <td className="px-4 py-3">{payment.invoice_number}</td>
                      <td className="px-4 py-3 font-bold">Rs. {Number(payment.amount).toLocaleString()}</td>
                      <td className="px-4 py-3">{payment.payment_method}</td>
                      <td className="px-4 py-3">{payment.received_by_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <PaginationControls pagination={paymentPagination} onPageChange={setPaymentPage} />

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-bold text-ink">Customer Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Debit</th>
                  <th className="px-4 py-3">Credit</th>
                  <th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-slate-500">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">{entry.reference}</td>
                    <td className="px-4 py-3">{entry.type}</td>
                    <td className="px-4 py-3">Rs. {Number(entry.debit).toLocaleString()}</td>
                    <td className="px-4 py-3">Rs. {Number(entry.credit).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">Rs. {Number(entry.running_balance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
