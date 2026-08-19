import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createReturn,
  listCommissions,
  listReturns,
  listSalesReps,
  listTargets,
  upsertSalesTarget,
  updateReturnStatus
} from '../services/phase6Service.js';
import { paginationSchema } from '../utils/pagination.js';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const returnReasonSchema = z.enum(['DAMAGED_PRODUCT', 'WRONG_PRODUCT', 'WRONG_SIZE', 'CUSTOMER_REJECTION', 'OTHER']);
const restockDecisionSchema = z.enum(['RESTOCK', 'DAMAGED', 'NO_RESTOCK']);
const returnStatusSchema = z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'COMPLETED']);

export async function getSalesReps(_req: Request, res: Response) {
  res.json({ data: await listSalesReps() });
}

export async function getCommissions(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const result = await listCommissions({
    ...pagination,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json(result);
}

export async function getTargets(req: Request, res: Response) {
  const month = monthSchema.optional().parse(req.query.month || undefined);
  const result = await listTargets({
    month,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json(result);
}

export async function postTarget(req: Request, res: Response) {
  const body = z
    .object({
      salesRepId: z.coerce.number().int().positive(),
      targetMonth: monthSchema,
      targetAmount: z.coerce.number().min(0),
      notes: z.string().trim().max(1000).optional().nullable()
    })
    .parse(req.body);
  await upsertSalesTarget({
    ...body,
    createdBy: req.user!.id
  });
  res.status(201).json({ message: 'Sales target saved' });
}

export async function getReturns(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  const result = await listReturns({
    ...pagination,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.json(result);
}

export async function postReturn(req: Request, res: Response) {
  const body = z
    .object({
      orderId: z.coerce.number().int().positive(),
      reason: returnReasonSchema,
      restockDecision: restockDecisionSchema.default('NO_RESTOCK'),
      notes: z.string().trim().max(1000).optional().nullable(),
      items: z
        .array(
          z.object({
            orderItemId: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().min(1),
            conditionNote: z.string().trim().max(255).optional().nullable()
          })
        )
        .min(1)
    })
    .parse(req.body);
  const returnId = await createReturn({
    ...body,
    requester: { id: req.user!.id, role: req.user!.role }
  });
  res.status(201).json({ message: 'Return created', returnId });
}

export async function patchReturnStatus(req: Request, res: Response) {
  const returnId = z.coerce.number().int().positive().parse(req.params.id);
  const body = z.object({ status: returnStatusSchema }).parse(req.body);
  await updateReturnStatus({
    returnId,
    status: body.status,
    approvedBy: req.user!.id
  });
  res.json({ message: 'Return status updated' });
}
