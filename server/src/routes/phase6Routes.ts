import { Router } from 'express';
import {
  getCommissions,
  getReturns,
  getSalesReps,
  getTargets,
  patchReturnStatus,
  postReturn,
  postTarget
} from '../controllers/phase6Controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';

export const phase6Routes = Router();

phase6Routes.get('/sales-reps', authenticate, authorize('ADMIN'), asyncHandler(getSalesReps));
phase6Routes.get('/commissions', authenticate, authorize('ADMIN', 'SALES_REP'), asyncHandler(getCommissions));
phase6Routes.get('/targets', authenticate, authorize('ADMIN', 'SALES_REP'), asyncHandler(getTargets));
phase6Routes.post('/targets', authenticate, authorize('ADMIN'), asyncHandler(postTarget));
phase6Routes.get('/returns', authenticate, authorize('ADMIN', 'SALES_REP'), asyncHandler(getReturns));
phase6Routes.post('/returns', authenticate, authorize('ADMIN', 'SALES_REP'), asyncHandler(postReturn));
phase6Routes.patch('/returns/:id/status', authenticate, authorize('ADMIN'), asyncHandler(patchReturnStatus));
