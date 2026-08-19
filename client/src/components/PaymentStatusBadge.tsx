import type { PaymentStatus } from '../types/catalog';

const tones: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-50 text-red-700 ring-red-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 ring-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  OVERDUE: 'bg-rose-50 text-rose-700 ring-rose-200'
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ${tones[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
