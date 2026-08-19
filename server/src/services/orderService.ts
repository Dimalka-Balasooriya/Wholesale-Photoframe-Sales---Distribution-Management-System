import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { createInvoiceForOrder } from './financeService.js';
import type { RoleName } from '../types/auth.js';
import { getOffset, toPagination } from '../utils/pagination.js';

export type OrderSource = 'CUSTOMER_PORTAL' | 'SALES_REP' | 'ADMIN';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'COD' | 'CREDIT';
export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'DISCOUNT_APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'PREPARING'
  | 'READY_FOR_DELIVERY'
  | 'DRIVER_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED';

interface CountRow extends RowDataPacket {
  total: number;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface SalesRepRow extends RowDataPacket {
  id: number;
  max_discount_percent: string;
}

interface CustomerAccessRow extends RowDataPacket {
  id: number;
  assigned_sales_rep_id: number | null;
  credit_limit: string;
  outstanding_balance: string;
  customer_type: 'CASH_CUSTOMER' | 'CREDIT_CUSTOMER' | 'WHOLESALE_CUSTOMER' | 'VIP_CUSTOMER';
}

interface VariantSnapshotRow extends RowDataPacket {
  id: number;
  product_id: number;
  product_name: string;
  size: string;
  wholesale_price: string;
  current_stock_quantity: number;
  status: 'ACTIVE' | 'INACTIVE';
  product_status: 'ACTIVE' | 'INACTIVE';
}

export interface OrderRow extends RowDataPacket {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  sales_rep_id: number | null;
  sales_rep_name: string | null;
  order_source: OrderSource;
  order_date: Date;
  subtotal: string;
  discount_percentage: string;
  discount_amount: string;
  delivery_charge: string;
  grand_total: string;
  amount_paid: string;
  outstanding_amount: string;
  payment_method: PaymentMethod;
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  credit_approval_required: 0 | 1;
  order_status: OrderStatus;
  notes: string | null;
  created_at: Date;
}

export interface OrderItemRow extends RowDataPacket {
  id: number;
  order_id: number;
  product_id: number;
  variant_id: number;
  product_name_snapshot: string;
  variant_size_snapshot: string;
  quantity: number;
  unit_price: string;
  discount: string;
  line_total: string;
}

export interface OrderHistoryRow extends RowDataPacket {
  id: number;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by_name: string;
  note: string | null;
  created_at: Date;
}

export interface CreateOrderInput {
  customerId?: number;
  items: Array<{ variantId: number; quantity: number; discount?: number }>;
  discountPercentage: number;
  deliveryCharge: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['PENDING', 'CANCELLED'],
  PENDING: ['DISCOUNT_APPROVAL_REQUIRED', 'APPROVED', 'CANCELLED'],
  DISCOUNT_APPROVAL_REQUIRED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED'],
  PARTIALLY_DELIVERED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['COMPLETED', 'RETURNED'],
  COMPLETED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: []
};

async function getSalesRepForUser(userId: number, connection: PoolConnection | typeof pool = pool) {
  const [rows] = await connection.execute<SalesRepRow[]>(
    'SELECT id, max_discount_percent FROM sales_reps WHERE user_id = :userId LIMIT 1',
    { userId }
  );
  return rows[0] ?? null;
}

async function resolveCustomerId(userId: number, role: RoleName, requestedCustomerId?: number) {
  if (role === 'CUSTOMER') {
    const [rows] = await pool.execute<IdRow[]>(
      'SELECT id FROM customers WHERE user_id = :userId LIMIT 1',
      { userId }
    );
    if (!rows[0]) throw new Error('Customer profile not found for this user');
    return rows[0].id;
  }

  if (!requestedCustomerId) throw new Error('Customer is required');
  return requestedCustomerId;
}

async function assertCustomerAccess(
  connection: PoolConnection,
  customerId: number,
  requester: { id: number; role: RoleName }
) {
  const [rows] = await connection.execute<CustomerAccessRow[]>(
    `SELECT id, assigned_sales_rep_id, credit_limit, outstanding_balance, customer_type
     FROM customers
     WHERE id = :customerId AND status = :status
     LIMIT 1`,
    { customerId, status: 'ACTIVE' }
  );
  const customer = rows[0];
  if (!customer) throw new Error('Customer not found or inactive');

  if (requester.role === 'SALES_REP') {
    const salesRep = await getSalesRepForUser(requester.id, connection);
    if (!salesRep || customer.assigned_sales_rep_id !== salesRep.id) {
      throw new Error('This customer is not assigned to the sales representative');
    }
    return salesRep;
  }

  return null;
}

function sourceForRole(role: RoleName): OrderSource {
  if (role === 'CUSTOMER') return 'CUSTOMER_PORTAL';
  if (role === 'SALES_REP') return 'SALES_REP';
  return 'ADMIN';
}

function makeOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function createOrder(input: CreateOrderInput, requester: { id: number; role: RoleName }) {
  if (input.items.length === 0) throw new Error('Order must contain at least one item');

  const customerId = await resolveCustomerId(requester.id, requester.role, input.customerId);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const salesRep = await assertCustomerAccess(connection, customerId, requester);

    let salesRepId: number | null = salesRep?.id ?? null;
    if (requester.role === 'ADMIN') {
      const [customerRows] = await connection.execute<CustomerAccessRow[]>(
        'SELECT id, assigned_sales_rep_id, credit_limit, outstanding_balance, customer_type FROM customers WHERE id = :customerId LIMIT 1',
        { customerId }
      );
      salesRepId = customerRows[0]?.assigned_sales_rep_id ?? null;
    }

    const normalizedDiscountPercentage = Math.max(0, input.discountPercentage);
    const maxDiscount = Number(salesRep?.max_discount_percent ?? 100);
    const orderStatus: OrderStatus =
      requester.role === 'SALES_REP' && normalizedDiscountPercentage > maxDiscount
        ? 'DISCOUNT_APPROVAL_REQUIRED'
        : 'PENDING';

    const items = [];
    for (const item of input.items) {
      const [variantRows] = await connection.execute<VariantSnapshotRow[]>(
        `SELECT
           v.id, v.product_id, p.name AS product_name, v.size, v.wholesale_price,
           v.current_stock_quantity, v.status, p.status AS product_status
         FROM product_variants v
         INNER JOIN products p ON p.id = v.product_id
         WHERE v.id = :variantId
         LIMIT 1`,
        { variantId: item.variantId }
      );
      const variant = variantRows[0];
      if (!variant || variant.status !== 'ACTIVE' || variant.product_status !== 'ACTIVE') {
        throw new Error('One or more selected products are unavailable');
      }
      if (item.quantity > variant.current_stock_quantity) {
        throw new Error(`${variant.product_name} ${variant.size} has only ${variant.current_stock_quantity} in stock`);
      }
      const unitPrice = Number(variant.wholesale_price);
      const lineDiscount = Number(item.discount ?? 0);
      const lineTotal = Math.max(0, unitPrice * item.quantity - lineDiscount);
      items.push({ ...variant, quantity: item.quantity, discount: lineDiscount, unitPrice, lineTotal });
    }

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = subtotal * (normalizedDiscountPercentage / 100);
    const deliveryCharge = Math.max(0, input.deliveryCharge);
    const itemDiscountTotal = items.reduce((sum, item) => sum + item.discount, 0);
    const grandTotal = Math.max(0, subtotal - discountAmount - itemDiscountTotal + deliveryCharge);
    const [creditRows] = await connection.execute<CustomerAccessRow[]>(
      'SELECT id, assigned_sales_rep_id, credit_limit, outstanding_balance, customer_type FROM customers WHERE id = :customerId LIMIT 1',
      { customerId }
    );
    const customerCredit = creditRows[0];
    const availableCredit =
      Number(customerCredit?.credit_limit ?? 0) - Number(customerCredit?.outstanding_balance ?? 0);
    const creditApprovalRequired =
      input.paymentMethod === 'CREDIT' && grandTotal > availableCredit && requester.role !== 'ADMIN';
    const financeNote = creditApprovalRequired
      ? `${input.notes ? `${input.notes}\n` : ''}Credit limit exceeded by Rs. ${(grandTotal - availableCredit).toLocaleString()}. Admin approval required.`
      : input.notes ?? null;

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
         order_number, customer_id, sales_rep_id, created_by_user_id, order_source,
         subtotal, discount_percentage, discount_amount, delivery_charge, grand_total,
         outstanding_amount, payment_method, credit_approval_required, order_status, notes
       )
       VALUES (
         :orderNumber, :customerId, :salesRepId, :createdBy, :orderSource,
         :subtotal, :discountPercentage, :discountAmount, :deliveryCharge, :grandTotal,
         :grandTotal, :paymentMethod, :creditApprovalRequired, :orderStatus, :notes
       )`,
      {
        orderNumber: makeOrderNumber(),
        customerId,
        salesRepId,
        createdBy: requester.id,
        orderSource: sourceForRole(requester.role),
        subtotal,
        discountPercentage: normalizedDiscountPercentage,
        discountAmount,
        deliveryCharge,
        grandTotal,
        paymentMethod: input.paymentMethod,
        creditApprovalRequired: creditApprovalRequired ? 1 : 0,
        orderStatus,
        notes: financeNote
      }
    );

    const orderId = Number((orderResult as { insertId: number }).insertId);

    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items (
           order_id, product_id, variant_id, product_name_snapshot, variant_size_snapshot,
           quantity, unit_price, discount, line_total
         )
         VALUES (
           :orderId, :productId, :variantId, :productName, :variantSize,
           :quantity, :unitPrice, :discount, :lineTotal
         )`,
        {
          orderId,
          productId: item.product_id,
          variantId: item.id,
          productName: item.product_name,
          variantSize: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          lineTotal: item.lineTotal
        }
      );
    }

    await connection.execute(
      `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, note)
       VALUES (:orderId, NULL, :orderStatus, :changedBy, :note)`,
      {
        orderId,
        orderStatus,
        changedBy: requester.id,
        note: 'Order created'
      }
    );

    await createInvoiceForOrder(connection, orderId);

    await connection.commit();
    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listOrders(params: {
  page: number;
  pageSize: number;
  search: string;
  status?: OrderStatus;
  requester: { id: number; role: RoleName };
}) {
  const filters = ['(:search = \'\' OR o.order_number LIKE :term OR c.business_name LIKE :term)'];
  const values: Record<string, string | number | null> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };

  if (params.status) {
    filters.push('o.order_status = :status');
    values.status = params.status;
  }

  if (params.requester.role === 'CUSTOMER') {
    filters.push('c.user_id = :userId');
    values.userId = params.requester.id;
  }

  if (params.requester.role === 'SALES_REP') {
    const salesRep = await getSalesRepForUser(params.requester.id);
    filters.push('o.sales_rep_id = :salesRepId');
    values.salesRepId = salesRep?.id ?? 0;
  }

  const where = filters.join(' AND ');
  const [rows] = await pool.query<OrderRow[]>(
    `SELECT
       o.*, c.business_name AS customer_name, rep_user.name AS sales_rep_name
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     LEFT JOIN sales_reps sr ON sr.id = o.sales_rep_id
     LEFT JOIN users rep_user ON rep_user.id = sr.user_id
     WHERE ${where}
     ORDER BY o.order_date DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     WHERE ${where}`,
    values
  );

  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function getOrderDetails(orderId: number, requester: { id: number; role: RoleName }) {
  const canSeeAny = requester.role === 'ADMIN';

  const filters = ['o.id = :orderId'];
  const values: Record<string, number> = { orderId };
  if (!canSeeAny && requester.role === 'CUSTOMER') {
    filters.push('c.user_id = :userId');
    values.userId = requester.id;
  }
  if (!canSeeAny && requester.role === 'SALES_REP') {
    const salesRep = await getSalesRepForUser(requester.id);
    filters.push('o.sales_rep_id = :salesRepId');
    values.salesRepId = salesRep?.id ?? 0;
  }

  const [orders] = await pool.execute<OrderRow[]>(
    `SELECT o.*, c.business_name AS customer_name, rep_user.name AS sales_rep_name
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     LEFT JOIN sales_reps sr ON sr.id = o.sales_rep_id
     LEFT JOIN users rep_user ON rep_user.id = sr.user_id
     WHERE ${filters.join(' AND ')}
     LIMIT 1`,
    values
  );

  const order = orders[0];
  if (!order) throw new Error('Order not found');

  const [items] = await pool.execute<OrderItemRow[]>(
    'SELECT * FROM order_items WHERE order_id = :orderId ORDER BY id ASC',
    { orderId }
  );
  const [history] = await pool.execute<OrderHistoryRow[]>(
    `SELECT h.*, u.name AS changed_by_name
     FROM order_status_history h
     INNER JOIN users u ON u.id = h.changed_by_user_id
     WHERE h.order_id = :orderId
     ORDER BY h.created_at ASC`,
    { orderId }
  );

  return { order, items, history };
}

export async function updateOrderStatus(params: {
  orderId: number;
  newStatus: OrderStatus;
  changedBy: number;
  note?: string | null;
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<Array<RowDataPacket & { order_status: OrderStatus }>>(
      'SELECT order_status FROM orders WHERE id = :orderId FOR UPDATE',
      { orderId: params.orderId }
    );
    const order = rows[0];
    if (!order) throw new Error('Order not found');

    const allowed = statusTransitions[order.order_status];
    if (!allowed.includes(params.newStatus)) {
      throw new Error(`Invalid status transition from ${order.order_status} to ${params.newStatus}`);
    }

    await connection.execute(
      'UPDATE orders SET order_status = :newStatus WHERE id = :orderId',
      { newStatus: params.newStatus, orderId: params.orderId }
    );
    await connection.execute(
      `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, note)
       VALUES (:orderId, :previousStatus, :newStatus, :changedBy, :note)`,
      {
        orderId: params.orderId,
        previousStatus: order.order_status,
        newStatus: params.newStatus,
        changedBy: params.changedBy,
        note: params.note ?? null
      }
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
