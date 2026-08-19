import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  adjustStock,
  createProduct,
  createVariant,
  listProducts,
  listStockTransactions,
  listVariants,
  updateProduct
} from '../services/productService.js';
import { paginationSchema } from '../utils/pagination.js';

const statusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const productSchema = z.object({
  name: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).optional().nullable(),
  imageUrl: z.string().trim().url().optional().or(z.literal('')).nullable(),
  status: statusSchema.default('ACTIVE')
});

const variantSchema = z.object({
  productId: z.coerce.number().int().positive(),
  size: z.string().trim().min(1).max(50),
  sku: z.string().trim().min(2).max(80),
  costPrice: z.coerce.number().min(0),
  wholesalePrice: z.coerce.number().min(0),
  minimumWholesaleQuantity: z.coerce.number().int().min(1),
  lowStockLevel: z.coerce.number().int().min(0),
  status: statusSchema.default('ACTIVE')
});

const stockAdjustmentSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  quantityChanged: z.coerce.number().int(),
  transactionType: z.enum([
    'STOCK_IN',
    'ORDER_RESERVED',
    'ORDER_SOLD',
    'RETURNED',
    'MANUAL_ADJUSTMENT',
    'DAMAGED',
    'CANCELLED_ORDER_RESTOCK'
  ]),
  note: z.string().trim().max(1000).optional().nullable()
});

export async function getProducts(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const status = statusSchema.optional().parse(req.query.status || undefined);
  const result = await listProducts({ ...pagination, status });
  res.json(result);
}

export async function postProduct(req: Request, res: Response) {
  const input = productSchema.parse(req.body);
  await createProduct(
    {
      ...input,
      imageUrl: input.imageUrl || null
    },
    req.user!.id
  );
  res.status(201).json({ message: 'Product created' });
}

export async function putProduct(req: Request, res: Response) {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const input = productSchema.parse(req.body);
  await updateProduct(id, { ...input, imageUrl: input.imageUrl || null });
  res.json({ message: 'Product updated' });
}

export async function getVariants(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const lowStockOnly = z.coerce.boolean().optional().parse(req.query.lowStockOnly);
  const result = await listVariants({ ...pagination, lowStockOnly });
  res.json(result);
}

export async function postVariant(req: Request, res: Response) {
  const input = variantSchema.parse(req.body);
  await createVariant(input);
  res.status(201).json({ message: 'Variant created' });
}

export async function postStockAdjustment(req: Request, res: Response) {
  const input = stockAdjustmentSchema.parse(req.body);
  const result = await adjustStock({ ...input, changedBy: req.user!.id });
  res.status(201).json({ message: 'Stock updated', stock: result });
}

export async function getStockTransactions(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const result = await listStockTransactions(pagination);
  res.json(result);
}
