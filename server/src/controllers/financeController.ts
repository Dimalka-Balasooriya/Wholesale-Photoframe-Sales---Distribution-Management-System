import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createPayment,
  listCustomerLedger,
  listInvoices,
  listPayments
} from '../services/financeService.js';
import { paginationSchema } from '../utils/pagination.js';

const paymentSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'COD', 'CREDIT', 'OTHER']),
  referenceNumber: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  allowOverpayment: z.coerce.boolean().optional().default(false)
});

export async function getInvoices(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const result = await listInvoices({
    ...pagination,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json(result);
}

export async function postPayment(req: Request, res: Response) {
  const input = paymentSchema.parse(req.body);
  const paymentId = await createPayment(input, { id: req.user!.id, role: req.user!.role });
  res.status(201).json({ message: 'Payment recorded', paymentId });
}

export async function getPayments(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const result = await listPayments({
    ...pagination,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json(result);
}

export async function getLedger(req: Request, res: Response) {
  const customerId = z.coerce.number().int().positive().optional().parse(req.query.customerId);
  const result = await listCustomerLedger({
    customerId,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json(result);
}
