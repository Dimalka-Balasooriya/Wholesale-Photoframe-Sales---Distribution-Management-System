import { useEffect, useMemo, useState } from 'react';
import { Save, Target } from 'lucide-react';
import { MetricCard } from '../../components/MetricCard';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { SalesRepOption, SalesTarget } from '../../types/catalog';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function AdminTargetsPage() {
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState({ salesRepId: '', targetAmount: '100000', notes: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const totals = useMemo(() => ({
    target: targets.reduce((sum, target) => sum + Number(target.target_amount), 0),
    actual: targets.reduce((sum, target) => sum + Number(target.actual_sales), 0),
    commission: targets.reduce((sum, target) => sum + Number(target.commission_earned), 0)
  }), [targets]);

  const loadData = async () => {
    const [repResponse, targetResponse] = await Promise.all([
      api.get<{ data: SalesRepOption[] }>('/performance/sales-reps'),
      api.get<{ data: SalesTarget[] }>('/performance/targets', { month })
    ]);
    setSalesReps(repResponse.data);
    setTargets(targetResponse.data);
    if (!form.salesRepId && repResponse.data[0]) {
      setForm((current) => ({ ...current, salesRepId: String(repResponse.data[0].id) }));
    }
  };

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load targets'));
  }, [month]);

  const saveTarget = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/performance/targets', {
        salesRepId: Number(form.salesRepId),
        targetMonth: month,
        targetAmount: Number(form.targetAmount),
        notes: form.notes
      });
      setMessage('Sales target saved.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save target');
    }
  };

  return (
    <DashboardLayout title="Sales Targets" subtitle="Monthly sales targets, progress, and earned commission.">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard icon={Target} label="Target Value" tone="blue" value={`Rs. ${totals.target.toLocaleString()}`} />
          <MetricCard icon={Target} label="Actual Sales" tone="green" value={`Rs. ${totals.actual.toLocaleString()}`} />
          <MetricCard icon={Target} label="Commission Earned" tone="amber" value={`Rs. ${totals.commission.toLocaleString()}`} />
        </div>

        <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5" onSubmit={(event) => void saveTarget(event)}>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" required value={form.salesRepId} onChange={(e) => setForm({ ...form, salesRepId: e.target.value })}>
            {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" required type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white" type="submit">
            <Save size={16} />
            Save Target
          </button>
        </form>

        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Sales Rep</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targets.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No targets found for this month.</td></tr>
                ) : targets.map((target) => (
                  <tr key={target.id}>
                    <td className="px-4 py-3 font-semibold">{target.sales_rep_name}</td>
                    <td className="px-4 py-3">{target.target_month}</td>
                    <td className="px-4 py-3">Rs. {Number(target.target_amount).toLocaleString()}</td>
                    <td className="px-4 py-3">Rs. {Number(target.actual_sales).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-brand" style={{ width: `${Math.min(100, Number(target.progress_percent))}%` }} />
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-600">{Number(target.progress_percent).toLocaleString()}%</p>
                    </td>
                    <td className="px-4 py-3 font-bold">Rs. {Number(target.commission_earned).toLocaleString()}</td>
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
