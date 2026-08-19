import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { assignDelivery } from '../services/deliveryService.js';
import { createInvoiceForOrder, createPayment } from '../services/financeService.js';
import { ensurePhase6Seed } from '../services/phase6Service.js';
import { ensurePhase7Seed } from '../services/phase7Service.js';
import { hashPassword } from '../utils/password.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedPassword = 'Password123!';

interface IdRow extends RowDataPacket {
  id: number;
}

async function getRoleId(name: string) {
  const [rows] = await pool.execute<IdRow[]>(
    'SELECT id FROM roles WHERE name = :name LIMIT 1',
    { name }
  );

  const role = rows[0];
  if (!role) {
    throw new Error(`Role ${name} was not created`);
  }

  return role.id;
}

async function upsertUser(roleId: number, name: string, email: string, passwordHash: string) {
  await pool.execute(
    `INSERT INTO users (role_id, name, email, password_hash, status)
     VALUES (:roleId, :name, :email, :passwordHash, 'ACTIVE')
     ON DUPLICATE KEY UPDATE
       role_id = VALUES(role_id),
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       status = 'ACTIVE'`,
    { roleId, name, email, passwordHash }
  );

  const [rows] = await pool.execute<IdRow[]>(
    'SELECT id FROM users WHERE email = :email LIMIT 1',
    { email }
  );

  return rows[0].id;
}

async function upsertProduct(input: {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  createdBy: number;
}) {
  const [existingRows] = await pool.execute<IdRow[]>(
    `SELECT p.id
     FROM products p
     LEFT JOIN product_variants v ON v.product_id = p.id
     WHERE p.name = :name
     GROUP BY p.id
     ORDER BY COUNT(v.id) DESC, p.id ASC
     LIMIT 1`,
    { name: input.name }
  );

  const existing = existingRows[0];

  if (existing) {
    await pool.execute(
      `UPDATE products
       SET category = :category,
           description = :description,
           image_url = :imageUrl,
           status = 'ACTIVE',
           created_by = :createdBy
       WHERE id = :id`,
      { ...input, id: existing.id }
    );

    return existing.id;
  }

  await pool.execute(
    `INSERT INTO products (name, category, description, image_url, status, created_by)
     VALUES (:name, :category, :description, :imageUrl, 'ACTIVE', :createdBy)`,
    input
  );

  const [rows] = await pool.execute<IdRow[]>(
    'SELECT id FROM products WHERE name = :name ORDER BY id DESC LIMIT 1',
    { name: input.name }
  );

  return rows[0].id;
}

async function upsertVariant(input: {
  productId: number;
  size: string;
  sku: string;
  costPrice: number;
  wholesalePrice: number;
  minimumWholesaleQuantity: number;
  stock: number;
  lowStockLevel: number;
}) {
  await pool.execute(
    `INSERT INTO product_variants (
       product_id, size, sku, cost_price, wholesale_price,
       minimum_wholesale_quantity, current_stock_quantity, low_stock_level, status
     )
     VALUES (
       :productId, :size, :sku, :costPrice, :wholesalePrice,
       :minimumWholesaleQuantity, :stock, :lowStockLevel, 'ACTIVE'
     )
     ON DUPLICATE KEY UPDATE
       product_id = VALUES(product_id),
       size = VALUES(size),
       cost_price = VALUES(cost_price),
       wholesale_price = VALUES(wholesale_price),
       minimum_wholesale_quantity = VALUES(minimum_wholesale_quantity),
       low_stock_level = VALUES(low_stock_level),
       status = 'ACTIVE'`,
    input
  );

  const [rows] = await pool.execute<IdRow[]>(
    'SELECT id FROM product_variants WHERE sku = :sku LIMIT 1',
    { sku: input.sku }
  );

  return rows[0].id;
}

async function seedOpeningStock(input: {
  productId: number;
  variantId: number;
  stock: number;
  changedBy: number;
  note: string;
}) {
  const [rows] = await pool.execute<IdRow[]>(
    `SELECT id FROM stock_transactions
     WHERE variant_id = :variantId AND transaction_type = 'STOCK_IN' AND note = :note
     LIMIT 1`,
    { variantId: input.variantId, note: input.note }
  );

  if (rows.length > 0) return;

  await pool.execute(
    `INSERT INTO stock_transactions (
       product_id, variant_id, previous_quantity, quantity_changed, new_quantity,
       transaction_type, changed_by, note
     )
     VALUES (
       :productId, :variantId, 0, :stock, :stock,
       'STOCK_IN', :changedBy, :note
     )`,
    input
  );
}

