import type { ReturnStatus } from '../types/catalog';

const tones: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-amber-50 text-amber-700 ring-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 ring-blue-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  RECEIVED: 'bg-violet-50 text-violet-700 ring-violet-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ${tones[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
