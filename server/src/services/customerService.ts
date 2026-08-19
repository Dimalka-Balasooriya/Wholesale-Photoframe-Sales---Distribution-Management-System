import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';
import type { RoleName } from '../types/auth.js';
import { getOffset, toPagination } from '../utils/pagination.js';

export type CustomerType =
  | 'CASH_CUSTOMER'
  | 'CREDIT_CUSTOMER'
  | 'WHOLESALE_CUSTOMER'
  | 'VIP_CUSTOMER';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

interface CountRow extends RowDataPacket {
  total: number;
}

interface SalesRepIdRow extends RowDataPacket {
  id: number;
}

export interface CustomerRow extends RowDataPacket {
  id: number;
  user_id: number | null;
  assigned_sales_rep_id: number | null;
  assigned_sales_rep_name: string | null;
  business_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  customer_type: CustomerType;
  credit_limit: string;
  outstanding_balance: string;
  status: CustomerStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerInput {
  businessName: string;
  ownerName: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  customerType: CustomerType;
  creditLimit: number;
  assignedSalesRepId?: number | null;
  status?: CustomerStatus;
  notes?: string | null;
}

async function getSalesRepIdForUser(userId: number) {
  const [rows] = await pool.execute<SalesRepIdRow[]>(
    'SELECT id FROM sales_reps WHERE user_id = :userId LIMIT 1',
    { userId }
  );
  return rows[0]?.id ?? null;
}

export async function listCustomers(params: {
  page: number;
  pageSize: number;
  search: string;
  requesterId: number;
  requesterRole: RoleName;
}) {
  const filters = [
    `(:search = '' OR c.business_name LIKE :term OR c.owner_name LIKE :term OR c.phone LIKE :term OR c.city LIKE :term OR c.district LIKE :term)`
  ];
  const values: Record<string, string | number | boolean | null> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };

  if (params.requesterRole === 'SALES_REP') {
    const salesRepId = await getSalesRepIdForUser(params.requesterId);
    filters.push('c.assigned_sales_rep_id = :salesRepId');
    values.salesRepId = salesRepId ?? 0;
  }

  if (params.requesterRole === 'CUSTOMER') {
    filters.push('c.user_id = :customerUserId');
    values.customerUserId = params.requesterId;
  }

  const where = filters.join(' AND ');
  const [rows] = await pool.query<CustomerRow[]>(
    `SELECT
       c.*, rep_user.name AS assigned_sales_rep_name
     FROM customers c
     LEFT JOIN sales_reps sr ON sr.id = c.assigned_sales_rep_id
     LEFT JOIN users rep_user ON rep_user.id = sr.user_id
     WHERE ${where}
     ORDER BY c.updated_at DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM customers c WHERE ${where}`,
    values
  );

  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function createCustomer(input: CustomerInput, requester: { id: number; role: RoleName }) {
  const assignedSalesRepId =
    requester.role === 'SALES_REP'
      ? await getSalesRepIdForUser(requester.id)
      : input.assignedSalesRepId ?? null;

  await pool.execute(
    `INSERT INTO customers (
       assigned_sales_rep_id, business_name, owner_name, phone, whatsapp, email,
       address, city, district, province, customer_type, credit_limit, status, notes
     )
     VALUES (
       :assignedSalesRepId, :businessName, :ownerName, :phone, :whatsapp, :email,
       :address, :city, :district, :province, :customerType, :creditLimit, :status, :notes
     )`,
    {
      assignedSalesRepId,
      businessName: input.businessName,
      ownerName: input.ownerName,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      province: input.province ?? null,
      customerType: input.customerType,
      creditLimit: input.creditLimit,
      status: input.status ?? 'ACTIVE',
      notes: input.notes ?? null
    }
  );
}

export async function updateCustomer(id: number, input: CustomerInput) {
  await pool.execute(
    `UPDATE customers
     SET assigned_sales_rep_id = :assignedSalesRepId,
         business_name = :businessName,
         owner_name = :ownerName,
         phone = :phone,
         whatsapp = :whatsapp,
         email = :email,
         address = :address,
         city = :city,
         district = :district,
         province = :province,
         customer_type = :customerType,
         credit_limit = :creditLimit,
         status = :status,
         notes = :notes
     WHERE id = :id`,
    {
      id,
      assignedSalesRepId: input.assignedSalesRepId ?? null,
      businessName: input.businessName,
      ownerName: input.ownerName,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      province: input.province ?? null,
      customerType: input.customerType,
      creditLimit: input.creditLimit,
      status: input.status ?? 'ACTIVE',
      notes: input.notes ?? null
    }
  );
}
