# Wholesale Photoframe Sales & Distribution Management System

Phase 1 implements the project foundation: React/Vite frontend, Express/TypeScript backend, MySQL connection, initial schema, JWT authentication, role-based authorization, protected frontend routes, and base dashboards for all four roles.

Phase 2 adds product, variant, inventory, stock transaction, and customer management.

Phase 3 adds order creation, carts, order management, item snapshots, and status history.

Phase 4 adds invoicing, payment entry, customer ledger history, outstanding balances, and credit-limit approval flags.

Phase 5 adds driver delivery assignment, driver-scoped delivery lists, mobile delivery actions, delivery completion, and driver cash collection.

Phase 6 adds sales representative targets, earned commissions, and returns management with restock decisions.

Phase 7 adds admin reports, role-scoped notifications, and audit logs for sensitive operational changes.

## Architecture

- `client/`: React + Vite + TypeScript app styled with Tailwind CSS.
- `server/`: Node.js + Express + TypeScript REST API.
- `server/src/config`: environment and database configuration.
- `server/src/controllers`: request handlers.
- `server/src/middleware`: JWT authentication, role authorization, and error handling.
- `server/src/routes`: API route modules.
- `server/src/services`: business logic and database access.
- `server/src/db`: SQL schema and seed scripts.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create backend environment file:

```bash
cp server/.env.example server/.env
```

3. Update `server/.env` with your MySQL credentials and a strong `JWT_SECRET`.

4. Create the database in MySQL:

```sql
CREATE DATABASE photoframe_wholesale CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. Apply the schema:

```bash
npm run seed --workspace server
```

6. Start both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend API: `http://localhost:4000/api`

## Development Seed Credentials

These accounts are for local development only. Change all passwords before using real data.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `Password123!` |
| Sales Representative | `sales@example.com` | `Password123!` |
| Driver | `driver@example.com` | `Password123!` |
| Customer | `customer@example.com` | `Password123!` |

## Phase 1 Features

- Shared login page for all roles.
- Backend JWT login endpoint at `POST /api/auth/login`.
- Authenticated user endpoint at `GET /api/auth/me`.
- Backend role authorization middleware.
- Frontend protected routes and role-based dashboard redirects.
- Base dashboard layouts for Admin, Sales Rep, Driver, and Customer.
- Initial MySQL schema for roles, users, and role profile records.

## Phase 2 Features

- Admin product management at `/admin/products`.
- Admin inventory management at `/admin/inventory`.
- Admin customer management at `/admin/customers`.
- Sales representative assigned-customer view and new customer registration at `/sales/customers`.
- Customer read-only product catalog at `/customer/shop`.
- Product and variant tables with price, SKU, minimum wholesale quantity, current stock, low stock level, and status.
- Stock adjustments that always create a `stock_transactions` record.
- Customer profiles with contact, address, type, credit limit, assigned sales representative, and status.

## Phase 2 API Endpoints

- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `GET /api/products/variants/list`
- `POST /api/products/variants`
- `POST /api/products/stock-adjustments`
- `GET /api/products/stock-transactions`
- `GET /api/customers`
- `POST /api/customers`
- `PUT /api/customers/:id`

## Phase 3 Features

- Customer cart and checkout at `/customer/cart`.
- Customer order history at `/customer/orders`.
- Sales representative product-to-cart order builder at `/sales/new-order`.
- Sales representative checkout at `/sales/cart`.
- Sales representative order history at `/sales/orders`.
- Admin order management at `/admin/orders`.
- Order item snapshots for product name, size, and unit price.
- Visual order timeline backed by `order_status_history`.
- Admin-only status transitions with invalid transition protection.
- Sales representative over-limit discounts create `DISCOUNT_APPROVAL_REQUIRED` orders.

## Phase 3 API Endpoints

- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/status`

## Phase 4 Features

- Automatic invoice generation when orders are created.
- Admin payment management at `/admin/payments`.
- Sales representative payment management at `/sales/payments`.
- Customer invoice and ledger view at `/customer/invoices`.
- Payment records update invoice and order paid/outstanding balances.
- Customer ledger entries track debit invoices, credit payments, and running balance.
- Overpayment protection, with admin-only explicit overpayment allowance.
- Credit orders that exceed the customer's available credit are flagged for admin approval.

## Phase 4 API Endpoints

- `GET /api/finance/invoices`
- `GET /api/finance/payments`
- `POST /api/finance/payments`
- `GET /api/finance/ledger`

## Phase 5 Features

- Admin delivery management at `/admin/deliveries`.
- Admin driver assignment from the order detail panel.
- Active driver lookup for delivery assignment.
- Driver dashboard at `/driver/dashboard` with assigned delivery cards.
- Driver-only delivery access so drivers see only their assigned deliveries.
- Start delivery action moves delivery and order status to out for delivery.
- Delivery completion captures result, notes, optional payment method, amount, and reference number.
- Driver-collected payments are recorded against the invoice and update financial balances.
- Delivery status history records assignment, start, and completion changes.

## Phase 5 API Endpoints

- `GET /api/deliveries/drivers`
- `GET /api/deliveries`
- `GET /api/deliveries/:id`
- `POST /api/deliveries/assign`
- `PATCH /api/deliveries/:id/start`
- `PATCH /api/deliveries/:id/complete`

## Phase 6 Features

- Admin monthly sales target management at `/admin/targets`.
- Sales representative commission and target progress at `/sales/performance`.
- Sales dashboard cards now show monthly sales, target, progress, and earned commission.
- Commission records are generated from completed orders using the sales representative commission percentage.
- Commission status supports `PENDING`, `EARNED`, `PAID`, and `CANCELLED`.
- Returns management at `/admin/returns` and `/sales/returns`.
- Return requests capture order, returned item, quantity, reason, restock decision, notes, and refund amount.
- Admin can approve, reject, receive, or complete returns.
- Completed returns can restock reusable products and cancel unpaid commissions for returned orders.

## Phase 6 API Endpoints

- `GET /api/performance/sales-reps`
- `GET /api/performance/commissions`
- `GET /api/performance/targets`
- `POST /api/performance/targets`
- `GET /api/performance/returns`
- `POST /api/performance/returns`
- `PATCH /api/performance/returns/:id/status`

## Phase 7 Features

- Admin reports at `/admin/reports` with date-range filters.
- Sales, payment, outstanding balance, customer, stock, delivery, and return summary cards.
- Sales trend and order status charts.
- Best-seller, top customer, sales rep, driver cash, and delivery report tables.
- Role-scoped notifications at `/admin/notifications`, `/sales/notifications`, `/driver/notifications`, and `/customer/notifications`.
- Notification read-state updates.
- Admin audit logs at `/admin/audit-logs` with search and pagination.
- New `notifications` and `audit_logs` tables for alerts and sensitive-action tracking.

## Phase 7 API Endpoints

- `GET /api/insights/reports`
- `GET /api/insights/notifications`
- `PATCH /api/insights/notifications/:id/read`
- `GET /api/insights/audit-logs`
