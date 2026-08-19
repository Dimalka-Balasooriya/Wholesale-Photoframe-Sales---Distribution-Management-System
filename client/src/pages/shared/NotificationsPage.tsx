import { useEffect, useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { NotificationRecord, Paginated } from '../../types/catalog';
import { PaginationControls } from '../../components/PaginationControls';
import { useAuth } from '../../hooks/useAuth';
import { roleLabels } from '../../utils/roles';

const categoryTone: Record<NotificationRecord['category'], string> = {
  ORDER: 'bg-blue-50 text-blue-700',
  PAYMENT: 'bg-emerald-50 text-emerald-700',
  DELIVERY: 'bg-indigo-50 text-indigo-700',
  INVENTORY: 'bg-amber-50 text-amber-700',
  TARGET: 'bg-purple-50 text-purple-700',
  RETURN: 'bg-rose-50 text-rose-700',
  SYSTEM: 'bg-slate-100 text-slate-700'
};

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [pagination, setPagination] = useState<Paginated<NotificationRecord>['pagination']>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    const response = await api.get<Paginated<NotificationRecord>>('/insights/notifications', {
      page,
      pageSize: 10,
      search: ''
    });
    setNotifications(response.data);
    setPagination(response.pagination);
  };

  useEffect(() => {
    loadNotifications().catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load notifications'));
  }, [page]);

  const markRead = async (notificationId: number) => {
    setError('');
    try {
      await api.patch(`/insights/notifications/${notificationId}/read`, {});
      await loadNotifications();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update notification');
    }
  };

  return (
    <DashboardLayout
      title="Notifications"
      subtitle={`${user ? roleLabels[user.role] : 'Team'} alerts for orders, payments, deliveries, and stock.`}
    >
      <div className="space-y-5">
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-8 text-sm text-slate-500">
                <Bell size={18} />
                No notifications found.
              </div>
            ) : (
              notifications.map((notification) => {
                const isRead = Boolean(notification.is_read);
                return (
                  <article
                    className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between ${
                      isRead ? 'bg-white' : 'bg-blue-50/40'
                    }`}
                    key={notification.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${categoryTone[notification.category]}`}>
                          {notification.category.replace('_', ' ')}
                        </span>
                        {!isRead ? <span className="rounded-md bg-brand px-2 py-1 text-xs font-bold text-white">New</span> : null}
                        <time className="text-xs font-medium text-slate-500">
                          {new Date(notification.created_at).toLocaleString()}
                        </time>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-ink">{notification.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                    </div>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isRead}
                      onClick={() => void markRead(notification.id)}
                      type="button"
                    >
                      <CheckCircle2 size={16} />
                      Mark Read
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <PaginationControls pagination={pagination} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  );
}
