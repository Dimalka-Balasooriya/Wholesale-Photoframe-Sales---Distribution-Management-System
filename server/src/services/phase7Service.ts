import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../config/database.js';
import type { AuthUser, RoleName } from '../types/auth.js';
import { getOffset, toPagination } from '../utils/pagination.js';

type NotificationCategory = 'ORDER' | 'PAYMENT' | 'DELIVERY' | 'INVENTORY' | 'TARGET' | 'RETURN' | 'SYSTEM';

interface CountRow extends RowDataPacket {
  total: number;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface DateRange {
  dateFrom?: string;
  dateTo?: string;
}

interface PaginatedRequest {
  page: number;
  pageSize: number;
  search?: string;
}

interface NotificationInput {
  userId?: number | null;
  roleName?: RoleName | null;
  title: string;
  message: string;
  category: NotificationCategory;
  entityType?: string | null;
  entityId?: number | null;
}

interface AuditLogInput {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

function withDateRange(column: string, range: DateRange, params: Record<string, string>) {
  const clauses: string[] = [];

  if (range.dateFrom) {
    clauses.push(`${column} >= :dateFrom`);
    params.dateFrom = range.dateFrom;
  }

  if (range.dateTo) {
    clauses.push(`${column} < DATE_ADD(:dateTo, INTERVAL 1 DAY)`);
    params.dateTo = range.dateTo;
  }

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
}

export async function createNotification(input: NotificationInput, connection: PoolConnection | typeof pool = pool) {
  await connection.execute(
    `INSERT INTO notifications (
       user_id, role_name, title, message, category, entity_type, entity_id
     )
     VALUES (
       :userId, :roleName, :title, :message, :category, :entityType, :entityId
     )`,
    {
      userId: input.userId ?? null,
      roleName: input.roleName ?? null,
      title: input.title,
      message: input.message,
      category: input.category,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null
    }
  );
}

export async function createAuditLog(input: AuditLogInput, connection: PoolConnection | typeof pool = pool) {
  await connection.execute(
    `INSERT INTO audit_logs (
       user_id, action, entity_type, entity_id, previous_value, new_value, ip_address
     )
     VALUES (
       :userId, :action, :entityType, :entityId, :previousValue, :newValue, :ipAddress
     )`,
    {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      previousValue: input.previousValue === undefined ? null : JSON.stringify(input.previousValue),
      newValue: input.newValue === undefined ? null : JSON.stringify(input.newValue),
      ipAddress: input.ipAddress ?? null
    }
  );
}

export async function listNotifications(input: PaginatedRequest & { requester: AuthUser }) {
  const offset = getOffset(input.page, input.pageSize);
  const scopeParams = {
    userId: input.requester.id,
    role: input.requester.role
  };
  const listParams = {
    ...scopeParams,
    limit: String(input.pageSize),
    offset: String(offset)
  };

  const scope = '(user_id = :userId OR role_name = :role)';
  const [countRows] = await pool.execute<CountRow[]>(
    `SELECT COUNT(*) AS total FROM notifications WHERE ${scope}`,
    scopeParams
  );
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, user_id, role_name, title, message, category, entity_type, entity_id, is_read, created_at
     FROM notifications
     WHERE ${scope}
     ORDER BY is_read ASC, created_at DESC
     LIMIT :limit OFFSET :offset`,
    listParams
  );

  return {
    data: rows,
    pagination: toPagination(input.page, input.pageSize, countRows[0].total)
  };
}

export async function markNotificationRead(notificationId: number, requester: AuthUser) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE notifications
     SET is_read = 1
     WHERE id = :notificationId AND (user_id = :userId OR role_name = :role)`,
    {
      notificationId,
      userId: requester.id,
      role: requester.role
    }
  );

  if (result.affectedRows === 0) {
    throw new Error('Notification not found');
  }
}

export async function listAuditLogs(input: PaginatedRequest) {
  const offset = getOffset(input.page, input.pageSize);
  const searchParams = {
    search: `%${input.search ?? ''}%`
  };
  const listParams = {
    ...(input.search ? searchParams : {}),
    limit: String(input.pageSize),
    offset: String(offset)
  };
  const searchClause = input.search
    ? `WHERE a.action LIKE :search
       OR a.entity_type LIKE :search
       OR u.name LIKE :search
       OR u.email LIKE :search`
    : '';

  const [countRows] = await pool.execute<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ${searchClause}`,
    input.search ? searchParams : {}
  );
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
       a.id, a.user_id, u.name AS user_name, u.email AS user_email, a.action,
       a.entity_type, a.entity_id, a.previous_value, a.new_value, a.ip_address, a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ${searchClause}
     ORDER BY a.created_at DESC
     LIMIT :limit OFFSET :offset`,
    listParams
  );

  return {
    data: rows,
    pagination: toPagination(input.page, input.pageSize, countRows[0].total)
  };
}

