import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  Order, Warehouse, Product, InventoryItem,
  PagedResult, OrderStatus
} from '../../models/app.models';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Customer Orders</h1>
          <p class="subtitle">Order placement with ACID stock reservation, status tracking, and stock-restoring cancellation</p>
        </div>
        <button
          *ngIf="auth.isAdmin() || auth.isSales() || auth.isManager()"
          (click)="openCreateOrderModal()"
          class="btn btn-primary"
        >
          <span>+</span> Create New Order
        </button>
      </div>

      <!-- Filters & Status Tabs -->
      <div class="card toolbar-card">
        <div class="status-pills">
          <button class="pill" [class.active]="selectedStatus === null" (click)="filterStatus(null)">
            All Statuses
          </button>
          <button class="pill" [class.active]="selectedStatus === 1" (click)="filterStatus(1)">
            Pending
          </button>
          <button class="pill" [class.active]="selectedStatus === 2" (click)="filterStatus(2)">
            Confirmed (Stock Deducted)
          </button>
          <button class="pill" [class.active]="selectedStatus === 3" (click)="filterStatus(3)">
            Shipped
          </button>
          <button class="pill" [class.active]="selectedStatus === 4" (click)="filterStatus(4)">
            Delivered
          </button>
          <button class="pill" [class.active]="selectedStatus === 5" (click)="filterStatus(5)">
            Cancelled (Stock Restored)
          </button>
        </div>

        <div class="filter-row">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="form-control"
              placeholder="Search by Order #, Customer Name or Email..."
              [(ngModel)]="searchTerm"
              (keyup.enter)="loadOrders()"
            />
          </div>

          <div class="filter-select">
            <select class="form-control" [(ngModel)]="selectedWarehouseId" (change)="loadOrders()">
              <option [ngValue]="null">All Warehouses</option>
              <option *ngFor="let w of warehouses" [ngValue]="w.id">{{ w.name }}</option>
            </select>
          </div>

          <button class="btn btn-secondary" (click)="loadOrders()">
            Filter
          </button>
        </div>
      </div>

      <!-- Orders Table -->
      <div class="card table-card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Order Date</th>
                <th>Customer</th>
                <th>Fulfillment Hub</th>
                <th>Item Count</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of ordersPaged?.items">
                <td>
                  <span class="code-badge font-bold">{{ o.orderNumber }}</span>
                </td>
                <td class="text-muted">{{ o.orderDate | date:'mediumDate' }}</td>
                <td>
                  <div class="customer-name">{{ o.customerName }}</div>
                  <small class="text-muted">{{ o.customerEmail }}</small>
                </td>
                <td>{{ o.warehouseName }}</td>
                <td>{{ o.items.length }} items</td>
                <td><strong>{{ o.totalAmount | currency }}</strong></td>
                <td>
                  <span class="badge" [ngClass]="getStatusBadgeClass(o.status)">
                    {{ o.statusName }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-sm btn-secondary" (click)="viewOrder(o)">
                      Details
                    </button>
                    <button
                      *ngIf="(o.status === 1 || o.status === 2) && (auth.isAdmin() || auth.isSales() || auth.isManager())"
                      class="btn btn-sm btn-danger"
                      (click)="cancelOrderPrompt(o)"
                    >
                      Cancel & Restore Stock
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="ordersPaged?.items?.length === 0">
                <td colspan="8" class="text-center text-muted py-4">
                  No customer orders found matching your search criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CREATE ORDER MODAL -->
      <div *ngIf="showCreateModal" class="modal-backdrop">
        <div class="modal-dialog modal-dialog-lg">
          <div class="modal-header">
            <h3>Create Customer Order</h3>
            <button class="btn-close" (click)="closeModals()">×</button>
          </div>

          <form [formGroup]="orderForm" (ngSubmit)="submitOrder()">
            <div class="modal-body">
              <!-- Customer Info -->
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Customer Name *</label>
                  <input type="text" class="form-control" formControlName="customerName" placeholder="Acme Global Inc" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Customer Email *</label>
                  <input type="email" class="form-control" formControlName="customerEmail" placeholder="orders@acmeglobal.com" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Phone</label>
                  <input type="text" class="form-control" formControlName="customerPhone" placeholder="+1-555-0199" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-2">
                  <label class="form-label">Shipping Address *</label>
                  <input type="text" class="form-control" formControlName="shippingAddress" placeholder="100 Commercial Way, Suite 400" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Fulfillment Warehouse *</label>
                  <select class="form-control" formControlName="warehouseId" (change)="onWarehouseChange()">
                    <option value="" disabled>Select Warehouse</option>
                    <option *ngFor="let w of warehouses" [value]="w.id">{{ w.name }} ({{ w.code }})</option>
                  </select>
                </div>
              </div>

              <!-- Order Line Items -->
              <div class="order-items-section">
                <div class="items-header">
                  <h4>Order Items</h4>
                  <button type="button" class="btn btn-sm btn-secondary" (click)="addItem()">
                    + Add Item
                  </button>
                </div>

                <div formArrayName="items" class="items-list">
                  <div *ngFor="let itemGroup of itemsArray.controls; let idx = index" [formGroupName]="idx" class="item-row">
                    <div class="form-group flex-2">
                      <label class="form-label">Product</label>
                      <select class="form-control" formControlName="productId">
                        <option value="" disabled>Select Product</option>
                        <option *ngFor="let p of products" [value]="p.id">
                          {{ p.name }} ({{ p.sku }}) - {{ p.price | currency }}
                        </option>
                      </select>
                    </div>

                    <div class="form-group flex-1">
                      <label class="form-label">Available In Warehouse</label>
                      <div class="stock-indicator">
                        <span class="badge" [ngClass]="getAvailableStock(itemGroup.get('productId')?.value) > 0 ? 'badge-success' : 'badge-danger'">
                          {{ getAvailableStock(itemGroup.get('productId')?.value) }} units available
                        </span>
                      </div>
                    </div>

                    <div class="form-group flex-1">
                      <label class="form-label">Quantity</label>
                      <input type="number" min="1" class="form-control" formControlName="quantity" />
                    </div>

                    <button type="button" class="btn-remove-item" (click)="removeItem(idx)" title="Remove item">
                      ✕
                    </button>
                  </div>
                </div>

                <div class="order-estimated-total">
                  <span>Estimated Total:</span>
                  <strong>{{ calculateEstimatedTotal() | currency }}</strong>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModals()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="orderForm.invalid || isSubmitting">
                {{ isSubmitting ? 'Validating Stock & Reserving...' : 'Confirm Order & Deduct Stock' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ORDER DETAILS MODAL -->
      <div *ngIf="showDetailsModal && selectedOrder" class="modal-backdrop">
        <div class="modal-dialog modal-dialog-lg">
          <div class="modal-header">
            <div>
              <h3>Order {{ selectedOrder.orderNumber }}</h3>
              <span class="badge" [ngClass]="getStatusBadgeClass(selectedOrder.status)">
                {{ selectedOrder.statusName }}
              </span>
            </div>
            <button class="btn-close" (click)="closeModals()">×</button>
          </div>

          <div class="modal-body">
            <div class="details-grid">
              <div class="detail-card">
                <span class="detail-label">Customer</span>
                <strong>{{ selectedOrder.customerName }}</strong>
                <span class="text-muted text-sm">{{ selectedOrder.customerEmail }}</span>
                <span class="text-muted text-sm">{{ selectedOrder.customerPhone || 'No phone' }}</span>
              </div>
              <div class="detail-card">
                <span class="detail-label">Shipping Address</span>
                <div>{{ selectedOrder.shippingAddress }}</div>
              </div>
              <div class="detail-card">
                <span class="detail-label">Fulfillment Facility</span>
                <strong>{{ selectedOrder.warehouseName }}</strong>
                <span class="text-muted text-sm">Placed on {{ selectedOrder.orderDate | date:'medium' }}</span>
              </div>
            </div>

            <!-- Items Table -->
            <h4 class="mt-4 mb-2">Ordered Items</h4>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let itm of selectedOrder.items">
                    <td><span class="code-badge">{{ itm.productSKU }}</span></td>
                    <td>{{ itm.productName }}</td>
                    <td><strong>{{ itm.quantity }}</strong></td>
                    <td>{{ itm.unitPrice | currency }}</td>
                    <td><strong>{{ itm.subTotal | currency }}</strong></td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" class="text-right"><strong>Grand Total:</strong></td>
                    <td><strong class="text-primary">{{ selectedOrder.totalAmount | currency }}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Status Advance Controls -->
            <div *ngIf="selectedOrder.status !== 4 && selectedOrder.status !== 5" class="status-advance-bar">
              <span>Advance Status:</span>
              <button
                *ngIf="selectedOrder.status === 2"
                class="btn btn-sm btn-info"
                (click)="advanceStatus(3)"
              >
                Mark as Shipped 🚚
              </button>
              <button
                *ngIf="selectedOrder.status === 3"
                class="btn btn-sm btn-success"
                (click)="advanceStatus(4)"
              >
                Mark as Delivered ✓
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button
              *ngIf="(selectedOrder.status === 1 || selectedOrder.status === 2) && (auth.isAdmin() || auth.isSales() || auth.isManager())"
              class="btn btn-danger mr-auto"
              (click)="cancelOrderPrompt(selectedOrder)"
            >
              Cancel Order & Restore Stock
            </button>
            <button type="button" class="btn btn-secondary" (click)="closeModals()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; }

    .toolbar-card { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; }
    .status-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .pill {
      background: #f8fafc;
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

    .filter-row { display: flex; gap: 1rem; align-items: center; }
    .search-box { flex: 2; position: relative; }
    .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); }
    .search-box .form-control { padding-left: 2.25rem; }
    .filter-select { flex: 1; }

    .table-card { padding: 0; overflow: hidden; }
    .customer-name { font-weight: 600; }
    .action-buttons { display: flex; gap: 0.5rem; }
    .py-4 { padding-top: 2rem; padding-bottom: 2rem; }

    .form-row { display: flex; gap: 1rem; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }

    .order-items-section {
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-color);
    }
    .items-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .items-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .item-row {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
    }
    .stock-indicator { height: 38px; display: flex; align-items: center; }
    .btn-remove-item {
      background: #fee2e2;
      border: none;
      color: var(--danger);
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: bold;
    }
    .btn-remove-item:hover { background: var(--danger); color: #fff; }

    .order-estimated-total {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      font-size: 1.125rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--border-color);
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .detail-card {
      background: #f8fafc;
      padding: 1rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .detail-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
    .text-sm { font-size: 0.8125rem; }
    .mt-4 { margin-top: 1.5rem; }
    .mb-2 { margin-bottom: 0.75rem; }
    .text-right { text-align: right; }
    .text-primary { color: var(--primary); }
    .mr-auto { margin-right: auto; }

    .status-advance-bar {
      margin-top: 1.25rem;
      padding: 0.875rem 1rem;
      background: #eff6ff;
      border-radius: var(--radius-sm);
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
  `]
})
export class OrdersListComponent implements OnInit {
  ordersPaged: PagedResult<Order> | null = null;
  warehouses: Warehouse[] = [];
  products: Product[] = [];
  warehouseInventoryMap = new Map<number, number>(); // productId -> availableQuantity

  selectedStatus: number | null = null;
  selectedWarehouseId: number | null = null;
  searchTerm = '';

  showCreateModal = false;
  showDetailsModal = false;
  selectedOrder: Order | null = null;
  orderForm: FormGroup;
  isSubmitting = false;

  constructor(
    private api: InventoryApiService,
    public auth: AuthService,
    private notify: NotificationService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.orderForm = this.fb.group({
      customerName: ['', [Validators.required]],
      customerEmail: ['', [Validators.required, Validators.email]],
      customerPhone: [''],
      shippingAddress: ['', [Validators.required]],
      warehouseId: ['', [Validators.required]],
      items: this.fb.array([])
    });
  }

  get itemsArray(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  ngOnInit() {
    this.loadLookups();
    this.loadOrders();
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

  loadOrders() {
    this.api.getOrders({
      status: this.selectedStatus || undefined,
      warehouseId: this.selectedWarehouseId || undefined,
      searchTerm: this.searchTerm || undefined,
      pageSize: 50
    }).subscribe({
      next: (res) => {
        this.ordersPaged = res;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  filterStatus(status: number | null) {
    this.selectedStatus = status;
    this.loadOrders();
  }

  openCreateOrderModal() {
    this.orderForm.reset({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      shippingAddress: '',
      warehouseId: this.warehouses[0]?.id || ''
    });
    this.itemsArray.clear();
    this.addItem();
    this.onWarehouseChange();
    this.showCreateModal = true;
  }

  addItem() {
    const itemGroup = this.fb.group({
      productId: [this.products[0]?.id || '', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number) {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  onWarehouseChange() {
    const whId = this.orderForm.get('warehouseId')?.value;
    if (!whId) return;

    this.api.getInventories({ warehouseId: whId, pageSize: 100 }).subscribe(res => {
      this.warehouseInventoryMap.clear();
      res.items.forEach(inv => {
        this.warehouseInventoryMap.set(inv.productId, inv.availableQuantity);
      });
    });
  }

  getAvailableStock(productId: number): number {
    return this.warehouseInventoryMap.get(productId) || 0;
  }

  calculateEstimatedTotal(): number {
    let total = 0;
    this.itemsArray.controls.forEach(control => {
      const pId = control.get('productId')?.value;
      const qty = control.get('quantity')?.value || 0;
      const prod = this.products.find(p => p.id === Number(pId));
      if (prod) {
        total += prod.price * qty;
      }
    });
    return total;
  }

  submitOrder() {
    if (this.orderForm.invalid) return;

    // Pre-validate UI quantities against available stock
    for (const ctrl of this.itemsArray.controls) {
      const pId = ctrl.get('productId')?.value;
      const qty = ctrl.get('quantity')?.value;
      const avail = this.getAvailableStock(Number(pId));
      if (qty > avail) {
        const prod = this.products.find(p => p.id === Number(pId));
        this.notify.danger('Insufficient Stock', `Requested ${qty} of '${prod?.name || 'product'}', but only ${avail} available.`);
        return;
      }
    }

    this.isSubmitting = true;
    this.api.createOrder(this.orderForm.value).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.notify.success('Order Confirmed', `Order ${created.orderNumber} placed and warehouse stock deducted.`);
        this.closeModals();
        this.loadOrders();
      },
      error: () => this.isSubmitting = false
    });
  }

  viewOrder(order: Order) {
    this.selectedOrder = order;
    this.showDetailsModal = true;
  }

  advanceStatus(newStatus: number) {
    if (!this.selectedOrder) return;

    this.api.updateOrderStatus(this.selectedOrder.id, newStatus).subscribe({
      next: (updated) => {
        this.selectedOrder = updated;
        this.notify.success('Status Updated', `Order marked as ${updated.statusName}.`);
        this.loadOrders();
      }
    });
  }

  cancelOrderPrompt(order: Order) {
    const reason = prompt(`Reason for cancelling order ${order.orderNumber}? (Stock will be automatically returned to inventory):`);
    if (reason === null) return; // user cancelled prompt

    this.api.cancelOrder(order.id, reason || 'Customer cancellation').subscribe({
      next: (cancelled) => {
        this.notify.warning('Order Cancelled', `Order ${cancelled.orderNumber} cancelled. Reserved stock restored to warehouse.`);
        this.closeModals();
        this.loadOrders();
      }
    });
  }

  closeModals() {
    this.showCreateModal = false;
    this.showDetailsModal = false;
    this.selectedOrder = null;
  }

  getStatusBadgeClass(status: number): string {
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
