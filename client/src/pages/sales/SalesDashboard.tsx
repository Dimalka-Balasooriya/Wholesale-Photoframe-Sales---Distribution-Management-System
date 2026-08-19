import { ChartNoAxesColumn, CreditCard, ShoppingCart, Target, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MetricCard } from '../../components/MetricCard';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api } from '../../services/api';
import type { Commission, Paginated, SalesTarget } from '../../types/catalog';

export function SalesDashboard() {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<{ data: SalesTarget[] }>('/performance/targets'),
      api.get<Paginated<Commission>>('/performance/commissions', { page: 1, pageSize: 25, search: '' })
    ])
      .then(([targetResponse, commissionResponse]) => {
        setTargets(targetResponse.data);
        setCommissions(commissionResponse.data);
      })
      .catch(() => undefined);
  }, []);

  const metrics = useMemo(() => {
    const target = targets[0];
    const commissionEarned = commissions
      .filter((commission) => commission.status === 'EARNED')
      .reduce((sum, commission) => sum + Number(commission.commission_amount), 0);
    return {
      actualSales: Number(target?.actual_sales ?? 0),
      outstandingTarget: Number(target?.target_amount ?? 0),
      commissionEarned,
      progress: Number(target?.progress_percent ?? 0)
    };
  }, [targets, commissions]);

  return (
    <DashboardLayout
      title="Sales Representative Dashboard"
      subtitle="Mobile-friendly customer visits, orders, collections, and targets."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={ShoppingCart} label="Today's Orders" tone="blue" value="0" />
        <MetricCard icon={CreditCard} label="Monthly Sales" tone="green" value={`Rs. ${metrics.actualSales.toLocaleString()}`} />
        <MetricCard icon={Users} label="My Customers" value="0" />
        <MetricCard icon={CreditCard} label="Monthly Target" tone="amber" value={`Rs. ${metrics.outstandingTarget.toLocaleString()}`} />
        <MetricCard icon={ChartNoAxesColumn} label="Commission Earned" value={`Rs. ${metrics.commissionEarned.toLocaleString()}`} />
        <MetricCard icon={Target} label="Target Progress" tone="blue" value={`${metrics.progress.toLocaleString()}%`} />
      </div>
    </DashboardLayout>
  );
}
