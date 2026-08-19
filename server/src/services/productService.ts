import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';
import { getOffset, toPagination } from '../utils/pagination.js';

export type ProductStatus = 'ACTIVE' | 'INACTIVE';
export type StockTransactionType =
  | 'STOCK_IN'
  | 'ORDER_RESERVED'
  | 'ORDER_SOLD'
  | 'RETURNED'
  | 'MANUAL_ADJUSTMENT'
  | 'DAMAGED'
  | 'CANCELLED_ORDER_RESTOCK';

interface CountRow extends RowDataPacket {
  total: number;
}

export interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  status: ProductStatus;
  variant_count: number;
  total_stock: number;
  low_stock_variants: number;
  created_at: Date;
  updated_at: Date;
}

export interface VariantRow extends RowDataPacket {
  id: number;
  product_id: number;
  product_name: string;
  category: string;
  size: string;
  sku: string;
  cost_price: string;
  wholesale_price: string;
  minimum_wholesale_quantity: number;
  current_stock_quantity: number;
  low_stock_level: number;
  status: ProductStatus;
}

export interface StockTransactionRow extends RowDataPacket {
  id: number;
  product_name: string;
  size: string;
  sku: string;
  previous_quantity: number;
  quantity_changed: number;
  new_quantity: number;
  transaction_type: StockTransactionType;
  changed_by_name: string;
  note: string | null;
  created_at: Date;
}

export interface ProductInput {
  name: string;
  category: string;
  description?: string | null;
  imageUrl?: string | null;
  status?: ProductStatus;
}

export interface VariantInput {
  productId: number;
  size: string;
  sku: string;
  costPrice: number;
  wholesalePrice: number;
  minimumWholesaleQuantity: number;
  lowStockLevel: number;
  status?: ProductStatus;
}

export async function listProducts(params: {
  page: number;
  pageSize: number;
  search: string;
  status?: ProductStatus;
}) {
  const filters = ['(:search = \'\' OR p.name LIKE :term OR p.category LIKE :term)'];
  const values: Record<string, string | number | boolean | null> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };

  if (params.status) {
    filters.push('p.status = :status');
    values.status = params.status;
  }

  const where = filters.join(' AND ');
  const [rows] = await pool.query<ProductRow[]>(
    `SELECT
       p.id, p.name, p.category, p.description, p.image_url, p.status, p.created_at, p.updated_at,
       COUNT(v.id) AS variant_count,
       COALESCE(SUM(v.current_stock_quantity), 0) AS total_stock,
       COALESCE(SUM(CASE WHEN v.current_stock_quantity <= v.low_stock_level THEN 1 ELSE 0 END), 0) AS low_stock_variants
     FROM products p
     LEFT JOIN product_variants v ON v.product_id = p.id
     WHERE ${where}
     GROUP BY p.id
     ORDER BY p.updated_at DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM products p WHERE ${where}`,
    values
  );

  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function createProduct(input: ProductInput, createdBy: number) {
  const [result] = await pool.execute(
    `INSERT INTO products (name, category, description, image_url, status, created_by)
     VALUES (:name, :category, :description, :imageUrl, :status, :createdBy)`,
    {
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      status: input.status ?? 'ACTIVE',
      createdBy
    }
  );
  return result;
}

export async function updateProduct(id: number, input: ProductInput) {
  await pool.execute(
    `UPDATE products
     SET name = :name, category = :category, description = :description, image_url = :imageUrl, status = :status
     WHERE id = :id`,
    {
      id,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      status: input.status ?? 'ACTIVE'
    }
  );
}

