import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSummary } from '../../models/app.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-page" *ngIf="summary && !isLoading; else statusTpl">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>Operations Dashboard</h1>
          <p class="subtitle">Live inventory valuation, multi-warehouse capacity, and order fulfillment</p>
        </div>
        <div class="header-actions">
          <a routerLink="/orders" class="btn btn-primary">
            <span>+</span> New Order
          </a>
          <a routerLink="/inventory" class="btn btn-secondary">
            <span>🔄</span> Adjust Stock
          </a>
        </div>
      </div>

      <!-- Low Stock Alert Banner (if any) -->
      <div *ngIf="summary.lowStockItemCount > 0" class="alert-banner">
        <div class="alert-icon">⚠️</div>
        <div class="alert-body">
          <strong>Low Stock Warning:</strong>
          There are <strong>{{ summary.lowStockItemCount }} products</strong> currently falling below their configured safety reorder level across warehouses.
        </div>
        <a routerLink="/inventory" [queryParams]="{ lowStock: true }" class="btn btn-sm btn-danger">
          Review Alerts
        </a>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">TOTAL PRODUCTS</span>
            <span class="kpi-icon">🏷️</span>
          </div>
          <div class="kpi-value">{{ summary.totalProducts }}</div>
          <div class="kpi-meta text-muted">Across {{ summary.totalWarehouses }} Active Warehouses</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">INVENTORY VALUATION</span>
            <span class="kpi-icon">💰</span>
          </div>
          <div class="kpi-value">{{ summary.totalStockInventoryValue | currency }}</div>
          <div class="kpi-meta text-muted">Asset value at cost price</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">TOTAL SALES REVENUE</span>
            <span class="kpi-icon">📈</span>
          </div>
          <div class="kpi-value text-success">{{ summary.totalSalesRevenue | currency }}</div>
          <div class="kpi-meta text-muted">Confirmed & Delivered Orders</div>
        </div>

        <div class="kpi-card" [class.kpi-danger]="summary.lowStockItemCount > 0">
          <div class="kpi-header">
            <span class="kpi-title">LOW STOCK ITEMS</span>
            <span class="kpi-icon">⚠️</span>
          </div>
          <div class="kpi-value" [class.text-danger]="summary.lowStockItemCount > 0">
            {{ summary.lowStockItemCount }}
          </div>
          <div class="kpi-meta text-muted">Requires replenishment</div>
        </div>
      </div>

      <!-- Warehouse Capacity Breakdown & Order Status Breakdown -->
      <div class="grid-2-col">
        <!-- Warehouse Capacity -->
        <div class="card">
          <div class="card-header">
            <h3>Warehouse Capacity & Stock Levels</h3>
            <span class="badge badge-neutral">{{ summary.totalWarehouses }} Facilities</span>
          </div>
          <div class="warehouse-list">
            <div *ngFor="let wh of summary.warehouseBreakdown" class="warehouse-item">
              <div class="wh-info">
                <span class="wh-name">{{ wh.warehouseName }} ({{ wh.warehouseCode }})</span>
                <span class="wh-units">
                  <strong>{{ wh.totalUnitsInStock | number }}</strong> / {{ wh.capacity | number }} units ({{ wh.utilizationPercentage }}%)
                </span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [style.width.%]="wh.utilizationPercentage"
                  [ngClass]="wh.utilizationPercentage > 85 ? 'bg-danger' : wh.utilizationPercentage > 60 ? 'bg-warning' : 'bg-primary'"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Pipeline Status -->
        <div class="card">
          <div class="card-header">
            <h3>Order Pipeline</h3>
            <a routerLink="/orders" class="link-primary">View All</a>
          </div>
          <div class="order-stats-grid">
            <div class="order-stat-box">
              <span class="order-stat-num text-warning">{{ summary.pendingOrdersCount }}</span>
              <span class="order-stat-label">Pending Review</span>
            </div>
            <div class="order-stat-box">
              <span class="order-stat-num text-info">{{ summary.confirmedOrdersCount }}</span>
              <span class="order-stat-label">Stock Reserved / Confirmed</span>
            </div>
            <div class="order-stat-box">
              <span class="order-stat-num text-success">{{ summary.deliveredOrdersCount }}</span>
              <span class="order-stat-label">Delivered & Closed</span>
            </div>
          </div>
          <div class="card-subnote">
            ℹ Orders in <em>Confirmed</em> status have inventory atomically deducted with ACID transaction locking.
          </div>
        </div>
      </div>

      <!-- Tables Grid: Recent Orders & Recent Stock Movements -->
      <div class="grid-2-col">
        <!-- Recent Orders -->
        <div class="card">
          <div class="card-header">
            <h3>Recent Orders</h3>
            <a routerLink="/orders" class="link-primary">Manage Orders &rarr;</a>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let ord of summary.recentOrders">
                  <td>
                    <span class="code-badge">{{ ord.orderNumber }}</span>
                  </td>
                  <td>{{ ord.customerName }}</td>
                  <td>
                    <span class="badge" [ngClass]="getOrderBadgeClass(ord.status)">
                      {{ ord.statusName }}
                    </span>
                  </td>
                  <td><strong>{{ ord.totalAmount | currency }}</strong></td>
                </tr>
                <tr *ngIf="summary.recentOrders.length === 0">
                  <td colspan="4" class="text-center text-muted">No orders found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Stock Movements -->
        <div class="card">
          <div class="card-header">
            <h3>Stock Movement Ledger</h3>
            <a routerLink="/inventory" class="link-primary">View Ledger &rarr;</a>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Action</th>
                  <th>Qty Change</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of summary.recentMovements">
                  <td>
                    <div class="prod-cell">
                      <span>{{ m.productName }}</span>
                      <small class="code-badge">{{ m.productSKU }}</small>
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-neutral">{{ m.movementType }}</span>
                  </td>
                  <td>
                    <span [ngClass]="m.quantity > 0 ? 'text-success' : 'text-danger'">
                      {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
                    </span>
                  </td>
                  <td><strong>{{ m.balanceAfter }}</strong></td>
                </tr>
                <tr *ngIf="summary.recentMovements.length === 0">
                  <td colspan="4" class="text-center text-muted">No stock movements recorded.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <ng-template #statusTpl>
      <div *ngIf="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading enterprise operations dashboard...</p>
      </div>

      <div *ngIf="!isLoading && errorMessage" class="error-state">
        <div class="error-card">
          <div class="error-icon">⚠️</div>
          <h3>Dashboard Unavailable</h3>
          <p class="error-msg">{{ errorMessage }}</p>
          <div class="error-actions">
            <button class="btn btn-primary" (click)="loadSummary()">
              <span>🔄</span> Retry Loading
            </button>
            <button class="btn btn-secondary" (click)="auth.logout()">
              <span>↪</span> Sign In Again
            </button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; }
    .header-actions { display: flex; gap: 0.75rem; }

    .alert-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--warning-bg);
      border: 1px solid var(--warning-border);
      padding: 0.875rem 1.25rem;
      border-radius: var(--radius-md);
    }
    .alert-icon { font-size: 1.5rem; }
    .alert-body { flex: 1; font-size: 0.875rem; color: #92400e; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .kpi-card {
      background: #fff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.25rem 1.5rem;
      box-shadow: var(--shadow-sm);
    }
    .kpi-card.kpi-danger {
      border-color: var(--danger-border);
      background: #fffafa;
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .kpi-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }
    .kpi-icon { font-size: 1.25rem; }
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 0.25rem;
    }
    .kpi-meta { font-size: 0.75rem; }

    .grid-2-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 1.5rem;
    }

    .warehouse-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .wh-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      margin-bottom: 0.35rem;
    }
    .wh-name { font-weight: 600; }
    .wh-units { color: var(--text-muted); font-size: 0.8125rem; }
    .bg-primary { background-color: var(--primary); }
    .bg-warning { background-color: var(--warning); }
    .bg-danger { background-color: var(--danger); }

    .order-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .order-stat-box {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .order-stat-num { font-size: 1.75rem; font-weight: 800; }
    .order-stat-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
    .card-subnote {
      font-size: 0.8125rem;
      color: var(--text-muted);
      background: #f1f5f9;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
    }

    .link-primary {
      color: var(--primary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .link-primary:hover { text-decoration: underline; }

    .text-success { color: var(--success); }
    .text-danger { color: var(--danger); }
    .text-warning { color: var(--warning); }
    .text-info { color: var(--info); }
    .text-muted { color: var(--text-muted); }

    .prod-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 1rem;
      color: var(--text-muted);
    }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      padding: 2rem;
    }
    .error-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 2.5rem;
      max-width: 480px;
      text-align: center;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .error-icon { font-size: 2.5rem; }
    .error-card h3 { font-size: 1.25rem; color: var(--text-main); }
    .error-msg { color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; }
    .error-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
  `]
})
export class DashboardComponent implements OnInit {
  summary: DashboardSummary | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private api: InventoryApiService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadSummary();
  }

  loadSummary() {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.api.getDashboardSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.status === 401) {
          this.errorMessage = 'Your authentication session has expired. Please sign in again to load operations dashboard data.';
        } else if (err?.status === 0) {
          this.errorMessage = 'Cannot connect to the backend API service at http://localhost:5000. Please verify the service is running.';
        } else {
          this.errorMessage = err?.error?.message || err?.message || 'Failed to load dashboard metrics. Please try again.';
        }
        this.cdr.markForCheck();
      }
    });
  }

  getOrderBadgeClass(status: number): string {
    switch (status) {
      case 1: return 'badge-warning'; // Pending
      case 2: return 'badge-info';    // Confirmed
      case 3: return 'badge-info';    // Shipped
      case 4: return 'badge-success'; // Delivered
      case 5: return 'badge-danger';  // Cancelled
      default: return 'badge-neutral';
    }
  }
}
