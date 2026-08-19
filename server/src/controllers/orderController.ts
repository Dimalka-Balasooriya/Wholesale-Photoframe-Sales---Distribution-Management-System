import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createOrder,
  getOrderDetails,
  listOrders,
  updateOrderStatus
} from '../services/orderService.js';
import { paginationSchema } from '../utils/pagination.js';

const orderStatusSchema = z.enum([
  'DRAFT',
  'PENDING',
  'DISCOUNT_APPROVAL_REQUIRED',
  'APPROVED',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'DRIVER_ASSIGNED',
  'OUT_FOR_DELIVERY',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED'
]);

const createOrderSchema = z.object({
  customerId: z.coerce.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        variantId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1),
        discount: z.coerce.number().min(0).default(0)
      })
    )
    .min(1),
  discountPercentage: z.coerce.number().min(0).max(100).default(0),
  deliveryCharge: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'COD', 'CREDIT']).default('CREDIT'),
  notes: z.string().trim().max(2000).optional().nullable()
});

export async function postOrder(req: Request, res: Response) {
  const input = createOrderSchema.parse(req.body);
  const orderId = await createOrder(input, { id: req.user!.id, role: req.user!.role });
  res.status(201).json({ message: 'Order created', orderId });
}

export async function getOrders(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const status = orderStatusSchema.optional().parse(req.query.status || undefined);
  const result = await listOrders({
    ...pagination,
    status,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json(result);
}

export async function getOrder(req: Request, res: Response) {
  const orderId = z.coerce.number().int().positive().parse(req.params.id);
  const result = await getOrderDetails(orderId, { id: req.user!.id, role: req.user!.role });
  res.json(result);
}

export async function patchOrderStatus(req: Request, res: Response) {
  const orderId = z.coerce.number().int().positive().parse(req.params.id);
  const body = z
    .object({
      status: orderStatusSchema,
      note: z.string().trim().max(1000).optional().nullable()
    })
    .parse(req.body);
  await updateOrderStatus({
    orderId,
    newStatus: body.status,
    changedBy: req.user!.id,
    note: body.note
  });
  res.json({ message: 'Order status updated' });
}