export async function getReportSummary(range: DateRange) {
  const orderParams: Record<string, string> = {};
  const orderWhere = withDateRange('o.order_date', range, orderParams);
  const paymentParams: Record<string, string> = {};
  const paymentWhere = withDateRange('p.payment_date', range, paymentParams);
  const deliveryParams: Record<string, string> = {};
  const deliveryWhere = withDateRange('d.assigned_at', range, deliveryParams);

  const [[salesTotals], [paymentTotals], [inventoryTotals], [deliveryTotals], [returnTotals]] =
    await Promise.all([
      pool.execute<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS order_count,
           COALESCE(SUM(o.grand_total), 0) AS gross_sales,
           COALESCE(SUM(o.outstanding_amount), 0) AS outstanding_amount,
           COUNT(DISTINCT o.customer_id) AS active_customers
         FROM orders o
         ${orderWhere}`,
        orderParams
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT
           COALESCE(SUM(p.amount), 0) AS payment_collected,
           COUNT(*) AS payment_count
         FROM payments p
         ${paymentWhere}`,
        paymentParams
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS low_stock_variants,
           COALESCE(SUM(current_stock_quantity), 0) AS stock_on_hand
         FROM product_variants
         WHERE current_stock_quantity <= low_stock_level AND status = 'ACTIVE'`
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS delivery_count,
           COALESCE(SUM(d.amount_collected), 0) AS driver_cash_collected
         FROM deliveries d
         ${deliveryWhere}`,
        deliveryParams
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS return_count,
           COALESCE(SUM(refund_amount), 0) AS refund_amount
         FROM returns`
      )
    ]);

  const [salesByDay] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE(o.order_date) AS label, COALESCE(SUM(o.grand_total), 0) AS value, COUNT(*) AS order_count
     FROM orders o
     ${orderWhere}
     GROUP BY DATE(o.order_date)
     ORDER BY label ASC`,
    orderParams
  );
  const [ordersByStatus] = await pool.execute<RowDataPacket[]>(
    `SELECT o.order_status AS label, COUNT(*) AS value
     FROM orders o
     ${orderWhere}
     GROUP BY o.order_status
     ORDER BY value DESC`,
    orderParams
  );
  const [topProducts] = await pool.execute<RowDataPacket[]>(
    `SELECT
       oi.product_name_snapshot AS product_name,
       oi.variant_size_snapshot AS variant_size,
       SUM(oi.quantity) AS quantity_sold,
       COALESCE(SUM(oi.line_total), 0) AS sales_total
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     ${orderWhere}
     GROUP BY oi.product_name_snapshot, oi.variant_size_snapshot
     ORDER BY quantity_sold DESC
     LIMIT 8`,
    orderParams
  );
  const [topCustomers] = await pool.execute<RowDataPacket[]>(
    `SELECT
       c.business_name,
       c.outstanding_balance,
       c.credit_limit,
       COUNT(o.id) AS order_count,
       COALESCE(SUM(o.grand_total), 0) AS sales_total
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id
     ${orderWhere ? orderWhere.replace('WHERE', 'WHERE o.id IS NOT NULL AND') : ''}
     GROUP BY c.id, c.business_name, c.outstanding_balance, c.credit_limit
     ORDER BY sales_total DESC
     LIMIT 8`,
    orderParams
  );
  const [salesReps] = await pool.execute<RowDataPacket[]>(
    `SELECT
       sr.id,
       u.name AS sales_rep_name,
       COUNT(DISTINCT o.id) AS order_count,
       COUNT(DISTINCT o.customer_id) AS customer_count,
       COALESCE(SUM(o.grand_total), 0) AS sales_total,
       COALESCE(SUM(c.commission_amount), 0) AS commission_total,
       COALESCE(MAX(st.target_amount), 0) AS target_amount
     FROM sales_reps sr
     INNER JOIN users u ON u.id = sr.user_id
     LEFT JOIN orders o ON o.sales_rep_id = sr.id
     LEFT JOIN commissions c ON c.sales_rep_id = sr.id AND c.status IN ('EARNED', 'PAID')
     LEFT JOIN sales_targets st ON st.sales_rep_id = sr.id AND st.target_month = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')
     GROUP BY sr.id, u.name
     ORDER BY sales_total DESC`
  );
  const [drivers] = await pool.execute<RowDataPacket[]>(
    `SELECT
       d.id,
       u.name AS driver_name,
       COUNT(del.id) AS delivery_count,
       SUM(del.status = 'FULLY_DELIVERED') AS delivered_count,
       COALESCE(SUM(del.amount_collected), 0) AS cash_collected
     FROM drivers d
     INNER JOIN users u ON u.id = d.user_id
     LEFT JOIN deliveries del ON del.driver_id = d.id
     GROUP BY d.id, u.name
     ORDER BY delivery_count DESC`
  );
  const [financialBreakdown] = await pool.execute<RowDataPacket[]>(
    `SELECT p.payment_method AS label, COALESCE(SUM(p.amount), 0) AS value, COUNT(*) AS payment_count
     FROM payments p
     ${paymentWhere}
     GROUP BY p.payment_method
     ORDER BY value DESC`,
    paymentParams
  );

  return {
    summary: {
      order_count: salesTotals[0]?.order_count ?? 0,
      gross_sales: salesTotals[0]?.gross_sales ?? '0.00',
      outstanding_amount: salesTotals[0]?.outstanding_amount ?? '0.00',
      active_customers: salesTotals[0]?.active_customers ?? 0,
      payment_collected: paymentTotals[0]?.payment_collected ?? '0.00',
      payment_count: paymentTotals[0]?.payment_count ?? 0,
      low_stock_variants: inventoryTotals[0]?.low_stock_variants ?? 0,
      stock_on_hand: inventoryTotals[0]?.stock_on_hand ?? 0,
      delivery_count: deliveryTotals[0]?.delivery_count ?? 0,
      driver_cash_collected: deliveryTotals[0]?.driver_cash_collected ?? '0.00',
      return_count: returnTotals[0]?.return_count ?? 0,
      refund_amount: returnTotals[0]?.refund_amount ?? '0.00'
    },
    salesByDay,
    ordersByStatus,
    topProducts,
    topCustomers,
    salesReps,
    drivers,
    financialBreakdown
  };
}

async function insertNotificationOnce(input: NotificationInput) {
  const [rows] = await pool.execute<IdRow[]>(
    `SELECT id FROM notifications
     WHERE title = :title AND category = :category AND COALESCE(entity_type, '') = COALESCE(:entityType, '')
       AND COALESCE(entity_id, 0) = COALESCE(:entityId, 0)
     LIMIT 1`,
    {
      title: input.title,
      category: input.category,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null
    }
  );

  if (rows.length === 0) {
    await createNotification(input);
  }
}

async function insertAuditLogOnce(input: AuditLogInput) {
  const [rows] = await pool.execute<IdRow[]>(
    `SELECT id FROM audit_logs
     WHERE action = :action AND entity_type = :entityType AND COALESCE(entity_id, 0) = COALESCE(:entityId, 0)
     LIMIT 1`,
    {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null
    }
  );

  if (rows.length === 0) {
    await createAuditLog(input);
  }
}

export async function ensurePhase7Seed(
  adminUserId: number,
  salesUserId: number,
  driverUserId: number,
  customerUserId: number
) {
  const [orderRows] = await pool.execute<IdRow[]>('SELECT id FROM orders ORDER BY id ASC LIMIT 1');
  const [variantRows] = await pool.execute<IdRow[]>('SELECT id FROM product_variants ORDER BY id ASC LIMIT 1');
  const [paymentRows] = await pool.execute<IdRow[]>('SELECT id FROM payments ORDER BY id ASC LIMIT 1');
  const orderId = orderRows[0]?.id ?? null;
  const variantId = variantRows[0]?.id ?? null;
  const paymentId = paymentRows[0]?.id ?? null;

  await insertNotificationOnce({
    roleName: 'ADMIN',
    title: 'Low stock requires review',
    message: 'One or more frame variants are at or below their reorder level.',
    category: 'INVENTORY',
    entityType: 'product_variant',
    entityId: variantId
  });
  await insertNotificationOnce({
    userId: salesUserId,
    title: 'Target progress updated',
    message: 'Your monthly target and commission progress are ready to review.',
    category: 'TARGET',
    entityType: 'sales_target',
    entityId: null
  });
  await insertNotificationOnce({
    userId: driverUserId,
    title: 'Delivery assigned',
    message: 'A delivery has been assigned and is ready for route planning.',
    category: 'DELIVERY',
    entityType: 'order',
    entityId: orderId
  });
  await insertNotificationOnce({
    userId: customerUserId,
    title: 'Order status updated',
    message: 'Your wholesale photoframe order has moved forward in processing.',
    category: 'ORDER',
    entityType: 'order',
    entityId: orderId
  });
  await insertNotificationOnce({
    roleName: 'ADMIN',
    title: 'Payment received',
    message: 'A customer payment was recorded and reflected in ledger balances.',
    category: 'PAYMENT',
    entityType: 'payment',
    entityId: paymentId
  });

  await insertAuditLogOnce({
    userId: adminUserId,
    action: 'ORDER_STATUS_CHANGED',
    entityType: 'order',
    entityId: orderId,
    previousValue: { order_status: 'PENDING' },
    newValue: { order_status: 'READY_FOR_DELIVERY' },
    ipAddress: '127.0.0.1'
  });
  await insertAuditLogOnce({
    userId: adminUserId,
    action: 'STOCK_OPENING_BALANCE_CREATED',
    entityType: 'product_variant',
    entityId: variantId,
    previousValue: { current_stock_quantity: 0 },
    newValue: { source: 'Development opening stock' },
    ipAddress: '127.0.0.1'
  });
  await insertAuditLogOnce({
    userId: adminUserId,
    action: 'PAYMENT_RECORDED',
    entityType: 'payment',
    entityId: paymentId,
    previousValue: null,
    newValue: { payment_status: 'PARTIALLY_PAID' },
    ipAddress: '127.0.0.1'
  });
}
