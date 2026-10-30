import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  InventoryItem, Warehouse, Product, LowStockAlert,
  StockMovement, PagedResult
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
  `]
})
export class InventoryViewComponent implements OnInit {
  activeTab: 'stock' | 'alerts' | 'movements' = 'stock';
  warehouses: Warehouse[] = [];
  products: Product[] = [];
  selectedWarehouseId: number | null = null;

  inventoryPaged: PagedResult<InventoryItem> | null = null;
  lowStockAlerts: LowStockAlert[] = [];
  movementsPaged: PagedResult<StockMovement> | null = null;

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
      if (params['lowStock']) {
        this.activeTab = 'alerts';
      }
    });

    this.loadLookups();
    this.loadInventories();
    this.loadLowStock();
    this.loadMovements();
  }

  setTab(tab: 'stock' | 'alerts' | 'movements') {
    this.activeTab = tab;
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
