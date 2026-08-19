import type { OrderStatus } from '../types/catalog';

const tones: Record<OrderStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  DISCOUNT_APPROVAL_REQUIRED: 'bg-orange-50 text-orange-700 ring-orange-200',
  APPROVED: 'bg-blue-50 text-blue-700 ring-blue-200',
  PREPARING: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  READY_FOR_DELIVERY: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  DRIVER_ASSIGNED: 'bg-teal-50 text-teal-700 ring-teal-200',
  OUT_FOR_DELIVERY: 'bg-violet-50 text-violet-700 ring-violet-200',
  PARTIALLY_DELIVERED: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  COMPLETED: 'bg-green-50 text-green-700 ring-green-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
  RETURNED: 'bg-rose-50 text-rose-700 ring-rose-200'
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ${tones[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
