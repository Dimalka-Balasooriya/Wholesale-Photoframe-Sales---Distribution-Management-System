import { FormEvent, useEffect, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { PaginationControls } from '../../components/PaginationControls';
import { PageToolbar } from '../../components/PageToolbar';
import { StatusBadge } from '../../components/StatusBadge';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Customer, CustomerType, Paginated } from '../../types/catalog';

const initialForm = {
  businessName: '',
  ownerName: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  district: '',
  province: '',
  customerType: 'WHOLESALE_CUSTOMER' as CustomerType,
  creditLimit: '0',
  notes: ''
};

export function CustomersPage({ mode }: { mode: 'admin' | 'sales' }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Paginated<Customer>['pagination']>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCustomers = async () => {
    const response = await api.get<Paginated<Customer>>('/customers', {
      page,
      pageSize: 12,
      search
    });
    setCustomers(response.data);
    setPagination(response.pagination);
  };

  useEffect(() => {
    loadCustomers().catch((err) => {
      setError(err instanceof ApiError ? err.message : 'Unable to load customers');
    });
  }, [page, search]);

  const submitCustomer = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/customers', {
        ...form,
        creditLimit: Number(form.creditLimit)
      });
      setForm(initialForm);
      setMessage('Customer created.');
      await loadCustomers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create customer');
    }
  };

  return (
    <DashboardLayout
      title={mode === 'admin' ? 'Customers' : 'My Customers'}
      subtitle={mode === 'admin' ? 'Manage wholesale customer profiles and credit settings.' : 'View assigned customers and register new prospects.'}
    >
      <div className="space-y-5">
        <PageToolbar
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search business, owner, phone, city, or district"
          search={search}
        >
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => void loadCustomers()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </PageToolbar>

        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitCustomer}>
          <h3 className="text-base font-bold text-ink">Add Customer</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Business / shop name" required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Owner name" required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}>
              <option value="CASH_CUSTOMER">Cash customer</option>
              <option value="CREDIT_CUSTOMER">Credit customer</option>
              <option value="WHOLESALE_CUSTOMER">Wholesale customer</option>
              <option value="VIP_CUSTOMER">VIP customer</option>
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" placeholder="Credit limit" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm xl:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white" type="submit">
            <Plus size={16} />
            Add Customer
          </button>
        </form>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Credit</th>
                  <th className="px-4 py-3">Sales Rep</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{customer.business_name}</p>
                      <p className="text-xs text-slate-500">{customer.owner_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{customer.phone}</p>
                      <p className="text-xs text-slate-500">{customer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{customer.city || '-'} · {customer.district || '-'}</td>
                    <td className="px-4 py-3 font-semibold">{customer.customer_type}</td>
                    <td className="px-4 py-3">
                      <p>Limit Rs. {Number(customer.credit_limit).toLocaleString()}</p>
                      <p className="text-xs text-amber-700">Outstanding Rs. {Number(customer.outstanding_balance).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3">{customer.assigned_sales_rep_name || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={customer.status} /></td>
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
