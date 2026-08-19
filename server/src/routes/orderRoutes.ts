import { Router } from 'express';
import { getOrder, getOrders, patchOrderStatus, postOrder } from '../controllers/orderController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';

export const orderRoutes = Router();

orderRoutes.get('/', authenticate, authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), asyncHandler(getOrders));
orderRoutes.post('/', authenticate, authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), asyncHandler(postOrder));
orderRoutes.get('/:id', authenticate, authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), asyncHandler(getOrder));
orderRoutes.patch('/:id/status', authenticate, authorize('ADMIN'), asyncHandler(patchOrderStatus));
