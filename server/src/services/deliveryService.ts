import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import type { RoleName } from '../types/auth.js';
import { getOffset, toPagination } from '../utils/pagination.js';
import { createPayment, type PaymentMethod } from './financeService.js';
import type { OrderStatus } from './orderService.js';

export type DeliveryStatus =
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'FULLY_DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'CUSTOMER_NOT_AVAILABLE'
  | 'DELIVERY_FAILED'
  | 'CANCELLED';

export type DeliveryResult =
  | 'FULLY_DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'CUSTOMER_NOT_AVAILABLE'
  | 'DELIVERY_FAILED';

interface CountRow extends RowDataPacket {
  total: number;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface OrderDeliveryRow extends RowDataPacket {
  id: number;
  order_status: OrderStatus;
  outstanding_amount: string;
  customer_id: number;
  address: string | null;
  district: string | null;
}

interface DeliveryLockRow extends RowDataPacket {
  id: number;
  order_id: number;
  driver_id: number;
  status: DeliveryStatus;
  outstanding_amount: string;
}

export interface DriverRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  vehicle_number: string | null;
  vehicle_type: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface DeliveryRow extends RowDataPacket {
  id: number;
  delivery_number: string;
  order_id: number;
  order_number: string;
  driver_id: number;
  driver_name: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  district: string | null;
  grand_total: string;
  outstanding_amount: string;
  payment_method: PaymentMethod;
  payment_status: string;
  status: DeliveryStatus;
  result: DeliveryResult | null;
  amount_collected: string;
  assigned_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  notes: string | null;
}

export interface DeliveryHistoryRow extends RowDataPacket {
  id: number;
  previous_status: DeliveryStatus | null;
  new_status: DeliveryStatus;
  changed_by_name: string;
  note: string | null;
  created_at: Date;
}

function makeDeliveryNumber() {
  return `DEL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function getDriverForUser(userId: number, connection: PoolConnection | typeof pool = pool) {
  const [rows] = await connection.execute<IdRow[]>(
    'SELECT id FROM drivers WHERE user_id = :userId AND status = :status LIMIT 1',
    { userId, status: 'ACTIVE' }
  );
  return rows[0]?.id ?? null;
}

async function appendOrderStatus(
  connection: PoolConnection,
  orderId: number,
  previousStatus: OrderStatus,
  newStatus: OrderStatus,
  changedBy: number,
  note: string
) {
  await connection.execute(
    'UPDATE orders SET order_status = :newStatus WHERE id = :orderId',
    { newStatus, orderId }
  );
  await connection.execute(
    `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, note)
     VALUES (:orderId, :previousStatus, :newStatus, :changedBy, :note)`,
    { orderId, previousStatus, newStatus, changedBy, note }
  );
}

async function appendDeliveryHistory(
  connection: PoolConnection,
  deliveryId: number,
  previousStatus: DeliveryStatus | null,
  newStatus: DeliveryStatus,
  changedBy: number,
  note?: string | null
) {
  await connection.execute(
    `INSERT INTO delivery_status_history (delivery_id, previous_status, new_status, changed_by_user_id, note)
     VALUES (:deliveryId, :previousStatus, :newStatus, :changedBy, :note)`,
    {
      deliveryId,
      previousStatus,
      newStatus,
      changedBy,
      note: note ?? null
    }
  );
}

export async function listDrivers() {
  const [rows] = await pool.execute<DriverRow[]>(
    `SELECT d.*, u.name, u.email, u.phone
     FROM drivers d
     INNER JOIN users u ON u.id = d.user_id
     WHERE d.status = 'ACTIVE' AND u.status = 'ACTIVE'
     ORDER BY u.name ASC`
  );
  return rows;
}

export async function assignDelivery(input: {
  orderId: number;
  driverId: number;
  assignedBy: number;
  notes?: string | null;
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.execute<OrderDeliveryRow[]>(
      `SELECT o.id, o.order_status, o.outstanding_amount, o.customer_id, c.address, c.district
       FROM orders o
       INNER JOIN customers c ON c.id = o.customer_id
       WHERE o.id = :orderId
       FOR UPDATE`,
      { orderId: input.orderId }
    );
    const order = orders[0];
    if (!order) throw new Error('Order not found');
    if (!['READY_FOR_DELIVERY', 'DRIVER_ASSIGNED'].includes(order.order_status)) {
      throw new Error('Only ready orders can be assigned to drivers');
    }

    const [drivers] = await connection.execute<IdRow[]>(
      'SELECT id FROM drivers WHERE id = :driverId AND status = :status LIMIT 1',
      { driverId: input.driverId, status: 'ACTIVE' }
    );
    if (!drivers[0]) throw new Error('Driver not found or inactive');

    const [existing] = await connection.execute<IdRow[]>(
      'SELECT id FROM deliveries WHERE order_id = :orderId LIMIT 1',
      { orderId: input.orderId }
    );

    let deliveryId = existing[0]?.id;
    if (deliveryId) {
      await connection.execute(
        `UPDATE deliveries
         SET driver_id = :driverId, delivery_address = :address, district = :district, notes = :notes
         WHERE id = :deliveryId`,
        {
          deliveryId,
          driverId: input.driverId,
          address: order.address,
          district: order.district,
          notes: input.notes ?? null
        }
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO deliveries (
           delivery_number, order_id, driver_id, assigned_by, delivery_address, district, status, notes
         )
         VALUES (
           :deliveryNumber, :orderId, :driverId, :assignedBy, :address, :district, 'ASSIGNED', :notes
         )`,
        {
          deliveryNumber: makeDeliveryNumber(),
          orderId: input.orderId,
          driverId: input.driverId,
          assignedBy: input.assignedBy,
          address: order.address,
          district: order.district,
          notes: input.notes ?? null
        }
      );
      deliveryId = Number((result as { insertId: number }).insertId);
      await appendDeliveryHistory(connection, deliveryId, null, 'ASSIGNED', input.assignedBy, input.notes);
    }

    if (order.order_status !== 'DRIVER_ASSIGNED') {
      await appendOrderStatus(
        connection,
        input.orderId,
        order.order_status,
        'DRIVER_ASSIGNED',
        input.assignedBy,
        'Driver assigned for delivery'
      );
    }

    await connection.commit();
    return deliveryId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listDeliveries(params: {
  page: number;
  pageSize: number;
  search: string;
  status?: DeliveryStatus;
  requester: { id: number; role: RoleName };
}) {
  const filters = ['(:search = \'\' OR d.delivery_number LIKE :term OR o.order_number LIKE :term OR c.business_name LIKE :term)'];
  const values: Record<string, string | number> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };

  if (params.status) {
    filters.push('d.status = :status');
    values.status = params.status;
  }

  if (params.requester.role === 'DRIVER') {
    const driverId = await getDriverForUser(params.requester.id);
    filters.push('d.driver_id = :driverId');
    values.driverId = driverId ?? 0;
  }

  const where = filters.join(' AND ');
  const [rows] = await pool.query<DeliveryRow[]>(
    `SELECT
       d.*, o.order_number, o.grand_total, o.outstanding_amount, o.payment_method, o.payment_status,
       c.business_name AS customer_name, c.phone AS customer_phone,
       u.name AS driver_name
     FROM deliveries d
     INNER JOIN orders o ON o.id = d.order_id
     INNER JOIN customers c ON c.id = o.customer_id
     INNER JOIN drivers drv ON drv.id = d.driver_id
     INNER JOIN users u ON u.id = drv.user_id
     WHERE ${where}
     ORDER BY d.assigned_at DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM deliveries d
     INNER JOIN orders o ON o.id = d.order_id
     INNER JOIN customers c ON c.id = o.customer_id
     WHERE ${where}`,
    values
  );

  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function getDeliveryDetails(deliveryId: number, requester: { id: number; role: RoleName }) {
  const filters = ['d.id = :deliveryId'];
  const values: Record<string, number> = { deliveryId };
  if (requester.role === 'DRIVER') {
    const driverId = await getDriverForUser(requester.id);
    filters.push('d.driver_id = :driverId');
    values.driverId = driverId ?? 0;
  }
  const [rows] = await pool.execute<DeliveryRow[]>(
    `SELECT
       d.*, o.order_number, o.grand_total, o.outstanding_amount, o.payment_method, o.payment_status,
       c.business_name AS customer_name, c.phone AS customer_phone,
       u.name AS driver_name
     FROM deliveries d
     INNER JOIN orders o ON o.id = d.order_id
     INNER JOIN customers c ON c.id = o.customer_id
     INNER JOIN drivers drv ON drv.id = d.driver_id
     INNER JOIN users u ON u.id = drv.user_id
     WHERE ${filters.join(' AND ')}
     LIMIT 1`,
    values
  );
  const delivery = rows[0];
  if (!delivery) throw new Error('Delivery not found');

  const [history] = await pool.execute<DeliveryHistoryRow[]>(
    `SELECT h.*, u.name AS changed_by_name
     FROM delivery_status_history h
     INNER JOIN users u ON u.id = h.changed_by_user_id
     WHERE h.delivery_id = :deliveryId
     ORDER BY h.created_at ASC`,
    { deliveryId }
  );

  return { delivery, history };
}

