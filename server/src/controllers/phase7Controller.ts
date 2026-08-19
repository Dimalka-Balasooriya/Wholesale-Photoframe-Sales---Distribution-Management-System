import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  getReportSummary,
  listAuditLogs,
  listNotifications,
  markNotificationRead
} from '../services/phase7Service.js';
import { paginationSchema } from '../utils/pagination.js';

const dateRangeSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export async function getReports(req: Request, res: Response) {
  const range = dateRangeSchema.parse(req.query);
  res.json(await getReportSummary(range));
}

export async function getNotifications(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  res.json(
    await listNotifications({
      ...pagination,
      requester: req.user!
    })
  );
}

export async function patchNotificationRead(req: Request, res: Response) {
  const notificationId = z.coerce.number().int().positive().parse(req.params.id);
  await markNotificationRead(notificationId, req.user!);
  res.json({ message: 'Notification marked as read' });
}

export async function getAuditLogs(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  res.json(await listAuditLogs(pagination));
}
