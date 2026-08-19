export type Status = 'ACTIVE' | 'INACTIVE';

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  status: Status;
  variant_count: number;
  total_stock: number;
  low_stock_variants: number;
}

export interface Variant {
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
  status: Status;
}

export type StockTransactionType =
  | 'STOCK_IN'
  | 'ORDER_RESERVED'
  | 'ORDER_SOLD'
  | 'RETURNED'
  | 'MANUAL_ADJUSTMENT'
  | 'DAMAGED'
  | 'CANCELLED_ORDER_RESTOCK';

export interface StockTransaction {
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
  created_at: string;
}

export type CustomerType =
  | 'CASH_CUSTOMER'
  | 'CREDIT_CUSTOMER'
  | 'WHOLESALE_CUSTOMER'
  | 'VIP_CUSTOMER';

export interface Customer {
  id: number;
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
  assigned_sales_rep_name: string | null;
  status: Status;
  notes: string | null;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'COD' | 'CREDIT' | 'OTHER';

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

export interface CartItem {
  variantId: number;
  productName: string;
  size: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  sales_rep_id: number | null;
  sales_rep_name: string | null;
  order_source: 'CUSTOMER_PORTAL' | 'SALES_REP' | 'ADMIN';
  order_date: string;
  subtotal: string;
  discount_percentage: string;
  discount_amount: string;
  delivery_charge: string;
  grand_total: string;
  amount_paid: string;
  outstanding_amount: string;
  payment_method: PaymentMethod;
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  order_status: OrderStatus;
  notes: string | null;
}

export interface OrderItem {
  id: number;
  product_name_snapshot: string;
  variant_size_snapshot: string;
  quantity: number;
  unit_price: string;
  discount: string;
  line_total: string;
}

export interface OrderHistory {
  id: number;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by_name: string;
  note: string | null;
  created_at: string;
}

export interface OrderDetails {
  order: Order;
  items: OrderItem[];
  history: OrderHistory[];
}

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface Invoice {
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
  invoice_date: string;
}

export interface Payment {
  id: number;
  payment_number: string;
  customer_name: string;
  order_number: string;
  invoice_number: string;
  amount: string;
  payment_method: PaymentMethod | 'OTHER';
  payment_date: string;
  received_by_name: string;
  reference_number: string | null;
  note: string | null;
}

export interface LedgerEntry {
  id: number;
  customer_id: number;
  reference: string;
  reference_id: number | null;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'RETURN' | 'MANUAL_ADJUSTMENT';
  debit: string;
  credit: string;
  running_balance: string;
  note: string | null;
  created_at: string;
}

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

export interface Driver {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  vehicle_number: string | null;
  vehicle_type: string | null;
  status: Status;
}

export interface Delivery {
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
  payment_status: PaymentStatus;
  status: DeliveryStatus;
  result: DeliveryResult | null;
  amount_collected: string;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface DeliveryHistory {
  id: number;
  previous_status: DeliveryStatus | null;
  new_status: DeliveryStatus;
  changed_by_name: string;
  note: string | null;
  created_at: string;
}

export interface DeliveryDetails {
  delivery: Delivery;
  history: DeliveryHistory[];
}

export type CommissionStatus = 'PENDING' | 'EARNED' | 'PAID' | 'CANCELLED';

export interface Commission {
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
  earned_at: string | null;
  paid_at: string | null;
}

export interface SalesRepOption {
  id: number;
  name: string;
  commission_percent: string;
}

export interface SalesTarget {
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

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'COMPLETED';
export type ReturnReason = 'DAMAGED_PRODUCT' | 'WRONG_PRODUCT' | 'WRONG_SIZE' | 'CUSTOMER_REJECTION' | 'OTHER';
export type RestockDecision = 'RESTOCK' | 'DAMAGED' | 'NO_RESTOCK';

export interface ReturnRecord {
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
  created_at: string;
}

export type NotificationCategory = 'ORDER' | 'PAYMENT' | 'DELIVERY' | 'INVENTORY' | 'TARGET' | 'RETURN' | 'SYSTEM';

export interface NotificationRecord {
  id: number;
  user_id: number | null;
  role_name: 'ADMIN' | 'SALES_REP' | 'DRIVER' | 'CUSTOMER' | null;
  title: string;
  message: string;
  category: NotificationCategory;
  entity_type: string | null;
  entity_id: number | null;
  is_read: 0 | 1 | boolean;
  created_at: string;
}

export interface AuditLogRecord {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  previous_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  created_at: string;
}

export interface ReportSummary {
  order_count: number;
  gross_sales: string;
  outstanding_amount: string;
  active_customers: number;
  payment_collected: string;
  payment_count: number;
  low_stock_variants: number;
  stock_on_hand: number;
  delivery_count: number;
  driver_cash_collected: string;
  return_count: number;
  refund_amount: string;
}

export interface ReportPoint {
  label: string;
  value: string | number;
  order_count?: number;
  payment_count?: number;
}

export interface ReportProduct {
  product_name: string;
  variant_size: string;
  quantity_sold: number;
  sales_total: string;
}

export interface ReportCustomer {
  business_name: string;
  outstanding_balance: string;
  credit_limit: string;
  order_count: number;
  sales_total: string;
}

export interface ReportSalesRep {
  id: number;
  sales_rep_name: string;
  order_count: number;
  customer_count: number;
  sales_total: string;
  commission_total: string;
  target_amount: string;
}

export interface ReportDriver {
  id: number;
  driver_name: string;
  delivery_count: number;
  delivered_count: number;
  cash_collected: string;
}

export interface ReportsPayload {
  summary: ReportSummary;
  salesByDay: ReportPoint[];
  ordersByStatus: ReportPoint[];
  topProducts: ReportProduct[];
  topCustomers: ReportCustomer[];
  salesReps: ReportSalesRep[];
  drivers: ReportDriver[];
  financialBreakdown: ReportPoint[];
}
