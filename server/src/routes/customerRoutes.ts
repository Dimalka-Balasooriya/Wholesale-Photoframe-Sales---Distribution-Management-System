import { Router } from 'express';
import { getCustomers, postCustomer, putCustomer } from '../controllers/customerController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';

export const customerRoutes = Router();

customerRoutes.get('/', authenticate, authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), asyncHandler(getCustomers));
customerRoutes.post('/', authenticate, authorize('ADMIN', 'SALES_REP'), asyncHandler(postCustomer));
customerRoutes.put('/:id', authenticate, authorize('ADMIN'), asyncHandler(putCustomer));
