import { Router } from 'express';
import {
  getDeliveries,
  getDelivery,
  getDrivers,
  patchDeliveryCompletion,
  patchDeliveryStart,
  postDeliveryAssignment
} from '../controllers/deliveryController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';

export const deliveryRoutes = Router();

deliveryRoutes.get('/drivers', authenticate, authorize('ADMIN'), asyncHandler(getDrivers));
deliveryRoutes.get('/', authenticate, authorize('ADMIN', 'DRIVER'), asyncHandler(getDeliveries));
deliveryRoutes.post('/assign', authenticate, authorize('ADMIN'), asyncHandler(postDeliveryAssignment));
deliveryRoutes.get('/:id', authenticate, authorize('ADMIN', 'DRIVER'), asyncHandler(getDelivery));
deliveryRoutes.patch('/:id/start', authenticate, authorize('DRIVER'), asyncHandler(patchDeliveryStart));
deliveryRoutes.patch('/:id/complete', authenticate, authorize('DRIVER'), asyncHandler(patchDeliveryCompletion));
