import type { DeliveryStatus } from '../types/catalog';

const tones: Record<DeliveryStatus, string> = {
  ASSIGNED: 'bg-teal-50 text-teal-700 ring-teal-200',
  OUT_FOR_DELIVERY: 'bg-violet-50 text-violet-700 ring-violet-200',
  FULLY_DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PARTIALLY_DELIVERED: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  CUSTOMER_NOT_AVAILABLE: 'bg-orange-50 text-orange-700 ring-orange-200',
  DELIVERY_FAILED: 'bg-red-50 text-red-700 ring-red-200',
  CANCELLED: 'bg-slate-100 text-slate-700 ring-slate-200'
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ${tones[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
