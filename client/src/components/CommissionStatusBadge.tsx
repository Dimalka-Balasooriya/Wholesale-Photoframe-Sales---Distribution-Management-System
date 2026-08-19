import type { CommissionStatus } from '../types/catalog';

const tones: Record<CommissionStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  EARNED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PAID: 'bg-blue-50 text-blue-700 ring-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200'
};

export function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ${tones[status]}`}>
      {status}
    </span>
  );
}