export async function startDelivery(deliveryId: number, requester: { id: number; role: RoleName }) {
  if (requester.role !== 'DRIVER') throw new Error('Only drivers can start deliveries');
  const driverId = await getDriverForUser(requester.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<DeliveryLockRow[]>(
      `SELECT d.id, d.order_id, d.driver_id, d.status, o.outstanding_amount
       FROM deliveries d
       INNER JOIN orders o ON o.id = d.order_id
       WHERE d.id = :deliveryId
       FOR UPDATE`,
      { deliveryId }
    );
    const delivery = rows[0];
    if (!delivery || delivery.driver_id !== driverId) throw new Error('Delivery not found');
    if (delivery.status !== 'ASSIGNED') throw new Error('Only assigned deliveries can be started');

    await connection.execute(
      `UPDATE deliveries
       SET status = 'OUT_FOR_DELIVERY', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
       WHERE id = :deliveryId`,
      { deliveryId }
    );
    await appendDeliveryHistory(connection, deliveryId, 'ASSIGNED', 'OUT_FOR_DELIVERY', requester.id, 'Delivery started');
    await appendOrderStatus(connection, delivery.order_id, 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', requester.id, 'Driver started delivery');
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function completeDelivery(input: {
  deliveryId: number;
  result: DeliveryResult;
  paymentReceived: boolean;
  paymentMethod?: PaymentMethod;
  amountReceived?: number;
  referenceNumber?: string | null;
  notes?: string | null;
  requester: { id: number; role: RoleName };
}) {
  if (input.requester.role !== 'DRIVER') throw new Error('Only drivers can complete deliveries');
  const driverId = await getDriverForUser(input.requester.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<DeliveryLockRow[]>(
      `SELECT d.id, d.order_id, d.driver_id, d.status, o.outstanding_amount
       FROM deliveries d
       INNER JOIN orders o ON o.id = d.order_id
       WHERE d.id = :deliveryId
       FOR UPDATE`,
      { deliveryId: input.deliveryId }
    );
    const delivery = rows[0];
    if (!delivery || delivery.driver_id !== driverId) throw new Error('Delivery not found');
    if (delivery.status !== 'OUT_FOR_DELIVERY') throw new Error('Only out-for-delivery jobs can be completed');

    const amount = input.paymentReceived ? Number(input.amountReceived ?? 0) : 0;
    if (input.paymentReceived && amount <= 0) throw new Error('Amount received is required');
    if (input.paymentReceived && !input.paymentMethod) throw new Error('Payment method is required');
    if (amount > Number(delivery.outstanding_amount)) {
      throw new Error('Amount received cannot exceed the order outstanding balance');
    }

    await connection.execute(
      `UPDATE deliveries
       SET status = :status, result = :result, amount_collected = :amount,
           completed_at = CURRENT_TIMESTAMP, notes = :notes
       WHERE id = :deliveryId`,
      {
        status: input.result,
        result: input.result,
        amount,
        notes: input.notes ?? null,
        deliveryId: input.deliveryId
      }
    );
    await appendDeliveryHistory(connection, input.deliveryId, 'OUT_FOR_DELIVERY', input.result, input.requester.id, input.notes);

    const orderStatus: OrderStatus =
      input.result === 'FULLY_DELIVERED'
        ? 'DELIVERED'
        : input.result === 'PARTIALLY_DELIVERED'
          ? 'PARTIALLY_DELIVERED'
          : 'DRIVER_ASSIGNED';

    await appendOrderStatus(connection, delivery.order_id, 'OUT_FOR_DELIVERY', orderStatus, input.requester.id, input.notes ?? input.result.replace(/_/g, ' '));
    await connection.commit();

    if (input.paymentReceived && input.paymentMethod) {
      const [invoiceRows] = await pool.execute<IdRow[]>(
        'SELECT id FROM invoices WHERE order_id = :orderId LIMIT 1',
        { orderId: delivery.order_id }
      );
      if (!invoiceRows[0]) throw new Error('Invoice not found for delivered order');
      await createPayment(
        {
          invoiceId: invoiceRows[0].id,
          amount,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber ?? null,
          note: input.notes ?? 'Driver collected payment'
        },
        input.requester
      );
    }
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}
