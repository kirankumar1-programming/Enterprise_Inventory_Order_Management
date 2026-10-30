import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Product, CreateProductRequest, Category, Supplier, Warehouse,
  InventoryItem, LowStockAlert, StockAdjustmentRequest, StockTransferRequest,
  StockMovement, Order, CreateOrderRequest, DashboardSummary, AuditLog, PagedResult
} from '../../models/app.models';

@Injectable({
  providedIn: 'root'
})
export class InventoryApiService {
  private readonly baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  private toHttpParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          httpParams = httpParams.set(key, String(val));
        }
      });
    }
    return httpParams;
  }

  // 1. Dashboard
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard/summary`);
  }

  // 2. Products
  getProducts(params?: {
    searchTerm?: string;
    categoryId?: number;
    supplierId?: number;
    warehouseId?: number;
    lowStockOnly?: boolean;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDescending?: boolean;
  }): Observable<PagedResult<Product>> {
    return this.http.get<PagedResult<Product>>(`${this.baseUrl}/products`, { params: this.toHttpParams(params) });
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products/${id}`);
  }

  createProduct(dto: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/products`, dto);
  }

  updateProduct(id: number, dto: Partial<CreateProductRequest> & { isActive?: boolean }): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/products/${id}`, dto);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/products/${id}`);
  }

  // 3. Categories & Suppliers & Warehouses
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`);
  }

  createCategory(dto: { name: string; code: string; description?: string }): Observable<Category> {
    return this.http.post<Category>(`${this.baseUrl}/categories`, dto);
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.baseUrl}/suppliers`);
  }

  createSupplier(dto: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.baseUrl}/suppliers`, dto);
  }

  updateSupplier(id: number, dto: Partial<Supplier>): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.baseUrl}/suppliers/${id}`, dto);
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(`${this.baseUrl}/warehouses`);
  }

  createWarehouse(dto: Partial<Warehouse>): Observable<Warehouse> {
    return this.http.post<Warehouse>(`${this.baseUrl}/warehouses`, dto);
  }

  // 4. Inventory
  getInventories(params?: {
    warehouseId?: number;
    productId?: number;
    lowStockOnly?: boolean;
    searchTerm?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResult<InventoryItem>> {
    return this.http.get<PagedResult<InventoryItem>>(`${this.baseUrl}/inventory`, { params: this.toHttpParams(params) });
  }

  getLowStockAlerts(): Observable<LowStockAlert[]> {
    return this.http.get<LowStockAlert[]>(`${this.baseUrl}/inventory/low-stock-alerts`);
  }

  adjustStock(dto: StockAdjustmentRequest): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(`${this.baseUrl}/inventory/adjust`, dto);
  }

  transferStock(dto: StockTransferRequest): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/inventory/transfer`, dto);
  }

  getStockMovements(params?: {
    productId?: number;
    warehouseId?: number;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResult<StockMovement>> {
    return this.http.get<PagedResult<StockMovement>>(`${this.baseUrl}/inventory/movements`, { params: this.toHttpParams(params) });
  }

  // 5. Orders
  getOrders(params?: {
    status?: number;
    warehouseId?: number;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResult<Order>> {
    return this.http.get<PagedResult<Order>>(`${this.baseUrl}/orders`, { params: this.toHttpParams(params) });
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${id}`);
  }

  createOrder(dto: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, dto);
  }

  updateOrderStatus(id: number, status: number, note?: string): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders/${id}/status`, { status, note });
  }

  cancelOrder(id: number, reason?: string): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders/${id}/cancel`, { reason });
  }

  // 6. Audit Logs
  getAuditLogs(params?: {
    entityName?: string;
    action?: string;
    searchTerm?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResult<AuditLog>> {
    return this.http.get<PagedResult<AuditLog>>(`${this.baseUrl}/audit`, { params: this.toHttpParams(params) });
  }
}
