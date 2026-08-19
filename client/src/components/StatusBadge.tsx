import type { Status } from '../types/catalog';

export function StatusBadge({ status }: { status: Status }) {
  const className =
    status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ${className}`}>
      {status}
    </span>
  );
}