export async function listVariants(params: {
  page: number;
  pageSize: number;
  search: string;
  lowStockOnly?: boolean;
}) {
  const filters = ['(:search = \'\' OR p.name LIKE :term OR v.sku LIKE :term OR v.size LIKE :term)'];
  const values: Record<string, string | number | boolean | null> = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };

  if (params.lowStockOnly) {
    filters.push('v.current_stock_quantity <= v.low_stock_level');
  }

  const where = filters.join(' AND ');
  const [rows] = await pool.query<VariantRow[]>(
    `SELECT
       v.id, v.product_id, p.name AS product_name, p.category, v.size, v.sku, v.cost_price,
       v.wholesale_price, v.minimum_wholesale_quantity, v.current_stock_quantity,
       v.low_stock_level, v.status
     FROM product_variants v
     INNER JOIN products p ON p.id = v.product_id
     WHERE ${where}
     ORDER BY p.name ASC, v.size ASC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM product_variants v
     INNER JOIN products p ON p.id = v.product_id
     WHERE ${where}`,
    values
  );

  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}

export async function createVariant(input: VariantInput) {
  await pool.execute(
    `INSERT INTO product_variants (
       product_id, size, sku, cost_price, wholesale_price,
       minimum_wholesale_quantity, low_stock_level, status
     )
     VALUES (
       :productId, :size, :sku, :costPrice, :wholesalePrice,
       :minimumWholesaleQuantity, :lowStockLevel, :status
     )`,
    {
      ...input,
      status: input.status ?? 'ACTIVE'
    }
  );
}

export async function adjustStock(params: {
  variantId: number;
  quantityChanged: number;
  transactionType: StockTransactionType;
  changedBy: number;
  note?: string | null;
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [variantRows] = await connection.execute<VariantRow[]>(
      `SELECT v.*, p.name AS product_name, p.category
       FROM product_variants v
       INNER JOIN products p ON p.id = v.product_id
       WHERE v.id = :variantId
       FOR UPDATE`,
      { variantId: params.variantId }
    );

    const variant = variantRows[0];
    if (!variant) {
      throw new Error('Product variant not found');
    }

    const previousQuantity = variant.current_stock_quantity;
    const newQuantity = previousQuantity + params.quantityChanged;
    if (newQuantity < 0) {
      throw new Error('Stock cannot go below zero');
    }

    await connection.execute(
      `UPDATE product_variants
       SET current_stock_quantity = :newQuantity
       WHERE id = :variantId`,
      { newQuantity, variantId: params.variantId }
    );

    await connection.execute(
      `INSERT INTO stock_transactions (
         product_id, variant_id, previous_quantity, quantity_changed, new_quantity,
         transaction_type, changed_by, note
       )
       VALUES (
         :productId, :variantId, :previousQuantity, :quantityChanged, :newQuantity,
         :transactionType, :changedBy, :note
       )`,
      {
        productId: variant.product_id,
        variantId: params.variantId,
        previousQuantity,
        quantityChanged: params.quantityChanged,
        newQuantity,
        transactionType: params.transactionType,
        changedBy: params.changedBy,
        note: params.note ?? null
      }
    );

    await connection.commit();
    return { previousQuantity, quantityChanged: params.quantityChanged, newQuantity };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listStockTransactions(params: {
  page: number;
  pageSize: number;
  search: string;
}) {
  const values = {
    search: params.search,
    term: `%${params.search}%`,
    limit: params.pageSize,
    offset: getOffset(params.page, params.pageSize)
  };
  const where = ':search = \'\' OR p.name LIKE :term OR v.sku LIKE :term OR st.transaction_type LIKE :term';

  const [rows] = await pool.query<StockTransactionRow[]>(
    `SELECT
       st.id, p.name AS product_name, v.size, v.sku, st.previous_quantity,
       st.quantity_changed, st.new_quantity, st.transaction_type,
       u.name AS changed_by_name, st.note, st.created_at
     FROM stock_transactions st
     INNER JOIN products p ON p.id = st.product_id
     INNER JOIN product_variants v ON v.id = st.variant_id
     INNER JOIN users u ON u.id = st.changed_by
     WHERE ${where}
     ORDER BY st.created_at DESC
     LIMIT :limit OFFSET :offset`,
    values
  );
  const [countRows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM stock_transactions st
     INNER JOIN products p ON p.id = st.product_id
     INNER JOIN product_variants v ON v.id = st.variant_id
     WHERE ${where}`,
    values
  );

  return { data: rows, pagination: toPagination(params.page, params.pageSize, countRows[0].total) };
}
