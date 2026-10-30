export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginationParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface Category {
  id: number;
  name: string;
  code: string;
  description?: string;
  productCount: number;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  productCount: number;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  location: string;
  address: string;
  capacity: number;
  isActive: boolean;
  totalStockQuantity: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  unitOfMeasure: string;
  reorderLevel: number;
  isActive: boolean;
  categoryId: number;
  categoryName: string;
  supplierId?: number;
  supplierName?: string;
  totalQuantity: number;
  totalAvailableQuantity: number;
  isLowStock: boolean;
  createdAt: string;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  unitOfMeasure: string;
  reorderLevel: number;
  categoryId: number;
  supplierId?: number;
}

export interface InventoryItem {
  id: number;
  productId: number;
  productSKU: string;
  productName: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  isLowStock: boolean;
  updatedAt?: string;
}

export interface LowStockAlert {
  productId: number;
  productSKU: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  currentStock: number;
  availableStock: number;
  reorderLevel: number;
  shortage: number;
}

export interface StockAdjustmentRequest {
  productId: number;
  warehouseId: number;
  adjustmentQuantity: number;
  reason: string;
}

export interface StockTransferRequest {
  productId: number;
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  quantity: number;
  notes?: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  productSKU: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  movementType: string;
  quantity: number;
  balanceAfter: number;
  referenceNumber?: string;
  notes?: string;
  createdByUserName?: string;
  createdAt: string;
}

export enum OrderStatus {
  Pending = 1,
  Confirmed = 2,
  Shipped = 3,
  Delivered = 4,
  Cancelled = 5
}

export interface OrderItemRequest {
  productId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  warehouseId: number;
  items: OrderItemRequest[];
}

export interface OrderItem {
  id: number;
  productId: number;
  productSKU: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  orderDate: string;
  status: OrderStatus;
  statusName: string;
  totalAmount: number;
  warehouseId: number;
  warehouseName: string;
  createdByUserName?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalWarehouses: number;
  totalSuppliers: number;
  lowStockItemCount: number;
  pendingOrdersCount: number;
  confirmedOrdersCount: number;
  deliveredOrdersCount: number;
  totalStockInventoryValue: number;
  totalSalesRevenue: number;
  warehouseBreakdown: {
    warehouseId: number;
    warehouseName: string;
    warehouseCode: string;
    totalUnitsInStock: number;
    capacity: number;
    utilizationPercentage: number;
  }[];
  topLowStockAlerts: LowStockAlert[];
  recentOrders: Order[];
  recentMovements: StockMovement[];
}

export interface AuditLog {
  id: number;
  entityName: string;
  entityId: string;
  action: string;
  userId?: number;
  userEmail?: string;
  changesJson?: string;
  timestamp: string;
  ipAddress?: string;
}
