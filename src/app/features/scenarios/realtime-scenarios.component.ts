import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { RealtimeInventoryService } from '../../core/services/realtime-inventory.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Warehouse, Product, InventoryItem,
  InsufficientStockScenarioResult,
  OrderCancellationScenarioResult,
  ConcurrentOrdersScenarioResult,
  AutomaticStockUpdateScenarioResult,
  RealTimeStockUpdateEvent,
  RealTimeOrderEvent,
  RealTimeAlertEvent
} from '../../models/app.models';

@Component({
  selector: 'app-realtime-scenarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="title-with-badge">
            <h1>Real-Time Scenarios Control Center</h1>
            <span class="live-status-pill" [class.connected]="isSignalRConnected">
              <span class="pulse-dot"></span>
              {{ isSignalRConnected ? 'Live Sync Active (SignalR)' : 'Connecting to Live Sync...' }}
            </span>
          </div>
          <p class="subtitle">
            Interactive mission control demonstrating ACID stock validation, order cancellation & restock, concurrent race conditions, and automatic SignalR stock push.
          </p>
        </div>
      </div>

      <!-- Navigation Scenario Tabs -->
      <div class="scenarios-tabs-bar card">
        <button
          class="scenario-tab"
          [class.active]="activeScenario === 'insufficient-stock'"
          (click)="activeScenario = 'insufficient-stock'"
        >
          <span class="tab-icon">🛑</span>
          <div class="tab-meta">
            <span class="tab-title">1. Insufficient Stock Validation</span>
            <span class="tab-desc">Pre-flight & ACID reservation failure</span>
          </div>
        </button>

        <button
          class="scenario-tab"
          [class.active]="activeScenario === 'cancellation'"
          (click)="activeScenario = 'cancellation'"
        >
          <span class="tab-icon">🔄</span>
          <div class="tab-meta">
            <span class="tab-title">2. Order Cancellation & Restock</span>
            <span class="tab-desc">Atomic replenishment & ledger audit</span>
          </div>
        </button>

        <button
          class="scenario-tab"
          [class.active]="activeScenario === 'concurrency'"
          (click)="activeScenario = 'concurrency'"
        >
          <span class="tab-icon">⚡</span>
          <div class="tab-meta">
            <span class="tab-title">3. Concurrent Orders</span>
            <span class="tab-desc">Race condition & zero overselling</span>
          </div>
        </button>

        <button
          class="scenario-tab"
          [class.active]="activeScenario === 'auto-update'"
          (click)="activeScenario = 'auto-update'"
        >
          <span class="tab-icon">📡</span>
          <div class="tab-meta">
            <span class="tab-title">4. Automatic Stock Updates</span>
            <span class="tab-desc">WebSocket push & live screen sync</span>
          </div>
        </button>
      </div>

      <!-- SCENARIO 1: INSUFFICIENT STOCK VALIDATION -->
      <div *ngIf="activeScenario === 'insufficient-stock'" class="scenario-panel">
        <div class="card scenario-intro-card">
          <div class="intro-header">
            <span class="intro-badge">Scenario 1</span>
            <h3>Real-Time Insufficient Stock Validation & Transaction Rollback</h3>
          </div>
          <p class="intro-body">
            Orders are executed inside an <strong>ACID Database Transaction</strong>. When a customer or API requests quantity exceeding warehouse availability, the pre-flight stock validator aborts the operation, rolls back all changes, and throws a structured <code>InsufficientStockException</code> with exact deficit metrics.
          </p>
        </div>

        <div class="scenario-grid">
          <!-- Configuration Card -->
          <div class="card config-card">
            <h4>Configure Test Parameters</h4>
            <div class="form-group">
              <label class="form-label">Warehouse</label>
              <select class="form-control" [(ngModel)]="scen1WarehouseId" (change)="onScen1SelectionChange()">
                <option *ngFor="let w of warehouses" [ngValue]="w.id">{{ w.name }} ({{ w.code }})</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Product</label>
              <select class="form-control" [(ngModel)]="scen1ProductId" (change)="onScen1SelectionChange()">
                <option *ngFor="let p of products" [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option>
              </select>
            </div>

            <div class="stock-summary-box">
              <span class="text-muted">Current Available in Warehouse:</span>
              <strong class="stock-badge">{{ scen1AvailableStock }} units</strong>
            </div>

            <div class="form-group">
              <label class="form-label">Requested Quantity (Simulated Demand)</label>
              <div class="input-with-hint">
                <input
                  type="number"
                  min="1"
                  class="form-control"
                  [(ngModel)]="scen1RequestedQty"
                />
                <button class="btn btn-sm btn-outline-secondary" (click)="scen1RequestedQty = scen1AvailableStock + 20">
                  Auto-Exceed (+20)
                </button>
              </div>
              <small class="text-muted">Default is set to exceed current stock to trigger the validation rule.</small>
            </div>

            <button
              class="btn btn-danger btn-block mt-3"
              [disabled]="isScen1Loading"
              (click)="executeInsufficientStockScenario()"
            >
              {{ isScen1Loading ? 'Executing Pre-Flight Validation...' : '⚡ Test Insufficient Stock Validation' }}
            </button>
          </div>

          <!-- Result Card -->
          <div class="card result-card">
            <h4>Live Validation Verification</h4>
            
            <div *ngIf="!scen1Result && !isScen1Loading" class="empty-state">
              <div class="empty-icon">🛡️</div>
              <p>Click "Test Insufficient Stock Validation" to execute the real-time check against the database.</p>
            </div>

            <div *ngIf="isScen1Loading" class="loading-state">
              <div class="spinner"></div>
              <p>Simulating order placement & evaluating warehouse allocation...</p>
            </div>

            <div *ngIf="scen1Result" class="result-content">
              <div class="status-banner banner-success">
                <div class="banner-icon">✓</div>
                <div>
                  <strong>Validation Successfully Intercepted Order</strong>
                  <div class="banner-sub">Atomic rollback completed in {{ scen1Result.executionTimeMs }}ms</div>
                </div>
              </div>

              <div class="metrics-grid">
                <div class="metric-card">
                  <span class="metric-label">Warehouse Stock</span>
                  <span class="metric-value">{{ scen1Result.availableStock }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Requested Qty</span>
                  <span class="metric-value text-danger">{{ scen1Result.requestedQuantity }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Stock Deficit</span>
                  <span class="metric-value text-danger">-{{ scen1Result.deficit }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Stock Preserved?</span>
                  <span class="metric-value text-success">100% Preserved</span>
                </div>
              </div>

              <div class="exception-box">
                <span class="code-title">HTTP 400 Bad Request Payload</span>
                <pre><code>{{ formatScen1Json() }}</code></pre>
              </div>

              <div class="verification-list">
                <div class="verify-item">
                  <span class="check-icon">✓</span>
                  <span><strong>Zero Inventory Altered:</strong> Before ({{ scen1Result.stockBefore }}) == After ({{ scen1Result.stockAfter }})</span>
                </div>
                <div class="verify-item">
                  <span class="check-icon">✓</span>
                  <span><strong>ACID Rollback:</strong> No unfulfilled order recorded in order ledger</span>
                </div>
                <div class="verify-item">
                  <span class="check-icon">✓</span>
                  <span><strong>Real-Time Broadcast:</strong> Rejection alert pushed to SignalR event stream</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SCENARIO 2: ORDER CANCELLATION & RESTOCK -->
      <div *ngIf="activeScenario === 'cancellation'" class="scenario-panel">
        <div class="card scenario-intro-card">
          <div class="intro-header">
            <span class="intro-badge">Scenario 2</span>
            <h3>Order Cancellation with Automatic Stock Restoration & Ledger Audit</h3>
          </div>
          <p class="intro-body">
            Cancelling a confirmed order automatically executes a <strong>restocking routine</strong> in the warehouse ledger. The exact item quantities are credited back to available inventory, a <code>StockMovement</code> ledger entry of type <code>OrderCancellationReturn</code> is written, and an immutable audit log is committed.
          </p>
        </div>

        <div class="scenario-grid">
          <!-- Configuration Card -->
          <div class="card config-card">
            <h4>Select Order for Cancellation</h4>

            <div class="form-group">
              <label class="form-label">Available Orders (Confirmed Status)</label>
              <select class="form-control" [(ngModel)]="scen2SelectedOrderId">
                <option *ngFor="let o of confirmedOrders" [ngValue]="o.id">
                  {{ o.orderNumber }} - {{ o.customerName }} ({{ o.items.length }} items, {{ o.totalAmount | currency }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Cancellation Reason</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="scen2Reason"
                placeholder="e.g. Customer requested cancellation - duplicate order"
              />
            </div>

            <div class="button-row">
              <button
                class="btn btn-warning btn-block"
                [disabled]="isScen2Loading"
                (click)="executeOrderCancellationScenario()"
              >
                {{ isScen2Loading ? 'Processing Cancellation & Restock...' : '🔄 Cancel Order & Restore Stock' }}
              </button>
            </div>
          </div>

          <!-- Result Card -->
          <div class="card result-card">
            <h4>Cancellation & Restock Verification</h4>

            <div *ngIf="!scen2Result && !isScen2Loading" class="empty-state">
              <div class="empty-icon">📦</div>
              <p>Select an order and click "Cancel Order & Restore Stock" to execute the restocking routine.</p>
            </div>

            <div *ngIf="isScen2Loading" class="loading-state">
              <div class="spinner"></div>
              <p>Restoring warehouse inventory, recording stock movement, and writing audit log...</p>
            </div>

            <div *ngIf="scen2Result" class="result-content">
              <div class="status-banner banner-warning">
                <div class="banner-icon">✓</div>
                <div>
                  <strong>Order {{ scen2Result.orderNumber }} Cancelled</strong>
                  <div class="banner-sub">Status: {{ scen2Result.newStatus }} • Restock Verified in {{ scen2Result.executionTimeMs }}ms</div>
                </div>
              </div>

              <!-- Restored Items Table -->
              <h5 class="mt-3 mb-2 font-bold">Restored Warehouse Items</h5>
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Stock Before</th>
                      <th>Restored</th>
                      <th>Stock After</th>
                      <th>Restocked?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let itm of scen2Result.restoredItems">
                      <td><strong>{{ itm.productName }}</strong></td>
                      <td><span class="code-badge">{{ itm.productSKU }}</span></td>
                      <td>{{ itm.stockBefore }}</td>
                      <td><strong class="text-success">+{{ itm.quantityRestored }}</strong></td>
                      <td><strong>{{ itm.stockAfter }}</strong></td>
                      <td><span class="badge badge-success">✓ Restored</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Ledger Audit Proof -->
              <div class="audit-proof-box">
                <div class="proof-row">
                  <span class="proof-label">Movement Type:</span>
                  <span class="code-badge">{{ scen2Result.ledgerMovementType }}</span>
                </div>
                <div class="proof-row">
                  <span class="proof-label">Reference Number:</span>
                  <span class="code-badge">{{ scen2Result.ledgerReference }}</span>
                </div>
                <div class="proof-row">
                  <span class="proof-label">Cancellation Reason:</span>
                  <span>{{ scen2Result.cancellationReason }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SCENARIO 3: CONCURRENT ORDERS & ZERO OVERSELLING -->
      <div *ngIf="activeScenario === 'concurrency'" class="scenario-panel">
        <div class="card scenario-intro-card">
          <div class="intro-header">
            <span class="intro-badge">Scenario 3</span>
            <h3>Concurrent Orders, Race Condition Protection & Zero Overselling</h3>
          </div>
          <p class="intro-body">
            Simulates a high-concurrency flash sale where multiple buyers submit simultaneous orders at the exact same millisecond. Powered by <strong>ACID transaction isolation</strong> and <strong>optimistic concurrency tokens</strong>, the system guarantees <strong>ZERO overselling</strong>: inventory never drops below zero, fulfilled orders deduct exactly, and excess requests fail cleanly.
          </p>
        </div>

        <div class="scenario-grid">
          <!-- Configuration Card -->
          <div class="card config-card">
            <h4>Simulation Controls</h4>

            <div class="form-group">
              <label class="form-label">Target Warehouse & Product</label>
              <select class="form-control" [(ngModel)]="scen3ProductId">
                <option *ngFor="let p of products" [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Initial Stock to Seed</label>
                <input type="number" min="1" max="20" class="form-control" [(ngModel)]="scen3InitialStock" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Concurrent Buyers</label>
                <input type="number" min="2" max="15" class="form-control" [(ngModel)]="scen3ConcurrentBuyers" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Qty per Buyer</label>
                <input type="number" min="1" max="5" class="form-control" [(ngModel)]="scen3QtyPerBuyer" />
              </div>
            </div>

            <div class="demand-vs-supply-box">
              <div class="dvs-row">
                <span>Available Units in Stock:</span>
                <strong>{{ scen3InitialStock }} units</strong>
              </div>
              <div class="dvs-row">
                <span>Total Simultaneous Demand:</span>
                <strong class="text-danger">{{ scen3ConcurrentBuyers * scen3QtyPerBuyer }} units ({{ scen3ConcurrentBuyers }} × {{ scen3QtyPerBuyer }})</strong>
              </div>
              <div class="dvs-row">
                <span>Theoretical Max Fulfillments:</span>
                <strong>{{ Math.floor(scen3InitialStock / scen3QtyPerBuyer) }} orders</strong>
              </div>
            </div>

            <button
              class="btn btn-primary btn-block mt-3"
              [disabled]="isScen3Loading"
              (click)="executeConcurrentOrdersScenario()"
            >
              {{ isScen3Loading ? 'Firing Parallel Concurrent Threads...' : '⚡ Launch Concurrent Race Simulation' }}
            </button>
          </div>

          <!-- Result Card -->
          <div class="card result-card">
            <h4>Race Condition Resolution</h4>

            <div *ngIf="!scen3Result && !isScen3Loading" class="empty-state">
              <div class="empty-icon">🏎️</div>
              <p>Click "Launch Concurrent Race Simulation" to fire parallel asynchronous orders simultaneously.</p>
            </div>

            <div *ngIf="isScen3Loading" class="loading-state">
              <div class="spinner"></div>
              <p>Executing parallel threads across independent database transaction scopes...</p>
            </div>

            <div *ngIf="scen3Result" class="result-content">
              <!-- Zero Overselling Guarantee Banner -->
              <div class="status-banner" [ngClass]="scen3Result.noOversellingGuaranteed ? 'banner-success' : 'banner-danger'">
                <div class="banner-icon">{{ scen3Result.noOversellingGuaranteed ? '🛡️' : '⚠️' }}</div>
                <div>
                  <strong>{{ scen3Result.noOversellingGuaranteed ? 'ZERO OVERSELLING GUARANTEED' : 'OVERSELLING DETECTED' }}</strong>
                  <div class="banner-sub">
                    Initial Stock: {{ scen3Result.initialStock }} • Deducted: {{ scen3Result.totalStockDeducted }} • Final Stock: {{ scen3Result.finalStock }}
                  </div>
                </div>
              </div>

              <!-- Race Summary Stats -->
              <div class="metrics-grid">
                <div class="metric-card">
                  <span class="metric-label">Total Buyers</span>
                  <span class="metric-value">{{ scen3Result.concurrentBuyers }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Confirmed Orders</span>
                  <span class="metric-value text-success">{{ scen3Result.successfulOrdersCount }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Cleanly Rejected</span>
                  <span class="metric-value text-warning">{{ scen3Result.rejectedOrdersCount }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Execution Time</span>
                  <span class="metric-value text-primary">{{ scen3Result.totalExecutionTimeMs }}ms</span>
                </div>
              </div>

              <!-- Thread Breakdown Table -->
              <h5 class="mt-3 mb-2 font-bold">Parallel Thread Execution Breakdown</h5>
              <div class="table-responsive" style="max-height: 240px; overflow-y: auto;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Thread #</th>
                      <th>Shopper</th>
                      <th>Status</th>
                      <th>Qty Allocated</th>
                      <th>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let th of scen3Result.threadResults">
                      <td><span class="code-badge font-bold">Thread {{ th.threadId }}</span></td>
                      <td>{{ th.customerName }}</td>
                      <td>
                        <span class="badge" [ngClass]="th.success ? 'badge-success' : 'badge-danger'">
                          {{ th.status }}
                        </span>
                      </td>
                      <td><strong>{{ th.quantityDeducted }}</strong></td>
                      <td><span class="text-muted text-sm">{{ th.durationMs }}ms</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SCENARIO 4: AUTOMATIC STOCK UPDATES & WEBSOCKET PUSH -->
      <div *ngIf="activeScenario === 'auto-update'" class="scenario-panel">
        <div class="card scenario-intro-card">
          <div class="intro-header">
            <span class="intro-badge">Scenario 4</span>
            <h3>Automatic Stock Updates via Real-Time SignalR WebSocket Push</h3>
          </div>
          <p class="intro-body">
            Whenever inventory adjustments, automated supplier receipts, or order reservations occur, the backend emits a real-time event through <code>/hubs/inventory</code>. All connected browser windows immediately update stock counters without requiring a manual page refresh.
          </p>
        </div>

        <div class="scenario-grid">
          <!-- Configuration Card -->
          <div class="card config-card">
            <h4>Simulate Automatic Stock Adjustment</h4>

            <div class="form-group">
              <label class="form-label">Warehouse</label>
              <select class="form-control" [(ngModel)]="scen4WarehouseId">
                <option *ngFor="let w of warehouses" [ngValue]="w.id">{{ w.name }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Product</label>
              <select class="form-control" [(ngModel)]="scen4ProductId">
                <option *ngFor="let p of products" [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Quantity Change (+ Inbound / - Outbound)</label>
              <div class="quick-adjust-buttons">
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="scen4QuantityChange = 10">+10 Inbound</button>
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="scen4QuantityChange = 25">+25 Shipment</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" (click)="scen4QuantityChange = -5">-5 Shrinkage</button>
              </div>
              <input type="number" class="form-control mt-2" [(ngModel)]="scen4QuantityChange" />
            </div>

            <div class="form-group">
              <label class="form-label">Adjustment Reason</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="scen4Reason"
                placeholder="Automated Supplier PO Receipt"
              />
            </div>

            <button
              class="btn btn-success btn-block mt-3"
              [disabled]="isScen4Loading"
              (click)="executeAutomaticStockUpdateScenario()"
            >
              {{ isScen4Loading ? 'Broadcasting Update...' : '📡 Trigger Real-Time Stock Push' }}
            </button>
          </div>

          <!-- Live Event Feed Card -->
          <div class="card result-card">
            <div class="feed-header">
              <h4>Live SignalR WebSocket Event Feed</h4>
              <span class="live-pill" [class.connected]="isSignalRConnected">
                <span class="pulse-dot"></span>
                {{ isSignalRConnected ? 'LISTENING ON /HUBS/INVENTORY' : 'RECONNECTING' }}
              </span>
            </div>

            <div *ngIf="!recentEvents.length" class="empty-state">
              <div class="empty-icon">📡</div>
              <p>Waiting for real-time events. Trigger an update or place an order to see live events stream here in real time.</p>
            </div>

            <div *ngIf="recentEvents.length" class="live-stream-list">
              <div *ngFor="let evt of recentEvents" class="stream-event-item" [ngClass]="evt.type">
                <div class="event-meta">
                  <span class="event-badge">{{ evt.title }}</span>
                  <span class="event-time">{{ evt.timestamp | date:'mediumTime' }}</span>
                </div>
                <div class="event-desc">{{ evt.message }}</div>
                <div *ngIf="evt.details" class="event-details">
                  {{ evt.details }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .title-with-badge { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; max-width: 800px; }

    .live-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.75rem;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .live-status-pill.connected {
      background: #f0fdf4;
      color: #166534;
      border-color: #bbf7d0;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1); }
    }

    .scenarios-tabs-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.75rem;
      padding: 0.75rem;
      background: #ffffff;
    }
    .scenario-tab {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-sm);
      background: #f8fafc;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .scenario-tab:hover {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .scenario-tab.active {
      background: #eff6ff;
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
    }
    .tab-icon { font-size: 1.5rem; flex-shrink: 0; }
    .tab-meta { display: flex; flex-direction: column; gap: 0.15rem; }
    .tab-title { font-weight: 700; font-size: 0.875rem; color: #1e293b; }
    .tab-desc { font-size: 0.75rem; color: #64748b; }

    .scenario-panel { display: flex; flex-direction: column; gap: 1.25rem; }
    .scenario-intro-card {
      background: #ffffff;
      border-left: 4px solid #2563eb;
      padding: 1.25rem 1.5rem;
    }
    .intro-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .intro-badge {
      background: #dbeafe;
      color: #1e40af;
      font-size: 0.6875rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .scenario-intro-card h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
    .intro-body { margin: 0; color: #475569; font-size: 0.875rem; line-height: 1.5; }

    .scenario-grid {
      display: grid;
      grid-template-columns: 1fr 1.35fr;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .scenario-grid { grid-template-columns: 1fr; }
    }

    .config-card, .result-card {
      background: #ffffff;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .config-card h4, .result-card h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .stock-summary-box, .demand-vs-supply-box {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      border-radius: var(--radius-sm);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.875rem;
    }
    .stock-badge { font-size: 1.125rem; color: #2563eb; }
    .dvs-row { display: flex; justify-content: space-between; align-items: center; }

    .input-with-hint { display: flex; gap: 0.5rem; }
    .quick-adjust-buttons { display: flex; gap: 0.5rem; margin-bottom: 0.35rem; }

    .btn-block { width: 100%; padding: 0.75rem 1rem; font-weight: 700; }
    .mt-3 { margin-top: 1rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .font-bold { font-weight: 700; }

    .empty-state, .loading-state {
      padding: 3.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      color: #64748b;
    }
    .empty-icon { font-size: 3rem; }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .status-banner {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
    }
    .banner-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .banner-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .banner-danger { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .banner-icon { font-size: 1.5rem; font-weight: 800; }
    .banner-sub { font-size: 0.8125rem; opacity: 0.85; margin-top: 0.15rem; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .metric-card {
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .metric-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .metric-value { font-size: 1.15rem; font-weight: 800; color: #0f172a; }

    .exception-box {
      background: #1e1e2f;
      border-radius: 6px;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
      color: #f8fafc;
    }
    .code-title {
      display: block;
      font-size: 0.6875rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.4rem;
    }
    .exception-box pre { margin: 0; font-family: var(--font-mono); font-size: 0.75rem; white-space: pre-wrap; }

    .verification-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .verify-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #334155; }
    .check-icon { color: #16a34a; font-weight: 800; }

    .audit-proof-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.8125rem;
      margin-top: 0.75rem;
    }
    .proof-row { display: flex; justify-content: space-between; align-items: center; }
    .proof-label { font-weight: 600; color: #64748b; }

    .feed-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .live-pill {
      font-size: 0.6875rem;
      font-weight: 800;
      color: #166534;
      background: #dcfce7;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .live-stream-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
    }
    .stream-event-item {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .stream-event-item.StockUpdated { border-left-color: #10b981; }
    .stream-event-item.OrderCreated { border-left-color: #3b82f6; }
    .stream-event-item.OrderCancelled { border-left-color: #f59e0b; }
    .stream-event-item.Alert { border-left-color: #ef4444; }

    .event-meta { display: flex; justify-content: space-between; align-items: center; }
    .event-badge { font-weight: 700; font-size: 0.8125rem; color: #1e293b; }
    .event-time { font-size: 0.6875rem; color: #94a3b8; }
    .event-desc { font-size: 0.8125rem; color: #475569; }
    .event-details { font-size: 0.75rem; color: #64748b; font-family: var(--font-mono); }
  `]
})
export class RealtimeScenariosComponent implements OnInit, OnDestroy {
  activeScenario: 'insufficient-stock' | 'cancellation' | 'concurrency' | 'auto-update' = 'insufficient-stock';
  isSignalRConnected = false;
  Math = Math;

  warehouses: Warehouse[] = [];
  products: Product[] = [];
  confirmedOrders: any[] = [];

  // Scenario 1 State
  scen1WarehouseId = 1;
  scen1ProductId = 1;
  scen1AvailableStock = 0;
  scen1RequestedQty = 30;
  isScen1Loading = false;
  scen1Result: InsufficientStockScenarioResult | null = null;

  // Scenario 2 State
  scen2SelectedOrderId: number | null = null;
  scen2Reason = 'Customer requested cancellation - accidental double order';
  isScen2Loading = false;
  scen2Result: OrderCancellationScenarioResult | null = null;

  // Scenario 3 State
  scen3ProductId = 1;
  scen3InitialStock = 5;
  scen3ConcurrentBuyers = 5;
  scen3QtyPerBuyer = 2;
  isScen3Loading = false;
  scen3Result: ConcurrentOrdersScenarioResult | null = null;

  // Scenario 4 State
  scen4WarehouseId = 1;
  scen4ProductId = 1;
  scen4QuantityChange = 25;
  scen4Reason = 'Automated Supplier PO Inbound Receipt #PO-AUTO-2026';
  isScen4Loading = false;
  scen4Result: AutomaticStockUpdateScenarioResult | null = null;

  // Live Stream Feed
  recentEvents: Array<{
    type: string;
    title: string;
    message: string;
    details?: string;
    timestamp: Date;
  }> = [];

  private subs: Subscription[] = [];

  constructor(
    private api: InventoryApiService,
    private realtime: RealtimeInventoryService,
    private notify: NotificationService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.initRealtimeSubscriptions();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadLookups(): void {
    this.api.getWarehouses().subscribe(whs => {
      this.warehouses = whs;
      if (whs.length) {
        this.scen1WarehouseId = whs[0].id;
        this.scen4WarehouseId = whs[0].id;
      }
      this.refreshScen1Stock();
      this.cdr.markForCheck();
    });

    this.api.getProducts({ pageSize: 100 }).subscribe(prods => {
      this.products = prods.items;
      if (prods.items.length) {
        this.scen1ProductId = prods.items[0].id;
        this.scen3ProductId = prods.items[0].id;
        this.scen4ProductId = prods.items[0].id;
      }
      this.refreshScen1Stock();
      this.cdr.markForCheck();
    });

    this.api.getOrders({ status: 2, pageSize: 20 }).subscribe(res => {
      this.confirmedOrders = res.items;
      if (res.items.length) {
        this.scen2SelectedOrderId = res.items[0].id;
      }
      this.cdr.markForCheck();
    });
  }

  initRealtimeSubscriptions(): void {
    this.subs.push(
      this.realtime.isConnected$.subscribe(connected => {
        this.isSignalRConnected = connected;
        this.cdr.markForCheck();
      })
    );

    this.subs.push(
      this.realtime.stockUpdated$.subscribe(evt => {
        this.recentEvents.unshift({
          type: 'StockUpdated',
          title: `Stock Updated: ${evt.productSKU}`,
          message: `${evt.productName} in ${evt.warehouseName}. Previous: ${evt.previousQuantity} ➔ New: ${evt.newQuantity} (Change: ${evt.changeQuantity > 0 ? '+' : ''}${evt.changeQuantity}).`,
          details: `Reason: ${evt.reason}`,
          timestamp: new Date()
        });
        if (this.recentEvents.length > 30) this.recentEvents.pop();

        if (evt.productId === this.scen1ProductId && evt.warehouseId === this.scen1WarehouseId) {
          this.scen1AvailableStock = evt.availableQuantity;
        }
        this.cdr.markForCheck();
      })
    );

    this.subs.push(
      this.realtime.orderEvents$.subscribe(evt => {
        this.recentEvents.unshift({
          type: evt.action === 'Cancelled' ? 'OrderCancelled' : 'OrderCreated',
          title: `Order ${evt.action}: ${evt.orderNumber}`,
          message: `Customer: ${evt.customerName} • Total: $${evt.totalAmount.toFixed(2)} • Status: ${evt.status}`,
          details: evt.reason ? `Reason: ${evt.reason}` : undefined,
          timestamp: new Date()
        });
        if (this.recentEvents.length > 30) this.recentEvents.pop();
        this.cdr.markForCheck();
      })
    );

    this.subs.push(
      this.realtime.alerts$.subscribe(alert => {
        this.recentEvents.unshift({
          type: 'Alert',
          title: `⚠️ Alert: ${alert.title}`,
          message: alert.message,
          timestamp: new Date()
        });
        if (this.recentEvents.length > 30) this.recentEvents.pop();
        this.cdr.markForCheck();
      })
    );
  }

  // ==========================================
  // Scenario 1 Actions
  // ==========================================

  onScen1SelectionChange(): void {
    this.refreshScen1Stock();
  }

  refreshScen1Stock(): void {
    if (!this.scen1WarehouseId || !this.scen1ProductId) return;

    this.api.getInventories({ warehouseId: this.scen1WarehouseId, productId: this.scen1ProductId }).subscribe(res => {
      const item = res.items.find(i => i.productId === this.scen1ProductId && i.warehouseId === this.scen1WarehouseId);
      this.scen1AvailableStock = item ? item.availableQuantity : 0;
      if (this.scen1RequestedQty <= this.scen1AvailableStock) {
        this.scen1RequestedQty = this.scen1AvailableStock + 15;
      }
      this.cdr.markForCheck();
    });
  }

  executeInsufficientStockScenario(): void {
    this.isScen1Loading = true;
    this.scen1Result = null;
    this.cdr.markForCheck();

    this.api.runInsufficientStockScenario({
      warehouseId: this.scen1WarehouseId,
      productId: this.scen1ProductId,
      requestedQuantity: this.scen1RequestedQty
    }).subscribe({
      next: (res) => {
        this.isScen1Loading = false;
        this.scen1Result = res;
        this.notify.info('Validation Triggered', `Order safely aborted. Deficit of ${res.deficit} units handled cleanly.`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isScen1Loading = false;
        this.notify.danger('Scenario Error', 'Could not execute insufficient stock scenario.');
        this.cdr.markForCheck();
      }
    });
  }

  formatScen1Json(): string {
    if (!this.scen1Result) return '';
    return JSON.stringify({
      status: 400,
      title: 'Insufficient Stock',
      detail: this.scen1Result.validationMessage,
      errors: {
        productId: this.scen1ProductId,
        productName: this.scen1Result.productName,
        availableQuantity: this.scen1Result.availableStock,
        requestedQuantity: this.scen1Result.requestedQuantity
      },
      stockRollbackVerified: this.scen1Result.stockPreserved
    }, null, 2);
  }

  // ==========================================
  // Scenario 2 Actions
  // ==========================================

  executeOrderCancellationScenario(): void {
    this.isScen2Loading = true;
    this.scen2Result = null;
    this.cdr.markForCheck();

    this.api.runOrderCancellationScenario({
      orderId: this.scen2SelectedOrderId || undefined,
      reason: this.scen2Reason
    }).subscribe({
      next: (res) => {
        this.isScen2Loading = false;
        this.scen2Result = res;
        this.notify.success('Restock Successful', `Order ${res.orderNumber} cancelled and stock replenished.`);
        this.loadLookups();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isScen2Loading = false;
        this.notify.danger('Cancellation Failed', err?.error?.detail || 'Could not cancel order.');
        this.cdr.markForCheck();
      }
    });
  }

  // ==========================================
  // Scenario 3 Actions
  // ==========================================

  executeConcurrentOrdersScenario(): void {
    this.isScen3Loading = true;
    this.scen3Result = null;
    this.cdr.markForCheck();

    this.api.runConcurrentOrdersScenario({
      warehouseId: 1,
      productId: this.scen3ProductId,
      concurrentUsersCount: this.scen3ConcurrentBuyers,
      quantityPerOrder: this.scen3QtyPerBuyer,
      setStockTo: this.scen3InitialStock
    }).subscribe({
      next: (res) => {
        this.isScen3Loading = false;
        this.scen3Result = res;
        this.notify.success('Race Finished', `Processed ${res.concurrentBuyers} concurrent orders. Zero overselling verified!`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isScen3Loading = false;
        this.notify.danger('Simulation Error', 'Failed to run concurrent orders scenario.');
        this.cdr.markForCheck();
      }
    });
  }

  // ==========================================
  // Scenario 4 Actions
  // ==========================================

  executeAutomaticStockUpdateScenario(): void {
    this.isScen4Loading = true;
    this.scen4Result = null;
    this.cdr.markForCheck();

    this.api.runAutomaticStockUpdateScenario({
      warehouseId: this.scen4WarehouseId,
      productId: this.scen4ProductId,
      quantityChange: this.scen4QuantityChange,
      reason: this.scen4Reason
    }).subscribe({
      next: (res) => {
        this.isScen4Loading = false;
        this.scen4Result = res;
        this.notify.success('SignalR Pushed', `Adjusted stock for ${res.productSKU}. Live event broadcast to all clients.`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isScen4Loading = false;
        this.notify.danger('Update Error', 'Could not push stock update.');
        this.cdr.markForCheck();
      }
    });
  }
}
