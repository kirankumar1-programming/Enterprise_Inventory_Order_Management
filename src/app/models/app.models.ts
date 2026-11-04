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


// ==========================================
// Phase 2: AI Forecasting & Catalog Models
// ==========================================

export enum StockUrgencyLevel {
  Critical = 1,
  RestockAdvised = 2,
  Healthy = 3,
  Overstocked = 4
}

export interface RestockRecommendation {
  productId: number;
  productSKU: string;
  productName: string;
  categoryName: string;
  warehouseId: number;
  warehouseName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  dailyBurnRate: number;
  supplierLeadTimeDays: number;
  dynamicSafetyStock: number;
  dynamicReorderPoint: number;
  daysOfStockRemaining: number;
  predictedStockoutDate?: string;
  recommendedOrderQuantity: number;
  urgency: StockUrgencyLevel;
  supplierName?: string;
  unitCostPrice: number;
  estimatedOrderCost: number;
}

export interface OverstockAlert {
  productId: number;
  productSKU: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  currentStock: number;
  dailyBurnRate: number;
  daysOfStockRemaining: number;
  excessQuantity: number;
  capitalTiedUp: number;
  recommendation: string;
}

export interface ProductForecastSummary {
  totalAtRiskItems: number;
  criticalItemsCount: number;
  overstockedItemsCount: number;
  totalCapitalInOverstock: number;
  highPriorityRecommendations: RestockRecommendation[];
}

export interface DuplicateProductMatch {
  productId: number;
  sku: string;
  name: string;
  categoryName: string;
  price: number;
  similarityScore: number;
  matchReason: string;
}

export interface DuplicateCheckResponse {
  hasLikelyDuplicates: boolean;
  matches: DuplicateProductMatch[];
}

export interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidenceScore: number;
  explanation: string;
}

export interface RestockPoDraftItem {
  productId: number;
  productSKU: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  quantityToOrder: number;
  unitCostPrice: number;
  totalCost: number;
  supplierName: string;
  supplierLeadTimeDays: number;
}

export interface RestockPoDraft {
  poReferenceNumber: string;
  generatedDate: string;
  warehouseId: number;
  warehouseName: string;
  supplierName: string;
  items: RestockPoDraftItem[];
  grandTotalCost: number;
  estimatedDeliveryDate: string;
}

export interface CatalogDuplicatePair {
  productAId: number;
  productASku: string;
  productAName: string;
  productACategory: string;
  productAPrice: number;
  productBId: number;
  productBSku: string;
  productBName: string;
  productBCategory: string;
  productBPrice: number;
  similarityScore: number;
  similarityReason: string;
}

export interface CategoryMisclassificationAlert {
  productId: number;
  sku: string;
  productName: string;
  currentCategory: string;
  suggestedCategory: string;
  confidence: number;
  reason: string;
}

export interface CatalogAuditReport {
  totalProductsScanned: number;
  potentialDuplicatePairsCount: number;
  categoryAnomaliesCount: number;
  catalogQualityScore: number;
  scanTimestamp: string;
  duplicatePairs: CatalogDuplicatePair[];
  misclassificationAlerts: CategoryMisclassificationAlert[];
}

// ==========================================
// Phase 1: AI Document Ingestion & Copilot
// ==========================================

export interface ExtractedLineItem {
  id?: number;
  rawDescription: string;
  extractedSku?: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  matchedProductId?: number;
  matchedProductName?: string;
  matchedProductSku?: string;
  matchConfidence: number;
  matchReason: string;
  warehouseAvailableStock: number;
  isStockSufficient: boolean;
}

export interface ExtractedOrderDocument {
  documentType: string;
  documentReferenceNumber: string;
  documentDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  suggestedWarehouseId: number;
  suggestedWarehouseName: string;
  items: ExtractedLineItem[];
  subTotal: number;
  tax: number;
  totalAmount: number;
  overallConfidence: number;
  extractionNotes?: string;
}

export interface SampleDocumentOption {
  id: string;
  title: string;
  description: string;
  documentType: string;
  issuer: string;
  itemCount: number;
  estimatedTotal: number;
}

export interface CopilotAction {
  label: string;
  route: string;
  queryParams?: Record<string, string>;
  icon: string;
}

export interface CopilotQueryResponse {
  answerMarkdown: string;
  intent: string;
  dataPayload?: any;
  suggestedActions: CopilotAction[];
  followUpQuestions: string[];
}

// ==========================================
// Phase 3: Autonomous Operations & Intelligence
// ==========================================

export enum AnomalySeverity {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4
}

export enum AnomalyType {
  OffHoursWriteOff = 1,
  HighVolumeAdjustment = 2,
  RapidOrderCancellation = 3,
  TransferDiscrepancy = 4,
  UnusualShrinkageSpike = 5
}

export interface InventoryAnomaly {
  id: string;
  timestamp: string;
  type: AnomalyType;
  typeName: string;
  severity: AnomalySeverity;
  entityName: string;
  entityId: string;
  userEmail: string;
  warehouseName: string;
  productName: string;
  discrepancyQuantity: number;
  estimatedFinancialExposure: number;
  description: string;
  riskScore: number;
  isResolved: boolean;
  resolutionNotes?: string;
}

export interface AnomalyRadarReport {
  overallRiskLevel: string;
  totalAnomaliesCount: number;
  criticalCount: number;
  highCount: number;
  estimatedTotalExposure: number;
  scanTimestamp: string;
  anomalies: InventoryAnomaly[];
}

export interface ResolveAnomalyRequest {
  anomalyId: string;
  notes: string;
}

export enum SupplierTier {
  Tier1Gold = 1,
  Tier2Silver = 2,
  Tier3Standard = 3,
  HighRisk = 4
}

export interface SupplierScorecard {
  supplierId: number;
  supplierName: string;
  contactEmail: string;
  tier: SupplierTier;
  tierName: string;
  reliabilityScore: number;
  onTimeDeliveryProbability: number;
  averageLeadTimeDays: number;
  leadTimeVarianceDays: number;
  suppliedProductsCount: number;
  activeRiskAlerts: string[];
  recommendedAlternateSupplierId?: number;
  recommendedAlternateSupplierName?: string;
}

export interface SupplierIntelligenceReport {
  totalSuppliersEvaluated: number;
  averageNetworkReliability: number;
  highRiskVendorsCount: number;
  evaluationTimestamp: string;
  scorecards: SupplierScorecard[];
}

export interface AutonomousReorderPolicy {
  policyId: string;
  name: string;
  description: string;
  isEnabled: boolean;
  maxAutoApproveValue: number;
  runwayThresholdDays: number;
  lastEvaluatedAt: string;
  totalOrdersAutoDrafted: number;
}

export interface TogglePolicyRequest {
  policyId: string;
  enabled: boolean;
}