async function cleanupDuplicateSeedProducts(productNames: string[]) {
  if (productNames.length === 0) return;

  const placeholders = productNames.map((_, index) => `:name${index}`).join(', ');
  const params = Object.fromEntries(productNames.map((name, index) => [`name${index}`, name]));

  await pool.execute(
    `DELETE p
     FROM products p
     LEFT JOIN product_variants v ON v.product_id = p.id
     WHERE p.name IN (${placeholders})
       AND v.id IS NULL
       AND p.id NOT IN (
         SELECT keep_id
         FROM (
           SELECT MIN(p2.id) AS keep_id
           FROM products p2
           WHERE p2.name IN (${placeholders})
           GROUP BY p2.name
         ) kept_products
       )`,
    params
  );
}

async function ensureColumn(tableName: string, columnName: string, definition: string) {
  const [rows] = await pool.execute<Array<RowDataPacket & { total: number }>>(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :schemaName AND TABLE_NAME = :tableName AND COLUMN_NAME = :columnName`,
    { schemaName: env.DB_NAME, tableName, columnName }
  );

  if (rows[0].total === 0) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  }
}

async function main() {
  const bootstrapConnection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD
  });

  await bootstrapConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrapConnection.end();

  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  const connection = await pool.getConnection();

  try {
    for (const statement of schema
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean)) {
      await connection.query(statement);
    }

    await ensureColumn(
      'orders',
      'credit_approval_required',
      'credit_approval_required TINYINT(1) NOT NULL DEFAULT 0 AFTER payment_status'
    );

    await connection.execute(
      `INSERT INTO roles (name, description)
       VALUES
         ('ADMIN', 'Full system administration access'),
         ('SALES_REP', 'Sales representative customer and order access'),
         ('DRIVER', 'Assigned delivery and cash collection access'),
         ('CUSTOMER', 'Customer portal access')
       ON DUPLICATE KEY UPDATE description = VALUES(description)`
    );

    const passwordHash = await hashPassword(seedPassword);
    const adminRoleId = await getRoleId('ADMIN');
    const salesRoleId = await getRoleId('SALES_REP');
    const driverRoleId = await getRoleId('DRIVER');
    const customerRoleId = await getRoleId('CUSTOMER');

    const adminUserId = await upsertUser(adminRoleId, 'Development Admin', 'admin@example.com', passwordHash);
    const salesUserId = await upsertUser(
      salesRoleId,
      'Development Sales Rep',
      'sales@example.com',
      passwordHash
    );
    const driverUserId = await upsertUser(
      driverRoleId,
      'Development Driver',
      'driver@example.com',
      passwordHash
    );
    const customerUserId = await upsertUser(
      customerRoleId,
      'Development Customer',
      'customer@example.com',
      passwordHash
    );

    await connection.execute(
      `INSERT INTO sales_reps (user_id, max_discount_percent, commission_percent, status)
       VALUES (:userId, 5.00, 2.00, 'ACTIVE')
       ON DUPLICATE KEY UPDATE max_discount_percent = VALUES(max_discount_percent), status = 'ACTIVE'`,
      { userId: salesUserId }
    );

    await connection.execute(
      `INSERT INTO drivers (user_id, vehicle_number, vehicle_type, status)
       VALUES (:userId, 'DEV-0001', 'Van', 'ACTIVE')
       ON DUPLICATE KEY UPDATE vehicle_number = VALUES(vehicle_number), vehicle_type = VALUES(vehicle_type), status = 'ACTIVE'`,
      { userId: driverUserId }
    );

    const [salesRepRows] = await connection.execute<IdRow[]>(
      'SELECT id FROM sales_reps WHERE user_id = :userId LIMIT 1',
      { userId: salesUserId }
    );

    await connection.execute(
      `INSERT INTO customers (
        user_id, assigned_sales_rep_id, business_name, owner_name, phone, whatsapp, email,
        address, city, district, province, customer_type, credit_limit, status
      )
       VALUES (
        :customerUserId, :salesRepId, 'Development Frame Shop', 'Development Customer',
        '+94000000000', '+94000000000', 'customer@example.com',
        'Sample business address', 'Kurunegala', 'Kurunegala', 'North Western',
        'WHOLESALE_CUSTOMER', 100000.00, 'ACTIVE'
      )
       ON DUPLICATE KEY UPDATE
        assigned_sales_rep_id = VALUES(assigned_sales_rep_id),
        business_name = VALUES(business_name),
        owner_name = VALUES(owner_name),
        status = 'ACTIVE'`,
      { customerUserId, salesRepId: salesRepRows[0].id }
    );

    const productSeeds = [
      {
        name: 'Borderless Black Frame',
        category: 'Borderless',
        description: 'Clean black borderless wholesale frame for studio and gift shop orders.',
        imageUrl:
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=80',
        variants: [
          ['4x6', 'BLK-46', 120, 220, 12, 140, 20],
          ['5x7', 'BLK-57', 145, 260, 12, 120, 20],
          ['8x12', 'BLK-812', 230, 380, 6, 100, 15],
          ['12x18', 'BLK-1218', 460, 780, 4, 36, 10]
        ]
      },
      {
        name: 'Classic Gold Frame',
        category: 'Classic',
        description: 'Premium gold frame with a polished finish for portrait and event orders.',
        imageUrl:
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
        variants: [
          ['4x6', 'GLD-46', 155, 290, 12, 70, 15],
          ['8x10', 'GLD-810', 280, 480, 6, 54, 12],
          ['10x15', 'GLD-1015', 430, 720, 4, 24, 8]
        ]
      },
      {
        name: 'Modern White Frame',
        category: 'Modern',
        description: 'Matte white frame suited for wedding, family, and gallery print packages.',
        imageUrl:
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=80',
        variants: [
          ['5x7', 'WHT-57', 150, 275, 12, 95, 20],
          ['8x12', 'WHT-812', 245, 410, 6, 12, 15],
          ['16x24', 'WHT-1624', 760, 1250, 2, 8, 8]
        ]
      }
    ] as const;

    await cleanupDuplicateSeedProducts(productSeeds.map((product) => product.name));

    for (const product of productSeeds) {
      const productId = await upsertProduct({
        name: product.name,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl,
        createdBy: adminUserId
      });

      for (const [
        size,
        sku,
        costPrice,
        wholesalePrice,
        minimumWholesaleQuantity,
        stock,
        lowStockLevel
      ] of product.variants) {
        const variantId = await upsertVariant({
          productId,
          size,
          sku,
          costPrice,
          wholesalePrice,
          minimumWholesaleQuantity,
          stock,
          lowStockLevel
        });
        await seedOpeningStock({
          productId,
          variantId,
          stock,
          changedBy: adminUserId,
          note: 'Development opening stock'
        });
      }
    }

    const [existingOrderRows] = await pool.execute<IdRow[]>(
      'SELECT id FROM orders WHERE notes = :notes LIMIT 1',
      { notes: 'Development sample order' }
    );

    if (existingOrderRows.length === 0) {
      const [customerRows] = await pool.execute<IdRow[]>(
        'SELECT id FROM customers WHERE email = :email LIMIT 1',
        { email: 'customer@example.com' }
      );
      const [variantRows] = await pool.execute<
        Array<IdRow & { product_id: number; product_name: string; size: string; wholesale_price: string }>
      >(
        `SELECT v.id, v.product_id, p.name AS product_name, v.size, v.wholesale_price
         FROM product_variants v
         INNER JOIN products p ON p.id = v.product_id
         WHERE v.sku = :sku
         LIMIT 1`,
        { sku: 'BLK-812' }
      );

      const customerId = customerRows[0]?.id;
      const variant = variantRows[0];

      if (customerId && variant) {
        const subtotal = Number(variant.wholesale_price) * 2;
        const deliveryCharge = 500;
        const grandTotal = subtotal + deliveryCharge;
        await pool.execute(
          `INSERT INTO orders (
             order_number, customer_id, sales_rep_id, created_by_user_id, order_source,
             subtotal, discount_percentage, discount_amount, delivery_charge, grand_total,
             outstanding_amount, payment_method, order_status, notes
           )
           VALUES (
             :orderNumber, :customerId, :salesRepId, :createdBy, 'CUSTOMER_PORTAL',
             :subtotal, 0, 0, :deliveryCharge, :grandTotal,
             :grandTotal, 'CREDIT', 'PENDING', :notes
           )`,
          {
            orderNumber: `ORD-SEED-${Date.now().toString(36).toUpperCase()}`,
            customerId,
            salesRepId: salesRepRows[0].id,
            createdBy: customerUserId,
            subtotal,
            deliveryCharge,
            grandTotal,
            notes: 'Development sample order'
          }
        );
        const [orderRows] = await pool.execute<IdRow[]>(
          'SELECT id FROM orders WHERE notes = :notes ORDER BY id DESC LIMIT 1',
          { notes: 'Development sample order' }
        );
        const orderId = orderRows[0].id;
        await pool.execute(
          `INSERT INTO order_items (
             order_id, product_id, variant_id, product_name_snapshot, variant_size_snapshot,
             quantity, unit_price, discount, line_total
           )
           VALUES (
             :orderId, :productId, :variantId, :productName, :variantSize,
             2, :unitPrice, 0, :lineTotal
           )`,
          {
            orderId,
            productId: variant.product_id,
            variantId: variant.id,
            productName: variant.product_name,
            variantSize: variant.size,
            unitPrice: Number(variant.wholesale_price),
            lineTotal: subtotal
          }
        );
        await pool.execute(
          `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, note)
           VALUES (:orderId, NULL, 'PENDING', :changedBy, 'Development sample order created')`,
          { orderId, changedBy: customerUserId }
        );
      }
    }

    const [uninvoicedOrders] = await pool.execute<IdRow[]>(
      `SELECT o.id
       FROM orders o
       LEFT JOIN invoices i ON i.order_id = o.id
       WHERE i.id IS NULL
       ORDER BY o.id ASC`
    );

    for (const order of uninvoicedOrders) {
      await createInvoiceForOrder(connection, order.id);
    }

    const [invoiceRows] = await pool.execute<IdRow[]>(
      `SELECT i.id
       FROM invoices i
       LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE p.id IS NULL
       ORDER BY i.id ASC
       LIMIT 1`
    );

    if (invoiceRows[0]) {
      await createPayment(
        {
          invoiceId: invoiceRows[0].id,
          amount: 500,
          paymentMethod: 'CASH',
          referenceNumber: 'DEV-CASH-001',
          note: 'Development sample payment'
        },
        { id: adminUserId, role: 'ADMIN' }
      );
    }

    const [deliverySeedRows] = await pool.execute<IdRow[]>(
      `SELECT o.id
       FROM orders o
       LEFT JOIN deliveries d ON d.order_id = o.id
       WHERE o.notes = :notes AND d.id IS NULL
       ORDER BY o.id ASC
       LIMIT 1`,
      { notes: 'Development sample order' }
    );
    const [driverRows] = await pool.execute<IdRow[]>(
      'SELECT id FROM drivers WHERE user_id = :userId LIMIT 1',
      { userId: driverUserId }
    );

    if (deliverySeedRows[0] && driverRows[0]) {
      const orderId = deliverySeedRows[0].id;
      await pool.execute(
        `UPDATE orders
         SET order_status = 'READY_FOR_DELIVERY'
         WHERE id = :orderId AND order_status IN ('PENDING', 'APPROVED', 'PREPARING')`,
        { orderId }
      );
      await pool.execute(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, note)
         SELECT :orderId, 'PENDING', 'READY_FOR_DELIVERY', :changedBy, 'Development sample order ready for delivery'
         WHERE NOT EXISTS (
           SELECT 1 FROM order_status_history
           WHERE order_id = :orderId AND new_status = 'READY_FOR_DELIVERY'
         )`,
        { orderId, changedBy: adminUserId }
      );
      await assignDelivery({
        orderId,
        driverId: driverRows[0].id,
        assignedBy: adminUserId,
        notes: 'Development sample delivery assignment'
      });
    }

    await ensurePhase6Seed(adminUserId, salesRepRows[0].id);
    await ensurePhase7Seed(adminUserId, salesUserId, driverUserId, customerUserId);

    console.log('Database schema and Phase 7 seed data applied.');
    console.log('Development password for all seed users:', seedPassword);
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
