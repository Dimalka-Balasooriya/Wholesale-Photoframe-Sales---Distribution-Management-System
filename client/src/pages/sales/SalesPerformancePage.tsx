import { useEffect, useMemo, useState } from 'react';
import { ChartNoAxesColumn, Target } from 'lucide-react';
import { CommissionStatusBadge } from '../../components/CommissionStatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { PaginationControls } from '../../components/PaginationControls';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Commission, Paginated, SalesTarget } from '../../types/catalog';

export function SalesPerformancePage() {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [pagination, setPagination] = useState<Paginated<Commission>['pagination']>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [targetResponse, commissionResponse] = await Promise.all([
      api.get<{ data: SalesTarget[] }>('/performance/targets'),
      api.get<Paginated<Commission>>('/performance/commissions', { page, pageSize: 10, search: '' })
    ]);
    setTargets(targetResponse.data);
    setCommissions(commissionResponse.data);
    setPagination(commissionResponse.pagination);
  };

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load performance'));
  }, [page]);

  const summary = useMemo(() => {
    const target = targets[0];
    return {
      targetAmount: Number(target?.target_amount ?? 0),
      actualSales: Number(target?.actual_sales ?? 0),
      progress: Number(target?.progress_percent ?? 0),
      commissionEarned: commissions
        .filter((commission) => commission.status === 'EARNED')
        .reduce((sum, commission) => sum + Number(commission.commission_amount), 0)
    };
  }, [targets, commissions]);

  return (
    <DashboardLayout title="Commission & Targets" subtitle="Monthly target progress and earned commission.">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Target} label="Monthly Target" tone="blue" value={`Rs. ${summary.targetAmount.toLocaleString()}`} />
          <MetricCard icon={ChartNoAxesColumn} label="Actual Sales" tone="green" value={`Rs. ${summary.actualSales.toLocaleString()}`} />
          <MetricCard icon={Target} label="Target Progress" tone="amber" value={`${summary.progress.toLocaleString()}%`} />
          <MetricCard icon={ChartNoAxesColumn} label="Commission Earned" value={`Rs. ${summary.commissionEarned.toLocaleString()}`} />
        </div>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Order Total</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commissions.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No commissions earned yet.</td></tr>
                ) : commissions.map((commission) => (
                  <tr key={commission.id}>
                    <td className="px-4 py-3 font-bold text-ink">{commission.order_number}</td>
                    <td className="px-4 py-3">{commission.customer_name}</td>
                    <td className="px-4 py-3">Rs. {Number(commission.order_total).toLocaleString()}</td>
                    <td className="px-4 py-3">{Number(commission.commission_percent).toLocaleString()}%</td>
                    <td className="px-4 py-3 font-bold">Rs. {Number(commission.commission_amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><CommissionStatusBadge status={commission.status} /></td>
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
