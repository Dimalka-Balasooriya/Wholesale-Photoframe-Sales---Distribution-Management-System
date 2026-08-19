import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import type { RoleName } from '../types/auth.js';
import { getOffset, toPagination } from '../utils/pagination.js';

export type CommissionStatus = 'PENDING' | 'EARNED' | 'PAID' | 'CANCELLED';
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'COMPLETED';
export type ReturnReason = 'DAMAGED_PRODUCT' | 'WRONG_PRODUCT' | 'WRONG_SIZE' | 'CUSTOMER_REJECTION' | 'OTHER';
export type RestockDecision = 'RESTOCK' | 'DAMAGED' | 'NO_RESTOCK';

interface CountRow extends RowDataPacket {
  total: number;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface SalesRepRow extends RowDataPacket {
  id: number;
  name: string;
  commission_percent: string;
}

interface OrderForReturnRow extends RowDataPacket {
  id: number;
  customer_id: number;
  order_status: string;
}

interface OrderItemReturnRow extends RowDataPacket {
  id: number;
  product_id: number;
  variant_id: number;
  quantity: number;
  unit_price: string;
  returned_quantity: string | null;
  current_stock_quantity: number;
}

export interface CommissionRow extends RowDataPacket {
  id: number;
  sales_rep_id: number;
  sales_rep_name: string;
  order_id: number;
  order_number: string;
  customer_name: string;
  order_total: string;
  commission_percent: string;
  commission_amount: string;
  status: CommissionStatus;
  earned_at: Date | null;
  paid_at: Date | null;
}

export interface SalesTargetRow extends RowDataPacket {
  id: number;
  sales_rep_id: number;
  sales_rep_name: string;
  target_month: string;
  target_amount: string;
  actual_sales: string;
  progress_percent: string;
  commission_earned: string;
  notes: string | null;
}

export interface ReturnRow extends RowDataPacket {
  id: number;
  return_number: string;
  order_id: number;
  order_number: string;
  customer_name: string;
  requested_by_name: string;
  approved_by_name: string | null;
  status: ReturnStatus;
  reason: ReturnReason;
  refund_amount: string;
  restock_decision: RestockDecision;
  notes: string | null;
  created_at: Date;
}

export interface ReturnItemRow extends RowDataPacket {
  id: number;
  product_name_snapshot: string;
  variant_size_snapshot: string;
  quantity: number;
  condition_note: string | null;
}

function makeReturnNumber() {
  return `RET-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function getSalesRepForUser(userId: number, connection: PoolConnection | typeof pool = pool) {
  const [rows] = await connection.execute<SalesRepRow[]>(
    `SELECT sr.id, u.name, sr.commission_percent
     FROM sales_reps sr
     INNER JOIN users u ON u.id = sr.user_id
     WHERE sr.user_id = :userId
     LIMIT 1`,
    { userId }
  );
  return rows[0] ?? null;
}

async function syncCommissions(connection: PoolConnection | typeof pool = pool) {
  await connection.execute(
    `INSERT INTO commissions (
       sales_rep_id, order_id, order_total, commission_percent, commission_amount, status, earned_at
     )
     SELECT
       o.sales_rep_id, o.id, o.grand_total, sr.commission_percent,
       ROUND(o.grand_total * sr.commission_percent / 100, 2), 'EARNED', CURRENT_TIMESTAMP
     FROM orders o
     INNER JOIN sales_reps sr ON sr.id = o.sales_rep_id
     LEFT JOIN commissions c ON c.order_id = o.id
     WHERE o.order_status = 'COMPLETED' AND o.sales_rep_id IS NOT NULL AND c.id IS NULL`
  );

  await connection.execute(
    `UPDATE commissions c
     INNER JOIN orders o ON o.id = c.order_id
     SET c.status = 'CANCELLED'
     WHERE o.order_status IN ('CANCELLED', 'RETURNED') AND c.status <> 'PAID'`
  );
}

function scopedSalesRepFilter(requester: { id: number; role: RoleName }, values: Record<string, string | number>) {
  if (requester.role === 'SALES_REP') {
    values.userId = requester.id;
    return ' AND sr.user_id = :userId';
  }
  return '';
}

export async function listSalesReps() {
  const [rows] = await pool.execute<SalesRepRow[]>(
    `SELECT sr.id, u.name, sr.commission_percent
     FROM sales_reps sr
     INNER JOIN users u ON u.id = sr.user_id
     WHERE sr.status = 'ACTIVE' AND u.status = 'ACTIVE'
     ORDER BY u.name ASC`
  );
  return rows;
}

export async function listCommissions(params: {
  page: number;
  pageSize: number;
  search: string;
  requester: { id: number; role: RoleName };
}) {
  await syncCommissions();
  const values: Record<string, string | number> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };
  const scope = scopedSalesRepFilter(params.requester, values);
  const where = `(:search = '' OR o.order_number LIKE :term OR cst.business_name LIKE :term OR u.name LIKE :term)${scope}`;

  const [rows] = await pool.query<CommissionRow[]>(
    `SELECT
       c.*, u.name AS sales_rep_name, o.order_number, cst.business_name AS customer_name
     FROM commissions c
     INNER JOIN sales_reps sr ON sr.id = c.sales_rep_id
     INNER JOIN users u ON u.id = sr.user_id
     INNER JOIN orders o ON o.id = c.order_id
     INNER JOIN customers cst ON cst.id = o.customer_id
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM commissions c
     INNER JOIN sales_reps sr ON sr.id = c.sales_rep_id
     INNER JOIN users u ON u.id = sr.user_id
     INNER JOIN orders o ON o.id = c.order_id
     INNER JOIN customers cst ON cst.id = o.customer_id
     WHERE ${where}`,
    values
  );
  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function upsertSalesTarget(input: {
  salesRepId: number;
  targetMonth: string;
  targetAmount: number;
  notes?: string | null;
  createdBy: number;
}) {
  await pool.execute(
    `INSERT INTO sales_targets (sales_rep_id, target_month, target_amount, notes, created_by)
     VALUES (:salesRepId, :targetMonth, :targetAmount, :notes, :createdBy)
     ON DUPLICATE KEY UPDATE
       target_amount = VALUES(target_amount),
       notes = VALUES(notes),
       created_by = VALUES(created_by)`,
    {
      salesRepId: input.salesRepId,
      targetMonth: input.targetMonth,
      targetAmount: input.targetAmount,
      notes: input.notes ?? null,
      createdBy: input.createdBy
    }
  );
}

export async function listTargets(params: {
  month?: string;
  requester: { id: number; role: RoleName };
}) {
  const values: Record<string, string | number> = {
    month: params.month ?? new Date().toISOString().slice(0, 7)
  };
  const scope = scopedSalesRepFilter(params.requester, values);
  const [rows] = await pool.query<SalesTargetRow[]>(
    `SELECT
       st.id, st.sales_rep_id, u.name AS sales_rep_name, st.target_month, st.target_amount, st.notes,
       COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN o.grand_total ELSE 0 END), 0) AS actual_sales,
       CASE
         WHEN st.target_amount <= 0 THEN 0
         ELSE ROUND(COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN o.grand_total ELSE 0 END), 0) / st.target_amount * 100, 2)
       END AS progress_percent,
       COALESCE(SUM(CASE WHEN cm.status = 'EARNED' THEN cm.commission_amount ELSE 0 END), 0) AS commission_earned
     FROM sales_targets st
     INNER JOIN sales_reps sr ON sr.id = st.sales_rep_id
     INNER JOIN users u ON u.id = sr.user_id
     LEFT JOIN orders o ON o.sales_rep_id = st.sales_rep_id AND DATE_FORMAT(o.order_date, '%Y-%m') = st.target_month
     LEFT JOIN commissions cm ON cm.order_id = o.id
     WHERE st.target_month = :month${scope}
     GROUP BY st.id
     ORDER BY u.name ASC`,
    values
  );
  return { data: rows };
}

export async function createReturn(input: {
  orderId: number;
  reason: ReturnReason;
  restockDecision: RestockDecision;
  notes?: string | null;
  items: Array<{ orderItemId: number; quantity: number; conditionNote?: string | null }>;
  requester: { id: number; role: RoleName };
}) {
  if (input.items.length === 0) throw new Error('Return must contain at least one item');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.execute<OrderForReturnRow[]>(
      'SELECT id, customer_id, order_status FROM orders WHERE id = :orderId FOR UPDATE',
      { orderId: input.orderId }
    );
    const order = orders[0];
    if (!order) throw new Error('Order not found');
    if (!['DELIVERED', 'COMPLETED', 'RETURNED'].includes(order.order_status)) {
      throw new Error('Only delivered or completed orders can be returned');
    }

    let refundAmount = 0;
    const itemRows: Array<OrderItemReturnRow & { returnQuantity: number; conditionNote: string | null }> = [];
    for (const item of input.items) {
      const [rows] = await connection.execute<OrderItemReturnRow[]>(
        `SELECT
           oi.*, v.current_stock_quantity,
           (SELECT COALESCE(SUM(ri.quantity), 0)
            FROM return_items ri
            INNER JOIN returns r ON r.id = ri.return_id
            WHERE ri.order_item_id = oi.id AND r.status <> 'REJECTED') AS returned_quantity
         FROM order_items oi
         INNER JOIN product_variants v ON v.id = oi.variant_id
         WHERE oi.id = :orderItemId AND oi.order_id = :orderId
         LIMIT 1`,
        { orderItemId: item.orderItemId, orderId: input.orderId }
      );
      const row = rows[0];
      if (!row) throw new Error('Return item does not belong to this order');
      const availableToReturn = row.quantity - Number(row.returned_quantity ?? 0);
      if (item.quantity < 1 || item.quantity > availableToReturn) {
        throw new Error('Return quantity exceeds available delivered quantity');
      }
      refundAmount += Number(row.unit_price) * item.quantity;
      itemRows.push({ ...row, returnQuantity: item.quantity, conditionNote: item.conditionNote ?? null });
    }

    const [result] = await connection.execute(
      `INSERT INTO returns (
         return_number, order_id, customer_id, requested_by, status, reason, refund_amount, restock_decision, notes
       )
       VALUES (
         :returnNumber, :orderId, :customerId, :requestedBy, 'REQUESTED', :reason, :refundAmount, :restockDecision, :notes
       )`,
      {
        returnNumber: makeReturnNumber(),
        orderId: input.orderId,
        customerId: order.customer_id,
        requestedBy: input.requester.id,
        reason: input.reason,
        refundAmount,
        restockDecision: input.restockDecision,
        notes: input.notes ?? null
      }
    );
    const returnId = Number((result as { insertId: number }).insertId);
    for (const item of itemRows) {
      await connection.execute(
        `INSERT INTO return_items (
           return_id, order_item_id, product_id, variant_id, quantity, condition_note
         )
         VALUES (
           :returnId, :orderItemId, :productId, :variantId, :quantity, :conditionNote
         )`,
        {
          returnId,
          orderItemId: item.id,
          productId: item.product_id,
          variantId: item.variant_id,
          quantity: item.returnQuantity,
          conditionNote: item.conditionNote
        }
      );
    }
    await connection.commit();
    return returnId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function restockReturnItems(connection: PoolConnection, returnId: number, changedBy: number, transactionType: 'RETURNED' | 'DAMAGED') {
  const [items] = await connection.execute<Array<RowDataPacket & {
    product_id: number;
    variant_id: number;
    quantity: number;
    current_stock_quantity: number;
    order_id: number;
  }>>(
    `SELECT ri.product_id, ri.variant_id, ri.quantity, v.current_stock_quantity, r.order_id
     FROM return_items ri
     INNER JOIN returns r ON r.id = ri.return_id
     INNER JOIN product_variants v ON v.id = ri.variant_id
     WHERE ri.return_id = :returnId
     FOR UPDATE`,
    { returnId }
  );
  for (const item of items) {
    const previousQuantity = item.current_stock_quantity;
    const quantityChanged = transactionType === 'RETURNED' ? item.quantity : 0;
    const newQuantity = previousQuantity + quantityChanged;
    if (quantityChanged > 0) {
      await connection.execute(
        'UPDATE product_variants SET current_stock_quantity = :newQuantity WHERE id = :variantId',
        { newQuantity, variantId: item.variant_id }
      );
    }
    await connection.execute(
      `INSERT INTO stock_transactions (
         product_id, variant_id, previous_quantity, quantity_changed, new_quantity,
         transaction_type, related_order_id, changed_by, note
       )
       VALUES (
         :productId, :variantId, :previousQuantity, :quantityChanged, :newQuantity,
         :transactionType, :orderId, :changedBy, :note
       )`,
      {
        productId: item.product_id,
        variantId: item.variant_id,
        previousQuantity,
        quantityChanged,
        newQuantity,
        transactionType,
        orderId: item.order_id,
        changedBy,
        note: `Return ${returnId} processed`
      }
    );
  }
}

export async function updateReturnStatus(input: {
  returnId: number;
  status: ReturnStatus;
  approvedBy: number;
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<Array<RowDataPacket & {
      id: number;
      order_id: number;
      status: ReturnStatus;
      restock_decision: RestockDecision;
    }>>(
      'SELECT id, order_id, status, restock_decision FROM returns WHERE id = :returnId FOR UPDATE',
      { returnId: input.returnId }
    );
    const current = rows[0];
    if (!current) throw new Error('Return not found');
    if (current.status === 'COMPLETED') throw new Error('Completed returns cannot be changed');

    await connection.execute(
      `UPDATE returns
       SET status = :status, approved_by = CASE WHEN :status IN ('APPROVED', 'REJECTED', 'RECEIVED', 'COMPLETED') THEN :approvedBy ELSE approved_by END
       WHERE id = :returnId`,
      { status: input.status, approvedBy: input.approvedBy, returnId: input.returnId }
    );

    if (input.status === 'COMPLETED') {
      if (current.restock_decision === 'RESTOCK') {
        await restockReturnItems(connection, input.returnId, input.approvedBy, 'RETURNED');
      }
      if (current.restock_decision === 'DAMAGED') {
        await restockReturnItems(connection, input.returnId, input.approvedBy, 'DAMAGED');
      }
      await connection.execute(
        "UPDATE orders SET order_status = 'RETURNED' WHERE id = :orderId",
        { orderId: current.order_id }
      );
      await connection.execute(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, note)
         VALUES (:orderId, NULL, 'RETURNED', :changedBy, 'Return completed')`,
        { orderId: current.order_id, changedBy: input.approvedBy }
      );
      await connection.execute(
        "UPDATE commissions SET status = 'CANCELLED' WHERE order_id = :orderId AND status <> 'PAID'",
        { orderId: current.order_id }
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listReturns(params: {
  page: number;
  pageSize: number;
  search: string;
  requester: { id: number; role: RoleName };
}) {
  const values: Record<string, string | number> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };
  const filters = ['(:search = \'\' OR r.return_number LIKE :term OR o.order_number LIKE :term OR c.business_name LIKE :term)'];
  if (params.requester.role === 'SALES_REP') {
    const rep = await getSalesRepForUser(params.requester.id);
    filters.push('o.sales_rep_id = :salesRepId');
    values.salesRepId = rep?.id ?? 0;
  }
  const where = filters.join(' AND ');
  const [rows] = await pool.query<ReturnRow[]>(
    `SELECT
       r.*, o.order_number, c.business_name AS customer_name,
       req.name AS requested_by_name, app.name AS approved_by_name
     FROM returns r
     INNER JOIN orders o ON o.id = r.order_id
     INNER JOIN customers c ON c.id = r.customer_id
     INNER JOIN users req ON req.id = r.requested_by
     LEFT JOIN users app ON app.id = r.approved_by
     WHERE ${where}
     ORDER BY r.created_at DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM returns r
     INNER JOIN orders o ON o.id = r.order_id
     INNER JOIN customers c ON c.id = r.customer_id
     WHERE ${where}`,
    values
  );
  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function getReturnItems(returnId: number) {
  const [rows] = await pool.execute<ReturnItemRow[]>(
    `SELECT
       ri.*, oi.product_name_snapshot, oi.variant_size_snapshot
     FROM return_items ri
     INNER JOIN order_items oi ON oi.id = ri.order_item_id
     WHERE ri.return_id = :returnId
     ORDER BY ri.id ASC`,
    { returnId }
  );
  return rows;
}

export async function ensurePhase6Seed(adminUserId: number, salesRepId: number) {
  const month = new Date().toISOString().slice(0, 7);
  await upsertSalesTarget({
    salesRepId,
    targetMonth: month,
    targetAmount: 100000,
    notes: 'Development monthly target',
    createdBy: adminUserId
  });

  await pool.execute(
    `UPDATE orders
     SET order_status = 'COMPLETED'
     WHERE sales_rep_id = :salesRepId AND order_status = 'DELIVERED'
     LIMIT 1`,
    { salesRepId }
  );
  await syncCommissions();
}
