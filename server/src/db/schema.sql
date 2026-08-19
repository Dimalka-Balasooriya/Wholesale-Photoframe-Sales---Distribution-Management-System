CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name ENUM('ADMIN', 'SALES_REP', 'DRIVER', 'CUSTOMER') NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_role_status (role_id, status),
  INDEX idx_users_email_status (email, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_reps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  max_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_reps_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS drivers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  vehicle_number VARCHAR(50) NULL,
  vehicle_type VARCHAR(80) NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL UNIQUE,
  assigned_sales_rep_id BIGINT UNSIGNED NULL,
  business_name VARCHAR(180) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  whatsapp VARCHAR(30) NULL,
  email VARCHAR(191) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  province VARCHAR(100) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  customer_type ENUM('CASH_CUSTOMER', 'CREDIT_CUSTOMER', 'WHOLESALE_CUSTOMER', 'VIP_CUSTOMER') NOT NULL DEFAULT 'WHOLESALE_CUSTOMER',
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  outstanding_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_customers_sales_rep FOREIGN KEY (assigned_sales_rep_id) REFERENCES sales_reps(id),
  INDEX idx_customers_sales_rep (assigned_sales_rep_id),
  INDEX idx_customers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(120) NOT NULL,
  description TEXT NULL,
  image_url VARCHAR(500) NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_products_name (name),
  INDEX idx_products_category_status (category, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  size VARCHAR(50) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  wholesale_price DECIMAL(12,2) NOT NULL,
  minimum_wholesale_quantity INT UNSIGNED NOT NULL DEFAULT 1,
  current_stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_level INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_variants_product_status (product_id, status),
  INDEX idx_variants_low_stock (current_stock_quantity, low_stock_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  previous_quantity INT NOT NULL,
  quantity_changed INT NOT NULL,
  new_quantity INT NOT NULL,
  transaction_type ENUM(
    'STOCK_IN',
    'ORDER_RESERVED',
    'ORDER_SOLD',
    'RETURNED',
    'MANUAL_ADJUSTMENT',
    'DAMAGED',
    'CANCELLED_ORDER_RESTOCK'
  ) NOT NULL,
  related_order_id BIGINT UNSIGNED NULL,
  changed_by BIGINT UNSIGNED NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_transactions_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_stock_transactions_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id),
  CONSTRAINT fk_stock_transactions_changed_by FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_stock_transactions_variant_date (variant_id, created_at),
  INDEX idx_stock_transactions_type_date (transaction_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  sales_rep_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  order_source ENUM('CUSTOMER_PORTAL', 'SALES_REP', 'ADMIN') NOT NULL,
  order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  delivery_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method ENUM('CASH', 'BANK_TRANSFER', 'CARD', 'COD', 'CREDIT') NOT NULL DEFAULT 'CREDIT',
  payment_status ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'UNPAID',
  credit_approval_required TINYINT(1) NOT NULL DEFAULT 0,
  order_status ENUM(
    'DRAFT',
    'PENDING',
    'DISCOUNT_APPROVAL_REQUIRED',
    'APPROVED',
    'PREPARING',
    'READY_FOR_DELIVERY',
    'DRIVER_ASSIGNED',
    'OUT_FOR_DELIVERY',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'RETURNED'
  ) NOT NULL DEFAULT 'PENDING',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_orders_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(id),
  CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  INDEX idx_orders_customer_date (customer_id, order_date),
  INDEX idx_orders_sales_rep_date (sales_rep_id, order_date),
  INDEX idx_orders_status_date (order_status, order_date),
  INDEX idx_orders_source_date (order_source, order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  billing_address TEXT NULL,
  phone VARCHAR(30) NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  delivery_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_status ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'UNPAID',
  invoice_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  INDEX idx_invoices_customer_date (customer_id, invoice_date),
  INDEX idx_invoices_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('CASH', 'BANK_TRANSFER', 'CARD', 'COD', 'CREDIT', 'OTHER') NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_by BIGINT UNSIGNED NOT NULL,
  reference_number VARCHAR(120) NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_payments_received_by FOREIGN KEY (received_by) REFERENCES users(id),
  INDEX idx_payments_customer_date (customer_id, payment_date),
  INDEX idx_payments_order (order_id),
  INDEX idx_payments_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_ledger (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  reference VARCHAR(80) NOT NULL,
  reference_id BIGINT UNSIGNED NULL,
  type ENUM('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'RETURN', 'MANUAL_ADJUSTMENT') NOT NULL,
  debit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  running_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_ledger_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  INDEX idx_customer_ledger_customer_date (customer_id, created_at),
  INDEX idx_customer_ledger_reference (reference, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deliveries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_number VARCHAR(40) NOT NULL UNIQUE,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  driver_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  delivery_address TEXT NULL,
  district VARCHAR(100) NULL,
  status ENUM(
    'ASSIGNED',
    'OUT_FOR_DELIVERY',
    'FULLY_DELIVERED',
    'PARTIALLY_DELIVERED',
    'CUSTOMER_NOT_AVAILABLE',
    'DELIVERY_FAILED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'ASSIGNED',
  result ENUM(
    'FULLY_DELIVERED',
    'PARTIALLY_DELIVERED',
    'CUSTOMER_NOT_AVAILABLE',
    'DELIVERY_FAILED'
  ) NULL,
  amount_collected DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_deliveries_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_deliveries_driver FOREIGN KEY (driver_id) REFERENCES drivers(id),
  CONSTRAINT fk_deliveries_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
  INDEX idx_deliveries_driver_status (driver_id, status),
  INDEX idx_deliveries_status_date (status, assigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL,
  previous_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_delivery_history_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
  CONSTRAINT fk_delivery_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id),
  INDEX idx_delivery_history_delivery_date (delivery_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_rep_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  order_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('PENDING', 'EARNED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  earned_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commissions_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(id),
  CONSTRAINT fk_commissions_order FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_commissions_sales_rep_status (sales_rep_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_targets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_rep_id BIGINT UNSIGNED NOT NULL,
  target_month CHAR(7) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_targets_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(id),
  CONSTRAINT fk_sales_targets_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY uq_sales_targets_rep_month (sales_rep_id, target_month),
  INDEX idx_sales_targets_month (target_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_number VARCHAR(40) NOT NULL UNIQUE,
  order_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  approved_by BIGINT UNSIGNED NULL,
  status ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'COMPLETED') NOT NULL DEFAULT 'REQUESTED',
  reason ENUM('DAMAGED_PRODUCT', 'WRONG_PRODUCT', 'WRONG_SIZE', 'CUSTOMER_REJECTION', 'OTHER') NOT NULL DEFAULT 'OTHER',
  refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  restock_decision ENUM('RESTOCK', 'DAMAGED', 'NO_RESTOCK') NOT NULL DEFAULT 'NO_RESTOCK',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_returns_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_returns_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_returns_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_returns_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_returns_status_date (status, created_at),
  INDEX idx_returns_customer_date (customer_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  product_name_snapshot VARCHAR(180) NOT NULL,
  variant_size_snapshot VARCHAR(50) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id),
  INDEX idx_order_items_order (order_id),
  INDEX idx_order_items_variant (variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  condition_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_return_items_return FOREIGN KEY (return_id) REFERENCES returns(id),
  CONSTRAINT fk_return_items_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  CONSTRAINT fk_return_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_return_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id),
  INDEX idx_return_items_return (return_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  previous_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id),
  INDEX idx_order_status_history_order_date (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  role_name ENUM('ADMIN', 'SALES_REP', 'DRIVER', 'CUSTOMER') NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  category ENUM('ORDER', 'PAYMENT', 'DELIVERY', 'INVENTORY', 'TARGET', 'RETURN', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_notifications_user_read_date (user_id, is_read, created_at),
  INDEX idx_notifications_role_read_date (role_name, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  previous_value JSON NULL,
  new_value JSON NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_action_date (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
