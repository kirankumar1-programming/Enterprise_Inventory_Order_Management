import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  InventoryItem, Warehouse, Product, LowStockAlert,
  StockMovement, PagedResult, RestockRecommendation, OverstockAlert, ProductForecastSummary, StockUrgencyLevel,
  RestockPoDraft
} from '../../models/app.models';

@Component({
  selector: 'app-inventory-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Inventory & Stock Movements</h1>
          <p class="subtitle">Multi-warehouse inventory tracker, ledger audit history, and stock transfers</p>
        </div>
        <div class="header-actions" *ngIf="auth.isAdmin() || auth.isManager()">
          <button class="btn btn-secondary" (click)="openTransferModal()">
            <span>⇄</span> Transfer Stock
          </button>
          <button class="btn btn-primary" (click)="openAdjustModal()">
            <span>±</span> Adjust Stock
          </button>
        </div>
      </div>

      <!-- Main Navigation Tabs -->
      <div class="tabs-bar">
        <button class="tab-btn" [class.active]="activeTab === 'stock'" (click)="setTab('stock')">
          🏬 Stock Quantities
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'alerts'" (click)="setTab('alerts')">
          ⚠️ Low-Stock Alerts
          <span *ngIf="lowStockAlerts.length > 0" class="tab-badge">{{ lowStockAlerts.length }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'forecast'" (click)="setTab('forecast')">
          🤖 AI Demand Forecast & Dynamic Restock
          <span class="ai-badge-chip phase2">Phase 2 AI</span>
          <span *ngIf="forecastSummary && forecastSummary.criticalItemsCount > 0" class="tab-badge badge-danger">
            {{ forecastSummary.criticalItemsCount }} Critical
          </span>
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'movements'" (click)="setTab('movements')">
          📜 Movement History
        </button>
      </div>

      <!-- TAB 1: Stock Quantities -->
      <div *ngIf="activeTab === 'stock'" class="tab-pane">
        <!-- Warehouse Filter Pills -->
        <div class="warehouse-pills">
          <button
            class="pill"
            [class.active]="selectedWarehouseId === null"
            (click)="filterWarehouse(null)"
          >
            All Facilities ({{ warehouses.length }})
          </button>
          <button
            *ngFor="let w of warehouses"
            class="pill"
            [class.active]="selectedWarehouseId === w.id"
            (click)="filterWarehouse(w.id)"
          >
            {{ w.name }} ({{ w.code }})
          </button>
        </div>

        <div class="card table-card">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Total Physical</th>
                  <th>Reserved (In-Flight)</th>
                  <th>Available To Sell</th>
                  <th>Reorder Level</th>
                  <th>Stock Status</th>
                  <th *ngIf="auth.isAdmin() || auth.isManager()">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of inventoryPaged?.items">
                  <td>
                    <span class="code-badge">{{ item.productSKU }}</span>
                  </td>
                  <td><strong>{{ item.productName }}</strong></td>
                  <td>{{ item.warehouseName }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ item.reservedQuantity }}</td>
                  <td>
                    <span class="avail-qty" [ngClass]="item.isLowStock ? 'text-danger' : 'text-success'">
                      {{ item.availableQuantity }}
                    </span>
                  </td>
                  <td>{{ item.reorderLevel }}</td>
                  <td>
                    <span *ngIf="item.isLowStock" class="badge badge-danger">⚠️ Low Stock</span>
                    <span *ngIf="!item.isLowStock && item.availableQuantity > 0" class="badge badge-success">✓ OK</span>
                    <span *ngIf="item.availableQuantity === 0" class="badge badge-neutral">Out of Stock</span>
                  </td>
                  <td *ngIf="auth.isAdmin() || auth.isManager()">
                    <button class="btn btn-sm btn-secondary" (click)="quickAdjust(item)">
                      Adjust
                    </button>
                  </td>
                </tr>

                <tr *ngIf="inventoryPaged?.items?.length === 0">
                  <td colspan="9" class="text-center text-muted py-4">
                    No inventory records found for the selected warehouse filter.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: Low-Stock Alerts -->
      <div *ngIf="activeTab === 'alerts'" class="tab-pane">
        <div class="card table-card">
          <div class="card-header">
            <div>
              <h3>Products Below Safety Reorder Threshold</h3>
              <p class="text-muted text-sm">Automated triggers flagging inventory shortage requiring immediate supplier replenishment</p>
            </div>
            <span class="badge badge-danger">{{ lowStockAlerts.length }} Critical Alerts</span>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Warehouse Location</th>
                  <th>Current Stock</th>
                  <th>Available Stock</th>
                  <th>Configured Threshold</th>
                  <th>Deficit / Shortage</th>
                  <th *ngIf="auth.isAdmin() || auth.isManager()">Quick Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let alert of lowStockAlerts">
                  <td><span class="code-badge">{{ alert.productSKU }}</span></td>
                  <td><strong>{{ alert.productName }}</strong></td>
                  <td>{{ alert.warehouseName }}</td>
                  <td>{{ alert.currentStock }}</td>
                  <td><span class="text-danger font-bold">{{ alert.availableStock }}</span></td>
                  <td>{{ alert.reorderLevel }}</td>
                  <td>
                    <span class="badge badge-danger">-{{ alert.shortage }} units</span>
                  </td>
                  <td *ngIf="auth.isAdmin() || auth.isManager()">
                    <button class="btn btn-sm btn-primary" (click)="replenishStock(alert)">
                      + Replenish Stock
                    </button>
                  </td>
                </tr>

                <tr *ngIf="lowStockAlerts.length === 0">
                  <td colspan="8" class="text-center text-success py-4">
                    ✓ All warehouses have healthy inventory levels above their reorder thresholds!
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: AI Demand Forecast & Dynamic Restock -->
      <div *ngIf="activeTab === 'forecast'" class="tab-pane">
        <!-- AI Summary Executive Metrics Table (Table Format) -->
        <div *ngIf="forecastSummary" class="card mb-4 table-card">
          <div class="table-responsive">
            <table class="table forecast-summary-table">
              <thead>
                <tr>
                  <th style="width: 28%;">AI Demand &amp; Health Metric</th>
                  <th style="width: 16%;" class="text-center">Count / Value</th>
                  <th style="width: 38%;">Threshold &amp; Assessment Rule</th>
                  <th style="width: 18%;" class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr [class.row-critical]="forecastSummary.criticalItemsCount > 0">
                  <td>
                    <div class="metric-title-cell">
                      <span class="metric-icon">🚨</span>
                      <div>
                        <strong>CRITICAL STOCKOUT RISK</strong>
                        <div class="text-xs text-muted">Urgent buffer depletion</div>
                      </div>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="badge" [ngClass]="forecastSummary.criticalItemsCount > 0 ? 'badge-danger font-bold' : 'badge-neutral'">
                      {{ forecastSummary.criticalItemsCount }} Items
                    </span>
                  </td>
                  <td>
                    <span class="text-sm">Less than <strong>3 days</strong> of stock remaining based on 30-day velocity.</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-sm btn-outline-danger" (click)="forecastSubView = 'recommendations'; urgencyFilter = 'critical'">
                      Filter Critical →
                    </button>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div class="metric-title-cell">
                      <span class="metric-icon">📦</span>
                      <div>
                        <strong>RESTOCK RECOMMENDED</strong>
                        <div class="text-xs text-muted">Below dynamic safety buffer</div>
                      </div>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="badge badge-warning font-bold">
                      {{ forecastSummary.totalAtRiskItems }} Items
                    </span>
                  </td>
                  <td>
                    <span class="text-sm">Stock below dynamic ROP + Lead time (<code>ROP = Burn × Lead Time + SS</code>).</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-sm btn-secondary" (click)="forecastSubView = 'recommendations'; urgencyFilter = 'all'">
                      View All ({{ forecastSummary.totalAtRiskItems }}) →
                    </button>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div class="metric-title-cell">
                      <span class="metric-icon">⏳</span>
                      <div>
                        <strong>OVERSTOCKED PRODUCTS</strong>
                        <div class="text-xs text-muted">Stagnant inventory turnover</div>
                      </div>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="badge badge-info font-bold">
                      {{ forecastSummary.overstockedItemsCount }} Items
                    </span>
                  </td>
                  <td>
                    <span class="text-sm">&gt; <strong>60 days runway</strong> with stagnant turnover.</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-sm btn-secondary" (click)="forecastSubView = 'overstock'">
                      View Overstock →
                    </button>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div class="metric-title-cell">
                      <span class="metric-icon">💵</span>
                      <div>
                        <strong>TIED-UP OVERSTOCK CAPITAL</strong>
                        <div class="text-xs text-muted">Recoverable excess inventory</div>
                      </div>
                    </div>
                  </td>
                  <td class="text-center">
                    <strong class="font-bold text-success" style="font-size: 1rem;">
                      {{ forecastSummary.totalCapitalInOverstock | currency }}
                    </strong>
                  </td>
                  <td>
                    <span class="text-sm">Locked in excess carrying inventory eligible for rebalance transfer.</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-sm btn-outline-success" (click)="forecastSubView = 'overstock'">
                      Rebalance Capital →
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Formula & Methodology Explainer (Phase 2) -->
        <div class="ai-formula-banner mb-3">
          <div class="d-flex align-center justify-between">
            <div class="d-flex align-center gap-2">
              <span class="ai-badge-chip phase2">Phase 2 AI Engine</span>
              <strong>Predictive Demand & Dynamic Buffer Formulation</strong>
            </div>
            <span class="text-sm text-muted">95% Service Level Confidence (Z = 1.65)</span>
          </div>
          <div class="formula-text text-sm mt-1">
            <span><strong>Dynamic Safety Stock:</strong> <code>SS = ⌈1.65 × √(Lead Time) × max(1, Daily Burn × 0.7)⌉</code></span>
            <span class="mx-2">•</span>
            <span><strong>Dynamic ROP:</strong> <code>ROP = (Daily Burn × Lead Time) + SS</code></span>
            <span class="mx-2">•</span>
            <span><strong>Burn Rate:</strong> Evaluated over 30-Day sales velocity window</span>
          </div>
        </div>

        <!-- Sub-View Navigation Pills & Actions -->
        <div class="d-flex justify-between align-center mb-3">
          <div class="d-flex gap-2 align-center">
            <div class="warehouse-pills m-0">
              <button
                class="pill"
                [class.active]="forecastSubView === 'recommendations'"
                (click)="forecastSubView = 'recommendations'"
              >
                Dynamic Restock Recommendations ({{ restockRecommendations.length }})
              </button>
              <button
                class="pill"
                [class.active]="forecastSubView === 'overstock'"
                (click)="forecastSubView = 'overstock'"
              >
                Overstocked & Dead Stock ({{ overstockAlerts.length }})
              </button>
            </div>

            <!-- Urgency Filter (Recommendations view) -->
            <select
              *ngIf="forecastSubView === 'recommendations'"
              class="form-control form-control-sm"
              style="width: 180px; padding: 0.35rem 0.5rem; font-size: 0.8125rem;"
              [(ngModel)]="urgencyFilter"
            >
              <option value="all">Filter: All Urgencies</option>
              <option value="critical">🚨 Critical Risk (<3 Days)</option>
              <option value="advised">📦 Restock Advised</option>
            </select>
          </div>

          <div class="d-flex gap-2">
            <button
              *ngIf="forecastSubView === 'recommendations' && (auth.isAdmin() || auth.isManager())"
              class="btn btn-sm btn-ai-gradient"
              (click)="openPoDraftModal()"
              [disabled]="isGeneratingPo || restockRecommendations.length === 0"
            >
              📋 Generate Restock PO Draft [Phase 2 AI]
            </button>
            <button class="btn btn-sm btn-secondary" (click)="loadForecasting()">
              <span>🔄</span> Recalculate Velocity
            </button>
          </div>
        </div>

        <!-- VIEW A: Restock Recommendations Table -->
        <div *ngIf="forecastSubView === 'recommendations'" class="card table-card">
          <div class="card-header">
            <div>
              <h3>AI-Driven Restock Recommendations</h3>
              <p class="subtitle text-sm">Calculated from 30-day sales velocity, supplier lead times, and dynamic safety stock buffer</p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Facility</th>
                  <th>Available / Current</th>
                  <th>Daily Burn Rate</th>
                  <th>Dynamic Safety / ROP</th>
                  <th>Runway (Days)</th>
                  <th>Suggested Order Qty</th>
                  <th>Est. Cost</th>
                  <th>Supplier</th>
                  <th *ngIf="auth.isAdmin() || auth.isManager()">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let rec of filteredRecommendations">
                  <td>
                    <strong>{{ rec.productName }}</strong>
                    <div class="code-badge">{{ rec.productSKU }}</div>
                  </td>
                  <td>{{ rec.warehouseName }}</td>
                  <td>
                    <span class="avail-qty" [class.text-danger]="rec.availableStock <= 0">{{ rec.availableStock }}</span>
                    <span class="text-muted text-sm"> / {{ rec.currentStock }}</span>
                  </td>
                  <td>
                    <strong>{{ rec.dailyBurnRate }}</strong> <span class="text-muted text-sm">units/day</span>
                  </td>
                  <td>
                    <span class="badge badge-neutral">SS: {{ rec.dynamicSafetyStock }}</span>
                    <span class="badge badge-info">ROP: {{ rec.dynamicReorderPoint }}</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [ngClass]="rec.daysOfStockRemaining <= 3 ? 'badge-danger' : 'badge-warning'"
                    >
                      {{ rec.daysOfStockRemaining <= 0 ? 'Stocked Out' : (rec.daysOfStockRemaining + ' days left') }}
                    </span>
                  </td>
                  <td>
                    <strong class="text-primary">+{{ rec.recommendedOrderQuantity }} units</strong>
                  </td>
                  <td>{{ rec.estimatedOrderCost | currency }}</td>
                  <td>
                    <span class="text-sm font-bold">{{ rec.supplierName || 'Primary Supplier' }}</span>
                  </td>
                  <td *ngIf="auth.isAdmin() || auth.isManager()">
                    <button class="btn btn-sm btn-primary" (click)="quickReplenishFromForecast(rec)">
                      + Replenish
                    </button>
                  </td>
                </tr>

                <tr *ngIf="filteredRecommendations.length === 0">
                  <td colspan="10" class="text-center text-success py-4">
                    ✓ Optimal Inventory Health: No products matching selected urgency at risk!
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- VIEW B: Overstock / Capital Efficiency Table -->
        <div *ngIf="forecastSubView === 'overstock'" class="card table-card">
          <div class="card-header">
            <div>
              <h3>Overstocked Inventory & Capital Efficiency</h3>
              <p class="subtitle text-sm">Items with excessive inventory relative to sales burn rate (>60 days or dormant turnover)</p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Facility</th>
                  <th>Current Stock</th>
                  <th>Daily Burn Rate</th>
                  <th>Estimated Runway</th>
                  <th>Excess Quantity</th>
                  <th>Tied-Up Capital</th>
                  <th>Optimization Recommendation</th>
                  <th *ngIf="auth.isAdmin() || auth.isManager()">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of overstockAlerts">
                  <td>
                    <strong>{{ item.productName }}</strong>
                    <div class="code-badge">{{ item.productSKU }}</div>
                  </td>
                  <td>{{ item.warehouseName }}</td>
                  <td><strong>{{ item.currentStock }}</strong></td>
                  <td>{{ item.dailyBurnRate }} units/day</td>
                  <td>
                    <span class="badge badge-neutral">{{ item.daysOfStockRemaining }} days</span>
                  </td>
                  <td>
                    <strong class="text-danger">+{{ item.excessQuantity }} units</strong>
                  </td>
                  <td>
                    <strong class="text-warning">{{ item.capitalTiedUp | currency }}</strong>
                  </td>
                  <td>
                    <span class="text-sm text-muted">{{ item.recommendation }}</span>
                  </td>
                  <td *ngIf="auth.isAdmin() || auth.isManager()">
                    <button class="btn btn-sm btn-secondary" (click)="quickTransferOverstock(item)" title="Transfer excess to other warehouse">
                      🔄 Rebalance
                    </button>
                  </td>
                </tr>

                <tr *ngIf="overstockAlerts.length === 0">
                  <td colspan="9" class="text-center text-success py-4">
                    ✓ Excellent Capital Efficiency: No significantly overstocked or stagnant items detected.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 3: Stock Movement Ledger -->
      <div *ngIf="activeTab === 'movements'" class="tab-pane">
        <div class="card table-card">
          <div class="card-header">
            <h3>Audit Trail - Stock Movements Ledger</h3>
            <span class="badge badge-neutral">Tamper-Evident History</span>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Movement Type</th>
                  <th>Quantity Delta</th>
                  <th>Balance After</th>
                  <th>Reference #</th>
                  <th>Notes</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of movementsPaged?.items">
                  <td class="text-muted">{{ m.createdAt | date:'short' }}</td>
                  <td>
                    <strong>{{ m.productName }}</strong>
                    <div class="code-badge">{{ m.productSKU }}</div>
                  </td>
                  <td>{{ m.warehouseName }}</td>
                  <td>
                    <span class="badge" [ngClass]="getMovementBadgeClass(m.movementType)">
                      {{ m.movementType }}
                    </span>
                  </td>
                  <td>
                    <strong [ngClass]="m.quantity > 0 ? 'text-success' : 'text-danger'">
                      {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
                    </strong>
                  </td>
                  <td><strong>{{ m.balanceAfter }}</strong></td>
                  <td><span class="code-badge">{{ m.referenceNumber || 'N/A' }}</span></td>
                  <td class="text-sm text-muted">{{ m.notes || '-' }}</td>
                  <td>{{ m.createdByUserName }}</td>
                </tr>

                <tr *ngIf="movementsPaged?.items?.length === 0">
                  <td colspan="9" class="text-center text-muted py-4">
                    No movement records found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Stock Adjustment Modal -->
      <div *ngIf="showAdjustModal" class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Manual Stock Adjustment</h3>
            <button class="btn-close" (click)="closeModals()">×</button>
          </div>
          <form [formGroup]="adjustForm" (ngSubmit)="submitAdjustment()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Warehouse</label>
                <select class="form-control" formControlName="warehouseId">
                  <option value="" disabled>Select Warehouse</option>
                  <option *ngFor="let w of warehouses" [value]="w.id">{{ w.name }} ({{ w.code }})</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Product</label>
                <select class="form-control" formControlName="productId">
                  <option value="" disabled>Select Product</option>
                  <option *ngFor="let p of products" [value]="p.id">{{ p.name }} ({{ p.sku }})</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Quantity Delta (Positive to add, Negative to deduct)</label>
                <input
                  type="number"
                  class="form-control"
                  formControlName="adjustmentQuantity"
                  placeholder="e.g. 15 or -5"
                />
                <small class="text-muted">Enter positive number for received shipments, negative number for damaged/loss.</small>
              </div>

              <div class="form-group">
                <label class="form-label">Adjustment Reason / Reference</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="reason"
                  placeholder="e.g. Physical count reconciliation, supplier delivery"
                />
                <div *ngIf="af['reason'].touched && af['reason'].invalid" class="invalid-feedback">
                  Reason is required for audit trail compliance.
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModals()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="adjustForm.invalid || isSubmitting">
                {{ isSubmitting ? 'Processing...' : 'Apply Stock Adjustment' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Stock Transfer Modal -->
      <div *ngIf="showTransferModal" class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Inter-Warehouse Stock Transfer</h3>
            <button class="btn-close" (click)="closeModals()">×</button>
          </div>
          <form [formGroup]="transferForm" (ngSubmit)="submitTransfer()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Product to Transfer</label>
                <select class="form-control" formControlName="productId">
                  <option value="" disabled>Select Product</option>
                  <option *ngFor="let p of products" [value]="p.id">{{ p.name }} ({{ p.sku }})</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Source Warehouse</label>
                  <select class="form-control" formControlName="sourceWarehouseId">
                    <option value="" disabled>Origin</option>
                    <option *ngFor="let w of warehouses" [value]="w.id">{{ w.name }}</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Destination Warehouse</label>
                  <select class="form-control" formControlName="destinationWarehouseId">
                    <option value="" disabled>Destination</option>
                    <option *ngFor="let w of warehouses" [value]="w.id">{{ w.name }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Quantity to Transfer</label>
                <input type="number" min="1" class="form-control" formControlName="quantity" />
              </div>

              <div class="form-group">
                <label class="form-label">Transfer Notes / Reason</label>
                <input type="text" class="form-control" formControlName="notes" placeholder="e.g. Balancing West Coast stock" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModals()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="transferForm.invalid || isSubmitting">
                {{ isSubmitting ? 'Transferring...' : 'Execute Stock Transfer' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- PO DRAFT MODAL (PHASE 2) -->
      <div *ngIf="showPoModal && poDraft" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 780px;">
          <div class="modal-header">
            <div>
              <div class="d-flex align-center gap-2">
                <h3>Draft Purchase Order for Replenishment</h3>
                <span class="ai-badge-chip phase2">Phase 2 AI</span>
              </div>
              <p class="subtitle text-sm">Automated replenishment batch aggregated from predictive demand runway & burn rate</p>
            </div>
            <button class="btn-close" (click)="showPoModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="po-meta-banner p-3 mb-3" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                <div>
                  <span class="text-xs text-muted" style="display: block; font-size: 0.75rem;">PO REFERENCE</span>
                  <strong>{{ poDraft.poReferenceNumber }}</strong>
                </div>
                <div>
                  <span class="text-xs text-muted" style="display: block; font-size: 0.75rem;">TARGET FACILITY</span>
                  <strong>{{ poDraft.warehouseName }}</strong>
                </div>
                <div>
                  <span class="text-xs text-muted" style="display: block; font-size: 0.75rem;">EST. DELIVERY DATE</span>
                  <strong>{{ poDraft.estimatedDeliveryDate | date:'mediumDate' }}</strong>
                </div>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Order Qty</th>
                    <th>Unit Cost</th>
                    <th>Subtotal</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of poDraft.items">
                    <td><strong>{{ item.productName }}</strong></td>
                    <td><span class="code-badge">{{ item.productSKU }}</span></td>
                    <td><strong class="text-primary">+{{ item.quantityToOrder }} units</strong></td>
                    <td>{{ item.unitCostPrice | currency }}</td>
                    <td><strong>{{ item.totalCost | currency }}</strong></td>
                    <td>{{ item.supplierName }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="d-flex justify-between align-center p-3 mt-3" style="background: #f1f5f9; border-radius: var(--radius-sm);">
              <div>
                <span class="text-muted text-sm">Total Recommended Items: <strong>{{ poDraft.items.length }}</strong></span>
              </div>
              <div>
                <span class="text-muted text-sm mr-2" style="margin-right: 0.5rem;">Grand Total Estimated PO Cost:</span>
                <span class="font-bold text-success" style="font-size: 1.25rem;">{{ poDraft.grandTotalCost | currency }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="showPoModal = false">Close</button>
            <button type="button" class="btn btn-secondary" (click)="copyPoDraft()">
              📋 Copy PO Summary
            </button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="isSubmitting"
              (click)="confirmBatchReplenish()"
            >
              {{ isSubmitting ? 'Replenishing...' : '⚡ Confirm & Execute Batch Stock Replenishment' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; }
    .header-actions { display: flex; gap: 0.75rem; }

    .tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 0.25rem;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 0.75rem 1.25rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      transition: all 0.15s ease;
    }
    .tab-btn:hover { color: var(--primary); background: var(--primary-light); }
    .tab-btn.active {
      color: var(--primary);
      border-bottom: 3px solid var(--primary);
      margin-bottom: -0.3rem;
    }
    .tab-badge {
      background: var(--danger);
      color: #fff;
      font-size: 0.6875rem;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-full);
      font-weight: 700;
    }

    .warehouse-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .pill {
      background: #fff;
      border: 1px solid var(--border-color);
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .pill:hover { border-color: var(--primary); color: var(--primary); }
    .pill.active { background: var(--primary); border-color: var(--primary); color: #fff; }

    .table-card { padding: 0; overflow: hidden; }
    .avail-qty { font-size: 1rem; font-weight: 700; }
    .font-bold { font-weight: 700; }
    .text-sm { font-size: 0.8125rem; }
    .py-4 { padding-top: 2rem; padding-bottom: 2rem; }
    .form-row { display: flex; gap: 1rem; }
    .flex-1 { flex: 1; }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
    .ai-formula-banner {
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
      border: 1px solid #d8b4fe;
      border-radius: var(--radius-sm);
      padding: 0.85rem 1.25rem;
    }
    .formula-text { color: #581c87; }
    .formula-text code {
      background: rgba(255, 255, 255, 0.7);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: #6b21a8;
      border: 1px solid #e9d5ff;
    }
    .forecast-summary-table {
      margin: 0;
    }
    .metric-title-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .metric-title-cell .metric-icon {
      font-size: 1.35rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .row-critical {
      background-color: #fff1f2;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-xs { font-size: 0.75rem; }
    .text-danger { color: #dc2626; }
    .text-warning { color: #d97706; }
    .text-info { color: #0284c7; }
    .text-success { color: #16a34a; }
    .text-primary { color: #2563eb; }
    .text-md { font-size: 0.9rem; }
  `]
})
export class InventoryViewComponent implements OnInit {
  activeTab: 'stock' | 'alerts' | 'forecast' | 'movements' = 'stock';
  warehouses: Warehouse[] = [];
  products: Product[] = [];
  selectedWarehouseId: number | null = null;

  inventoryPaged: PagedResult<InventoryItem> | null = null;
  lowStockAlerts: LowStockAlert[] = [];
  movementsPaged: PagedResult<StockMovement> | null = null;

  // Phase 2: AI Forecasting Data
  forecastSummary: ProductForecastSummary | null = null;
  restockRecommendations: RestockRecommendation[] = [];
  overstockAlerts: OverstockAlert[] = [];
  forecastSubView: 'recommendations' | 'overstock' = 'recommendations';
  urgencyFilter: 'all' | 'critical' | 'advised' = 'all';

  showPoModal = false;
  isGeneratingPo = false;
  poDraft: RestockPoDraft | null = null;

  get filteredRecommendations(): RestockRecommendation[] {
    if (this.urgencyFilter === 'critical') {
      return this.restockRecommendations.filter(r => r.urgency === StockUrgencyLevel.Critical || r.daysOfStockRemaining <= 3);
    }
    if (this.urgencyFilter === 'advised') {
      return this.restockRecommendations.filter(r => r.urgency === StockUrgencyLevel.RestockAdvised);
    }
    return this.restockRecommendations;
  }

  showAdjustModal = false;
  showTransferModal = false;
  adjustForm: FormGroup;
  transferForm: FormGroup;
  isSubmitting = false;

  constructor(
    private api: InventoryApiService,
    public auth: AuthService,
    private notify: NotificationService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.adjustForm = this.fb.group({
      warehouseId: ['', [Validators.required]],
      productId: ['', [Validators.required]],
      adjustmentQuantity: [0, [Validators.required]],
      reason: ['', [Validators.required]]
    });

    this.transferForm = this.fb.group({
      productId: ['', [Validators.required]],
      sourceWarehouseId: ['', [Validators.required]],
      destinationWarehouseId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
  }

  get af() { return this.adjustForm.controls; }
  get tf() { return this.transferForm.controls; }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'forecast') {
        this.activeTab = 'forecast';
      } else if (params['lowStock']) {
        this.activeTab = 'alerts';
      }
    });

    this.loadLookups();
    this.loadInventories();
    this.loadLowStock();
    this.loadMovements();
    this.loadForecasting();
  }

  setTab(tab: 'stock' | 'alerts' | 'forecast' | 'movements') {
    this.activeTab = tab;
    if (tab === 'forecast') {
      this.loadForecasting();
    }
  }

  loadForecasting() {
    this.api.getForecastSummary(this.selectedWarehouseId || undefined).subscribe({
      next: (summary) => {
        this.forecastSummary = summary;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });

    this.api.getRestockRecommendations(this.selectedWarehouseId || undefined).subscribe({
      next: (recs) => {
        this.restockRecommendations = recs;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });

    this.api.getOverstockAlerts(this.selectedWarehouseId || undefined).subscribe({
      next: (alerts) => {
        this.overstockAlerts = alerts;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  quickReplenishFromForecast(rec: RestockRecommendation) {
    this.adjustForm.patchValue({
      warehouseId: rec.warehouseId,
      productId: rec.productId,
      adjustmentQuantity: rec.recommendedOrderQuantity,
      reason: `Replenishment order based on AI demand forecast (${rec.dailyBurnRate} units/day)`
    });
    this.showAdjustModal = true;
  }

  openPoDraftModal() {
    this.isGeneratingPo = true;
    this.api.generateRestockPoDraft({ warehouseId: this.selectedWarehouseId || undefined }).subscribe({
      next: (res) => {
        this.poDraft = res;
        this.showPoModal = true;
        this.isGeneratingPo = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isGeneratingPo = false;
        this.notify.danger('Restock PO', 'Error generating restock PO draft');
        this.cdr.markForCheck();
      }
    });
  }

  confirmBatchReplenish() {
    if (!this.poDraft || !this.poDraft.items.length) return;
    this.isSubmitting = true;
    let completed = 0;
    const total = this.poDraft.items.length;
    this.poDraft.items.forEach(item => {
      this.api.adjustStock({
        warehouseId: item.warehouseId,
        productId: item.productId,
        adjustmentQuantity: item.quantityToOrder,
        reason: `Automated replenishment from AI PO Draft ${this.poDraft?.poReferenceNumber}`
      }).subscribe({
        next: () => {
          completed++;
          if (completed === total) {
            this.isSubmitting = false;
            this.showPoModal = false;
            this.notify.success('Restock Executed', `Successfully replenished ${total} products via AI Restock Draft!`);
            this.loadForecasting();
            this.loadInventories();
            this.cdr.markForCheck();
          }
        },
        error: () => {
          completed++;
          if (completed === total) {
            this.isSubmitting = false;
            this.showPoModal = false;
            this.notify.warning('Restock Partially Executed', 'Batch replenishment finished with some partial records');
            this.loadForecasting();
            this.loadInventories();
            this.cdr.markForCheck();
          }
        }
      });
    });
  }

  copyPoDraft() {
    if (!this.poDraft) return;
    const summary = `PURCHASE ORDER: ${this.poDraft.poReferenceNumber}\nFacility: ${this.poDraft.warehouseName}\nSupplier: ${this.poDraft.supplierName}\nDelivery: ${this.poDraft.estimatedDeliveryDate}\nTotal Items: ${this.poDraft.items.length}\nGrand Total: $${this.poDraft.grandTotalCost.toFixed(2)}`;
    navigator.clipboard?.writeText(summary);
    this.notify.success('Copied', 'Copied PO summary to clipboard!');
  }

  quickTransferOverstock(item: OverstockAlert) {
    const destWarehouse = this.warehouses.find(w => w.id !== item.warehouseId);
    this.transferForm.patchValue({
      sourceWarehouseId: item.warehouseId,
      destinationWarehouseId: destWarehouse ? destWarehouse.id : '',
      productId: item.productId,
      quantity: Math.min(item.excessQuantity, 20),
      notes: `AI Rebalancing: Transfer excess overstock from ${item.warehouseName}`
    });
    this.showTransferModal = true;
  }

  loadLookups() {
    this.api.getWarehouses().subscribe(res => {
      this.warehouses = res;
      this.cdr.markForCheck();
    });
    this.api.getProducts({ pageSize: 100 }).subscribe(res => {
      this.products = res.items;
      this.cdr.markForCheck();
    });
  }

  filterWarehouse(wId: number | null) {
    this.selectedWarehouseId = wId;
    this.loadInventories();
  }

  loadInventories() {
    this.api.getInventories({
      warehouseId: this.selectedWarehouseId || undefined,
      pageSize: 50
    }).subscribe({
      next: (res) => {
        this.inventoryPaged = res;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  loadLowStock() {
    this.api.getLowStockAlerts().subscribe({
      next: (res) => {
        this.lowStockAlerts = res;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  loadMovements() {
    this.api.getStockMovements({ pageSize: 50 }).subscribe({
      next: (res) => {
        this.movementsPaged = res;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  openAdjustModal() {
    this.adjustForm.reset({
      warehouseId: this.warehouses[0]?.id || '',
      productId: this.products[0]?.id || '',
      adjustmentQuantity: 10,
      reason: 'Physical inventory audit'
    });
    this.showAdjustModal = true;
  }

  quickAdjust(item: InventoryItem) {
    this.adjustForm.patchValue({
      warehouseId: item.warehouseId,
      productId: item.productId,
      adjustmentQuantity: 5,
      reason: 'Safety stock increment'
    });
    this.showAdjustModal = true;
  }

  replenishStock(alert: LowStockAlert) {
    this.adjustForm.patchValue({
      warehouseId: alert.warehouseId,
      productId: alert.productId,
      adjustmentQuantity: alert.shortage + 15,
      reason: 'Automated low-stock threshold replenishment'
    });
    this.showAdjustModal = true;
  }

  openTransferModal() {
    this.transferForm.reset({
      productId: this.products[0]?.id || '',
      sourceWarehouseId: this.warehouses[0]?.id || '',
      destinationWarehouseId: this.warehouses[1]?.id || '',
      quantity: 5,
      notes: 'Inter-warehouse stock rebalance'
    });
    this.showTransferModal = true;
  }

  closeModals() {
    this.showAdjustModal = false;
    this.showTransferModal = false;
  }

  submitAdjustment() {
    if (this.adjustForm.invalid) return;

    this.isSubmitting = true;
    this.api.adjustStock(this.adjustForm.value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.notify.success('Stock Adjusted', 'Inventory updated and recorded in movement ledger.');
        this.closeModals();
        this.loadInventories();
        this.loadLowStock();
        this.loadMovements();
      },
      error: () => this.isSubmitting = false
    });
  }

  submitTransfer() {
    if (this.transferForm.invalid) return;

    this.isSubmitting = true;
    this.api.transferStock(this.transferForm.value).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.notify.success('Transferred', res.message || 'Stock transferred successfully.');
        this.closeModals();
        this.loadInventories();
        this.loadLowStock();
        this.loadMovements();
      },
      error: () => this.isSubmitting = false
    });
  }

  getMovementBadgeClass(type: string): string {
    switch (type) {
      case 'PurchaseReceive': return 'badge-success';
      case 'OrderFulfillment': return 'badge-danger';
      case 'OrderCancellationReturn': return 'badge-warning';
      case 'TransferIn': return 'badge-info';
      case 'TransferOut': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  }
}
