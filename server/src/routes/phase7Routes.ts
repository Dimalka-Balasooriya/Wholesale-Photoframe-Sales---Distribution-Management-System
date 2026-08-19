import { Router } from 'express';
import {
  getAuditLogs,
  getNotifications,
  getReports,
  patchNotificationRead
} from '../controllers/phase7Controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';

export const phase7Routes = Router();

phase7Routes.get('/reports', authenticate, authorize('ADMIN'), asyncHandler(getReports));
phase7Routes.get(
  '/notifications',
  authenticate,
  authorize('ADMIN', 'SALES_REP', 'DRIVER', 'CUSTOMER'),
  asyncHandler(getNotifications)
);
phase7Routes.patch(
  '/notifications/:id/read',
  authenticate,
  authorize('ADMIN', 'SALES_REP', 'DRIVER', 'CUSTOMER'),
  asyncHandler(patchNotificationRead)
);
phase7Routes.get('/audit-logs', authenticate, authorize('ADMIN'), asyncHandler(getAuditLogs));
