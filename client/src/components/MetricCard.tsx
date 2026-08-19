import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'amber' | 'slate';
}

const tones = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-700'
};

export function MetricCard({ label, value, icon: Icon, tone = 'slate' }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </article>
  );
}
