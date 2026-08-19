import type { Pagination } from '../types/catalog';

interface PaginationControlsProps {
  pagination?: Pagination;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ pagination, onPageChange }: PaginationControlsProps) {
  if (!pagination) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
      <span>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
      </span>
      <div className="flex gap-2">
        <button
          className="rounded-md border border-slate-300 px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded-md border border-slate-300 px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
