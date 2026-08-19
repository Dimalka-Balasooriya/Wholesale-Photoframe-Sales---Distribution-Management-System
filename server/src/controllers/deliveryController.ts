import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  assignDelivery,
  completeDelivery,
  getDeliveryDetails,
  listDeliveries,
  listDrivers,
  startDelivery
} from '../services/deliveryService.js';
import { paginationSchema } from '../utils/pagination.js';

const deliveryStatusSchema = z.enum([
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'FULLY_DELIVERED',
  'PARTIALLY_DELIVERED',
  'CUSTOMER_NOT_AVAILABLE',
  'DELIVERY_FAILED',
  'CANCELLED'
]);

const deliveryResultSchema = z.enum([
  'FULLY_DELIVERED',
  'PARTIALLY_DELIVERED',
  'CUSTOMER_NOT_AVAILABLE',
  'DELIVERY_FAILED'
]);

const paymentMethodSchema = z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'COD', 'CREDIT', 'OTHER']);

export async function getDrivers(_req: Request, res: Response) {
  res.json({ data: await listDrivers() });
}

export async function getDeliveries(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const status = deliveryStatusSchema.optional().parse(req.query.status || undefined);
  const result = await listDeliveries({
    ...pagination,
    status,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json(result);
}

export async function getDelivery(req: Request, res: Response) {
  const deliveryId = z.coerce.number().int().positive().parse(req.params.id);
  const result = await getDeliveryDetails(deliveryId, { id: req.user!.id, role: req.user!.role });
  res.json(result);
}

export async function postDeliveryAssignment(req: Request, res: Response) {
  const body = z
    .object({
      orderId: z.coerce.number().int().positive(),
      driverId: z.coerce.number().int().positive(),
      notes: z.string().trim().max(1000).optional().nullable()
    })
    .parse(req.body);
  const deliveryId = await assignDelivery({
    ...body,
    assignedBy: req.user!.id
  });
  res.status(201).json({ message: 'Delivery assigned', deliveryId });
}

export async function patchDeliveryStart(req: Request, res: Response) {
  const deliveryId = z.coerce.number().int().positive().parse(req.params.id);
  await startDelivery(deliveryId, { id: req.user!.id, role: req.user!.role });
  res.json({ message: 'Delivery started' });
}

export async function patchDeliveryCompletion(req: Request, res: Response) {
  const deliveryId = z.coerce.number().int().positive().parse(req.params.id);
  const body = z
    .object({
      result: deliveryResultSchema,
      paymentReceived: z.coerce.boolean().default(false),
      paymentMethod: paymentMethodSchema.optional(),
      amountReceived: z.coerce.number().min(0).optional(),
      referenceNumber: z.string().trim().max(120).optional().nullable(),
      notes: z.string().trim().max(1000).optional().nullable()
    })
    .parse(req.body);

  await completeDelivery({
    deliveryId,
    ...body,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json({ message: 'Delivery completed' });
}
