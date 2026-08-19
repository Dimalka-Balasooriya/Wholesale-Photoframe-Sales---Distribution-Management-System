import type { Request, Response } from 'express';
import { z } from 'zod';
import { createCustomer, listCustomers, updateCustomer } from '../services/customerService.js';
import { paginationSchema } from '../utils/pagination.js';

const customerSchema = z.object({
  businessName: z.string().trim().min(2).max(180),
  ownerName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(5).max(30),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().optional().or(z.literal('')).nullable(),
  address: z.string().trim().max(2000).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  province: z.string().trim().max(100).optional().nullable(),
  customerType: z
    .enum(['CASH_CUSTOMER', 'CREDIT_CUSTOMER', 'WHOLESALE_CUSTOMER', 'VIP_CUSTOMER'])
    .default('WHOLESALE_CUSTOMER'),
  creditLimit: z.coerce.number().min(0).default(0),
  assignedSalesRepId: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().trim().max(5000).optional().nullable()
});

export async function getCustomers(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const result = await listCustomers({
    ...pagination,
    requesterId: req.user!.id,
    requesterRole: req.user!.role
  });
  res.json(result);
}

export async function postCustomer(req: Request, res: Response) {
  const input = customerSchema.parse(req.body);
  await createCustomer(
    { ...input, email: input.email || null },
    { id: req.user!.id, role: req.user!.role }
  );
  res.status(201).json({ message: 'Customer created' });
}

export async function putCustomer(req: Request, res: Response) {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const input = customerSchema.parse(req.body);
  await updateCustomer(id, { ...input, email: input.email || null });
  res.json({ message: 'Customer updated' });
}
