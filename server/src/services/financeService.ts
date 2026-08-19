import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import type { RoleName } from '../types/auth.js';
import { getOffset, toPagination } from '../utils/pagination.js';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'COD' | 'CREDIT' | 'OTHER';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

interface CountRow extends RowDataPacket {
  total: number;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface BalanceRow extends RowDataPacket {
  running_balance: string;
}

interface InvoiceSourceRow extends RowDataPacket {
  order_id: number;
  order_number: string;
  customer_id: number;
  business_name: string;
  phone: string | null;
  address: string | null;
  subtotal: string;
  discount_amount: string;
  delivery_charge: string;
  grand_total: string;
  amount_paid: string;
  outstanding_amount: string;
  payment_status: PaymentStatus;
}

interface PaymentTargetRow extends RowDataPacket {
  invoice_id: number;
  order_id: number;
  customer_id: number;
  outstanding_amount: string;
  amount_paid: string;
  grand_total: string;
}

export interface InvoiceRow extends RowDataPacket {
  id: number;
  invoice_number: string;
  order_id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  phone: string | null;
  grand_total: string;
  amount_paid: string;
  outstanding_amount: string;
  payment_status: PaymentStatus;
  invoice_date: Date;
}

export interface PaymentRow extends RowDataPacket {
  id: number;
  payment_number: string;
  customer_name: string;
  order_number: string;
  invoice_number: string;
  amount: string;
  payment_method: PaymentMethod;
  payment_date: Date;
  received_by_name: string;
  reference_number: string | null;
  note: string | null;
}

export interface LedgerRow extends RowDataPacket {
  id: number;
  customer_id: number;
  reference: string;
  reference_id: number | null;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'RETURN' | 'MANUAL_ADJUSTMENT';
  debit: string;
  credit: string;
  running_balance: string;
  note: string | null;
  created_at: Date;
}

export interface CreatePaymentInput {
  invoiceId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  note?: string | null;
  allowOverpayment?: boolean;
}

function makeInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function makePaymentNumber() {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function paymentStatusFor(amountPaid: number, grandTotal: number): PaymentStatus {
  if (amountPaid <= 0) return 'UNPAID';
  if (amountPaid >= grandTotal) return 'PAID';
  return 'PARTIALLY_PAID';
}

export async function appendLedgerEntry(
  connection: PoolConnection,
  input: {
    customerId: number;
    reference: string;
    referenceId?: number | null;
    type: LedgerRow['type'];
    debit?: number;
    credit?: number;
    note?: string | null;
  }
) {
  const [rows] = await connection.execute<BalanceRow[]>(
    `SELECT running_balance
     FROM customer_ledger
     WHERE customer_id = :customerId
     ORDER BY id DESC
     LIMIT 1`,
    { customerId: input.customerId }
  );
  const previousBalance = Number(rows[0]?.running_balance ?? 0);
  const debit = input.debit ?? 0;
  const credit = input.credit ?? 0;
  const runningBalance = previousBalance + debit - credit;

  await connection.execute(
    `INSERT INTO customer_ledger (
       customer_id, reference, reference_id, type, debit, credit, running_balance, note
     )
     VALUES (
       :customerId, :reference, :referenceId, :type, :debit, :credit, :runningBalance, :note
     )`,
    {
      customerId: input.customerId,
      reference: input.reference,
      referenceId: input.referenceId ?? null,
      type: input.type,
      debit,
      credit,
      runningBalance,
      note: input.note ?? null
    }
  );

  await connection.execute(
    'UPDATE customers SET outstanding_balance = :runningBalance WHERE id = :customerId',
    { runningBalance, customerId: input.customerId }
  );

  return runningBalance;
}

export async function createInvoiceForOrder(connection: PoolConnection, orderId: number) {
  const [existing] = await connection.execute<IdRow[]>(
    'SELECT id FROM invoices WHERE order_id = :orderId LIMIT 1',
    { orderId }
  );
  if (existing[0]) return existing[0].id;

  const [rows] = await connection.execute<InvoiceSourceRow[]>(
    `SELECT
       o.id AS order_id, o.order_number, o.customer_id, c.business_name, c.phone, c.address,
       o.subtotal, o.discount_amount, o.delivery_charge, o.grand_total,
       o.amount_paid, o.outstanding_amount, o.payment_status
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     WHERE o.id = :orderId
     LIMIT 1`,
    { orderId }
  );
  const source = rows[0];
  if (!source) throw new Error('Order not found for invoice generation');

  const [result] = await connection.execute(
    `INSERT INTO invoices (
       invoice_number, order_id, customer_id, billing_address, phone,
       subtotal, discount_amount, delivery_charge, grand_total,
       amount_paid, outstanding_amount, payment_status
     )
     VALUES (
       :invoiceNumber, :orderId, :customerId, :billingAddress, :phone,
       :subtotal, :discountAmount, :deliveryCharge, :grandTotal,
       :amountPaid, :outstandingAmount, :paymentStatus
     )`,
    {
      invoiceNumber: makeInvoiceNumber(),
      orderId: source.order_id,
      customerId: source.customer_id,
      billingAddress: source.address,
      phone: source.phone,
      subtotal: source.subtotal,
      discountAmount: source.discount_amount,
      deliveryCharge: source.delivery_charge,
      grandTotal: source.grand_total,
      amountPaid: source.amount_paid,
      outstandingAmount: source.outstanding_amount,
      paymentStatus: source.payment_status
    }
  );
  const invoiceId = Number((result as { insertId: number }).insertId);

  await appendLedgerEntry(connection, {
    customerId: source.customer_id,
    reference: source.order_number,
    referenceId: invoiceId,
    type: 'INVOICE',
    debit: Number(source.grand_total),
    note: 'Invoice generated from order'
  });

  return invoiceId;
}

export async function createPayment(input: CreatePaymentInput, requester: { id: number; role: RoleName }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<PaymentTargetRow[]>(
      `SELECT
         i.id AS invoice_id, i.order_id, i.customer_id, i.outstanding_amount,
         i.amount_paid, i.grand_total
       FROM invoices i
       WHERE i.id = :invoiceId
       FOR UPDATE`,
      { invoiceId: input.invoiceId }
    );
    const target = rows[0];
    if (!target) throw new Error('Invoice not found');

    const amount = Number(input.amount);
    const outstanding = Number(target.outstanding_amount);
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');
    if (amount > outstanding && !(input.allowOverpayment && requester.role === 'ADMIN')) {
      throw new Error(`Payment exceeds remaining balance of Rs. ${outstanding.toLocaleString()}`);
    }

    const nextPaid = Number(target.amount_paid) + amount;
    const nextOutstanding = Math.max(0, Number(target.grand_total) - nextPaid);
    const nextStatus = paymentStatusFor(nextPaid, Number(target.grand_total));
    const paymentNumber = makePaymentNumber();

    const [result] = await connection.execute(
      `INSERT INTO payments (
         payment_number, customer_id, order_id, invoice_id, amount, payment_method,
         received_by, reference_number, note
       )
       VALUES (
         :paymentNumber, :customerId, :orderId, :invoiceId, :amount, :paymentMethod,
         :receivedBy, :referenceNumber, :note
       )`,
      {
        paymentNumber,
        customerId: target.customer_id,
        orderId: target.order_id,
        invoiceId: target.invoice_id,
        amount,
        paymentMethod: input.paymentMethod,
        receivedBy: requester.id,
        referenceNumber: input.referenceNumber ?? null,
        note: input.note ?? null
      }
    );
    const paymentId = Number((result as { insertId: number }).insertId);

    await connection.execute(
      `UPDATE invoices
       SET amount_paid = :nextPaid, outstanding_amount = :nextOutstanding, payment_status = :nextStatus
       WHERE id = :invoiceId`,
      { nextPaid, nextOutstanding, nextStatus, invoiceId: target.invoice_id }
    );
    await connection.execute(
      `UPDATE orders
       SET amount_paid = :nextPaid, outstanding_amount = :nextOutstanding, payment_status = :nextStatus
       WHERE id = :orderId`,
      { nextPaid, nextOutstanding, nextStatus, orderId: target.order_id }
    );

    await appendLedgerEntry(connection, {
      customerId: target.customer_id,
      reference: paymentNumber,
      referenceId: paymentId,
      type: 'PAYMENT',
      credit: amount,
      note: input.note ?? 'Payment received'
    });

    await connection.commit();
    return paymentId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listInvoices(params: {
  page: number;
  pageSize: number;
  search: string;
  requester: { id: number; role: RoleName };
}) {
  const filters = ['(:search = \'\' OR i.invoice_number LIKE :term OR o.order_number LIKE :term OR c.business_name LIKE :term)'];
  const values: Record<string, string | number> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };

  if (params.requester.role === 'CUSTOMER') {
    filters.push('c.user_id = :userId');
    values.userId = params.requester.id;
  }
  if (params.requester.role === 'SALES_REP') {
    filters.push('i.customer_id IN (SELECT c2.id FROM customers c2 INNER JOIN sales_reps sr ON sr.id = c2.assigned_sales_rep_id WHERE sr.user_id = :userId)');
    values.userId = params.requester.id;
  }

  const where = filters.join(' AND ');
  const [rows] = await pool.query<InvoiceRow[]>(
    `SELECT
       i.*, o.order_number, c.business_name AS customer_name, c.phone
     FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id
     INNER JOIN customers c ON c.id = i.customer_id
     WHERE ${where}
     ORDER BY i.invoice_date DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id
     INNER JOIN customers c ON c.id = i.customer_id
     WHERE ${where}`,
    values
  );

  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function listPayments(params: {
  page: number;
  pageSize: number;
  search: string;
  requester: { id: number; role: RoleName };
}) {
  const filters = ['(:search = \'\' OR p.payment_number LIKE :term OR i.invoice_number LIKE :term OR o.order_number LIKE :term OR c.business_name LIKE :term)'];
  const values: Record<string, string | number> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };

  if (params.requester.role === 'CUSTOMER') {
    filters.push('c.user_id = :userId');
    values.userId = params.requester.id;
  }
  if (params.requester.role === 'SALES_REP') {
    filters.push('p.customer_id IN (SELECT c2.id FROM customers c2 INNER JOIN sales_reps sr ON sr.id = c2.assigned_sales_rep_id WHERE sr.user_id = :userId)');
    values.userId = params.requester.id;
  }

  const where = filters.join(' AND ');
  const [rows] = await pool.query<PaymentRow[]>(
    `SELECT
       p.*, c.business_name AS customer_name, o.order_number, i.invoice_number, u.name AS received_by_name
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     INNER JOIN orders o ON o.id = p.order_id
     INNER JOIN invoices i ON i.id = p.invoice_id
     INNER JOIN users u ON u.id = p.received_by
     WHERE ${where}
     ORDER BY p.payment_date DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     INNER JOIN orders o ON o.id = p.order_id
     INNER JOIN invoices i ON i.id = p.invoice_id
     WHERE ${where}`,
    values
  );

  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function listCustomerLedger(params: {
  customerId?: number;
  requester: { id: number; role: RoleName };
}) {
  const filters: string[] = [];
  const values: Record<string, number> = {};

  if (params.requester.role === 'CUSTOMER') {
    filters.push('c.user_id = :userId');
    values.userId = params.requester.id;
  } else if (params.customerId) {
    filters.push('l.customer_id = :customerId');
    values.customerId = params.customerId;
  }

  if (params.requester.role === 'SALES_REP') {
    filters.push('c.assigned_sales_rep_id IN (SELECT id FROM sales_reps WHERE user_id = :userId)');
    values.userId = params.requester.id;
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.execute<LedgerRow[]>(
    `SELECT l.*
     FROM customer_ledger l
     INNER JOIN customers c ON c.id = l.customer_id
     ${where}
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT 100`,
    values
  );

  return { data: rows };
}
