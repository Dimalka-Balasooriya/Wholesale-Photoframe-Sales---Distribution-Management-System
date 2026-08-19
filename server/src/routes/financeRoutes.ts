import { Router } from 'express';
import { getInvoices, getLedger, getPayments, postPayment } from '../controllers/financeController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';

export const financeRoutes = Router();

financeRoutes.get('/invoices', authenticate, authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), asyncHandler(getInvoices));
financeRoutes.get('/payments', authenticate, authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), asyncHandler(getPayments));
financeRoutes.post('/payments', authenticate, authorize('ADMIN', 'SALES_REP', 'DRIVER'), asyncHandler(postPayment));
financeRoutes.get('/ledger', authenticate, authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), asyncHandler(getLedger));
