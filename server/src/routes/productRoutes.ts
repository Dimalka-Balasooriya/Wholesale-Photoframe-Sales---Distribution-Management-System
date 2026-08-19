import { Router } from 'express';
import {
  getProducts,
  getStockTransactions,
  getVariants,
  postProduct,
  postStockAdjustment,
  postVariant,
  putProduct
} from '../controllers/productController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';

export const productRoutes = Router();

productRoutes.get('/', authenticate, asyncHandler(getProducts));
productRoutes.post('/', authenticate, authorize('ADMIN'), asyncHandler(postProduct));
productRoutes.put('/:id', authenticate, authorize('ADMIN'), asyncHandler(putProduct));

productRoutes.get('/variants/list', authenticate, asyncHandler(getVariants));
productRoutes.post('/variants', authenticate, authorize('ADMIN'), asyncHandler(postVariant));
productRoutes.post('/stock-adjustments', authenticate, authorize('ADMIN'), asyncHandler(postStockAdjustment));
productRoutes.get('/stock-transactions', authenticate, authorize('ADMIN'), asyncHandler(getStockTransactions));
