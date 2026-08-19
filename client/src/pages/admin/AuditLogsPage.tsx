import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageToolbar } from '../../components/PageToolbar';
import { PaginationControls } from '../../components/PaginationControls';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { AuditLogRecord, Paginated } from '../../types/catalog';

function toTitle(text: string) {
  return text
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseAuditValue(value: unknown) {
  if (!value) return null;
  if (typeof value === 'string') {
    if (value === 'None') return null;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return { value };
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>;
  return { value };
}

function formatScalar(value: unknown) {
  if (value === null || value === undefined || value === '') return 'None';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return toTitle(String(value));
}

function AuditValue({ value }: { value: unknown }) {
  const parsed = parseAuditValue(value);

  if (!parsed) {
    return <span className="text-slate-400">None</span>;
  }

  const entries = Object.entries(parsed);

  return (
    <div className="space-y-1">
      {entries.map(([key, entryValue]) => (
        <p className="text-sm text-slate-700" key={key}>
          <span className="font-semibold text-slate-500">{toTitle(key)}:</span>{' '}
          <span className="font-bold text-ink">{formatScalar(entryValue)}</span>
        </p>
      ))}
    </div>
  );
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [pagination, setPagination] = useState<Paginated<AuditLogRecord>['pagination']>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    const response = await api.get<Paginated<AuditLogRecord>>('/insights/audit-logs', {
      page,
      pageSize: 12,
      search
    });
    setLogs(response.data);
    setPagination(response.pagination);
  };

  useEffect(() => {
    loadLogs().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load audit logs'));
  }, [page, search]);

  return (
    <DashboardLayout title="Audit Logs" subtitle="Trace sensitive order, stock, payment, and customer-credit actions.">
      <div className="space-y-5">
        <PageToolbar
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search action, entity, user, or email"
          search={search}
        />

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Previous</th>
                  <th className="px-4 py-3">New</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={6}>
                      <span className="inline-flex items-center gap-2">
                        <ShieldCheck size={18} />
                        No audit logs found.
                      </span>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-bold text-ink">{toTitle(log.action)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{toTitle(log.entity_type)}</span>
                        {log.entity_id ? <span className="text-slate-500"> #{log.entity_id}</span> : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{log.user_name ?? 'System'}</p>
                        <p className="text-xs text-slate-500">{log.ip_address ?? 'No IP recorded'}</p>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <AuditValue value={log.previous_value} />
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <AuditValue value={log.new_value} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <PaginationControls pagination={pagination} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  );
}
