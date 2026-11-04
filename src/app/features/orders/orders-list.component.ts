import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  Order, Warehouse, Product, InventoryItem,
  PagedResult, OrderStatus, ExtractedOrderDocument, ExtractedLineItem, SampleDocumentOption
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
        <div class="header-actions">
          <button
            *ngIf="auth.isAdmin() || auth.isSales() || auth.isManager()"
            (click)="openAiImportModal()"
            class="btn btn-ai-import"
          >
            <span class="ai-sparkle">✨</span>
            <span>Import from Invoice / PO</span>
            <span class="ai-badge-chip">Phase 1 AI</span>
          </button>

          <button
            *ngIf="auth.isAdmin() || auth.isSales() || auth.isManager()"
            (click)="openCreateOrderModal()"
            class="btn btn-primary"
          >
            <span>+</span> Create New Order
          </button>
        </div>
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
                <td>{{ o.orderDate | date:'mediumDate' }}</td>
                <td>
                  <div class="customer-name">{{ o.customerName }}</div>
                  <div class="text-muted text-sm">{{ o.customerEmail }}</div>
                </td>
                <td>{{ o.warehouseName }}</td>
                <td>{{ o.items?.length || 0 }} items</td>
                <td><strong>{{ o.totalAmount | currency }}</strong></td>
                <td>
                  <span class="badge" [ngClass]="getStatusBadgeClass(o.status)">
                    {{ o.statusName }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-secondary" (click)="viewOrder(o)">
                      Details
                    </button>
                    <button
                      *ngIf="(o.status === 1 || o.status === 2) && (auth.isAdmin() || auth.isSales() || auth.isManager())"
                      class="btn btn-sm btn-outline-danger"
                      (click)="cancelOrderPrompt(o)"
                    >
                      Cancel & Restore Stock
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!ordersPaged?.items?.length">
                <td colspan="8" class="text-center py-4 text-muted">
                  No orders found matching the filter criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CREATE ORDER MODAL (STANDARD) -->
      <div *ngIf="showCreateModal" class="modal-backdrop">
        <div class="modal-dialog modal-dialog-lg">
          <div class="modal-header">
            <h3>Create Customer Order</h3>
            <button class="btn-close" (click)="closeModals()">×</button>
          </div>

          <form [formGroup]="orderForm" (ngSubmit)="submitOrder()">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Customer Name *</label>
                  <input type="text" class="form-control" formControlName="customerName" placeholder="Acme Corp" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Customer Email *</label>
                  <input type="email" class="form-control" formControlName="customerEmail" placeholder="orders@acme.com" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Phone</label>
                  <input type="text" class="form-control" formControlName="customerPhone" placeholder="+1-555-0199" />
                </div>
                <div class="form-group flex-2">
                  <label class="form-label">Fulfillment Warehouse *</label>
                  <select class="form-control" formControlName="warehouseId" (change)="onWarehouseChange()">
                    <option *ngFor="let w of warehouses" [value]="w.id">{{ w.name }} ({{ w.code }})</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Shipping Address *</label>
                <textarea class="form-control" rows="2" formControlName="shippingAddress" placeholder="Street, City, State, ZIP"></textarea>
              </div>

              <!-- Line Items -->
              <div class="order-items-section">
                <div class="items-header">
                  <h4>Order Items</h4>
                  <button type="button" class="btn btn-sm btn-secondary" (click)="addItem()">+ Add Product</button>
                </div>

                <div formArrayName="items" class="items-list">
                  <div *ngFor="let itemGroup of itemsArray.controls; let idx = index" [formGroupName]="idx" class="item-row">
                    <div class="form-group flex-2">
                      <label class="form-label">Product</label>
                      <select class="form-control" formControlName="productId">
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

      <!-- AI DOCUMENT INGESTION MODAL (PHASE 1) -->
      <div *ngIf="showAiImportModal" class="modal-backdrop">
        <div class="modal-dialog modal-dialog-xl">
          <div class="modal-header ai-modal-header">
            <div class="ai-modal-branding">
              <div class="ai-modal-icon">🤖</div>
              <div>
                <h3>AI Document Ingestion & Order Intake</h3>
                <span class="ai-modal-subtitle">Phase 1 • OCR & Multimodal Extraction with Automatic Catalog Reconciliation</span>
              </div>
            </div>
            <button class="btn-close" (click)="closeModals()">×</button>
          </div>

          <div class="modal-body">
            <!-- Step 1: Upload or Choose Sample -->
            <div *ngIf="!stagedDoc && !isIngesting" class="ai-upload-flow">
              <!-- Drag & Drop Zone -->
              <div
                class="ai-dropzone"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onFileDrop($event)"
                [class.drag-over]="isDraggingOver"
              >
                <div class="dropzone-icon">📄</div>
                <h4>Drag & Drop Invoice, PO or Packing Slip here</h4>
                <p class="dropzone-hint">Supports PDF, PNG, JPG/JPEG documents up to 10MB</p>
                <label class="btn btn-outline-primary upload-btn-label">
                  Browse Files
                  <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.txt,.csv" style="display:none" />
                </label>
              </div>

              <!-- Quick One-Click Samples -->
              <div class="demo-samples-section">
                <div class="samples-title">
                  <span>⚡ Quick Demo Samples (Test with Seeded Catalog & ACID Stock Deduction):</span>
                </div>
                <div class="samples-grid">
                  <div
                    *ngFor="let sample of sampleDocuments"
                    class="sample-card"
                    (click)="loadSampleDocument(sample.id)"
                  >
                    <div class="sample-top">
                      <span class="sample-badge">{{ sample.documentType }}</span>
                      <span class="sample-items-chip">{{ sample.itemCount }} items</span>
                    </div>
                    <div class="sample-name">{{ sample.title }}</div>
                    <div class="sample-desc">{{ sample.description }}</div>
                    <div class="sample-footer">
                      <span>Client: <strong>{{ sample.issuer }}</strong></span>
                      <span class="sample-cost">{{ sample.estimatedTotal | currency }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Ingesting / Scanning State -->
            <div *ngIf="isIngesting" class="ai-scanning-state">
              <div class="scanner-wrap">
                <div class="doc-sheet">
                  <div class="scanner-laser"></div>
                  <div class="doc-lines">
                    <span class="line w-75"></span>
                    <span class="line w-50"></span>
                    <span class="line w-90"></span>
                    <span class="line w-60"></span>
                  </div>
                </div>
              </div>
              <h4>Analyzing Document via AI Multimodal Pipeline...</h4>
              <p class="scanning-sub">Extracting metadata, line items, and resolving against catalog products</p>
              <div class="scanning-steps">
                <div class="scan-step done">✓ Optical Character Recognition & Entity Identification</div>
                <div class="scan-step active">⚡ Fuzzy SKU & Catalog Cross-Referencing</div>
                <div class="scan-step">📦 Multi-Warehouse Stock Reservation Verification</div>
              </div>
            </div>

            <!-- Step 3: Reconciled Review & Order Confirmation -->
            <div *ngIf="stagedDoc && !isIngesting" class="ai-reconciliation-flow">
              <!-- Document Overview Bar -->
              <div class="doc-overview-bar">
                <div class="overview-item">
                  <span class="overview-label">Document Type</span>
                  <span class="badge badge-info">{{ stagedDoc.documentType }}</span>
                </div>
                <div class="overview-item">
                  <span class="overview-label">Document Ref #</span>
                  <span class="code-badge font-bold">{{ stagedDoc.documentReferenceNumber }}</span>
                </div>
                <div class="overview-item">
                  <span class="overview-label">AI Match Confidence</span>
                  <span class="badge badge-success font-bold">✓ {{ (stagedDoc.overallConfidence * 100).toFixed(0) }}% Confidence</span>
                </div>
                <div class="overview-item flex-grow">
                  <span class="overview-label">Target Fulfillment Hub</span>
                  <select
                    class="form-control form-control-sm"
                    [(ngModel)]="stagedDoc.suggestedWarehouseId"
                    (ngModelChange)="onStagedWarehouseChange()"
                  >
                    <option *ngFor="let w of warehouses" [ngValue]="w.id">{{ w.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Customer Information Grid -->
              <div class="customer-staged-grid">
                <div class="form-group">
                  <label class="form-label">Customer Name</label>
                  <input type="text" class="form-control" [(ngModel)]="stagedDoc.customerName" />
                </div>
                <div class="form-group">
                  <label class="form-label">Customer Email</label>
                  <input type="email" class="form-control" [(ngModel)]="stagedDoc.customerEmail" />
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input type="text" class="form-control" [(ngModel)]="stagedDoc.customerPhone" />
                </div>
                <div class="form-group flex-2">
                  <label class="form-label">Shipping Address</label>
                  <input type="text" class="form-control" [(ngModel)]="stagedDoc.shippingAddress" />
                </div>
              </div>

              <!-- Line Items Table -->
              <div class="items-table-header">
                <h4>Reconciled Order Line Items ({{ stagedDoc.items.length }})</h4>
                <button class="btn btn-sm btn-outline-secondary" (click)="addStagedItem()">+ Add Line Item</button>
              </div>

              <div class="table-responsive">
                <table class="table staged-table">
                  <thead>
                    <tr>
                      <th style="width: 28%">Extracted Document Line</th>
                      <th style="width: 30%">Matched Catalog Product</th>
                      <th style="width: 10%">Quantity</th>
                      <th style="width: 12%">Unit Price</th>
                      <th style="width: 10%">Subtotal</th>
                      <th style="width: 15%">Hub Stock</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let itm of stagedDoc.items; let i = index">
                      <td>
                        <div class="extracted-desc">{{ itm.rawDescription }}</div>
                        <span class="match-reason-badge">
                          <span class="dot" [ngClass]="itm.matchConfidence >= 0.9 ? 'dot-green' : 'dot-yellow'"></span>
                          {{ itm.matchReason }}
                        </span>
                      </td>
                      <td>
                        <select
                          class="form-control form-control-sm"
                          [(ngModel)]="itm.matchedProductId"
                          (ngModelChange)="onStagedProductChange(itm)"
                        >
                          <option *ngFor="let p of products" [ngValue]="p.id">
                            [{{ p.sku }}] {{ p.name }} - {{ p.price | currency }}
                          </option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          class="form-control form-control-sm"
                          [(ngModel)]="itm.quantity"
                          (ngModelChange)="recalcStagedTotals()"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          class="form-control form-control-sm"
                          [(ngModel)]="itm.unitPrice"
                          (ngModelChange)="recalcStagedTotals()"
                        />
                      </td>
                      <td>
                        <strong>{{ (itm.quantity * itm.unitPrice) | currency }}</strong>
                      </td>
                      <td>
                        <span class="badge" [ngClass]="itm.warehouseAvailableStock >= itm.quantity ? 'badge-success' : 'badge-danger'">
                          {{ itm.warehouseAvailableStock }} units available
                        </span>
                      </td>
                      <td>
                        <button class="btn-remove-line" (click)="removeStagedItem(i)">✕</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Financials Footer -->
              <div class="staged-financials-bar">
                <div class="notes-hint">
                  <span class="hint-icon">💡</span>
                  <span>Confirming will atomically deduct stock and write an immutable audit trail entry.</span>
                </div>
                <div class="financials-totals">
                  <div class="total-row">
                    <span>Items Subtotal:</span>
                    <span>{{ stagedDoc.subTotal | currency }}</span>
                  </div>
                  <div class="total-row">
                    <span>Tax (8.25%):</span>
                    <span>{{ stagedDoc.tax | currency }}</span>
                  </div>
                  <div class="total-row grand-total">
                    <span>Order Total:</span>
                    <span class="text-primary">{{ stagedDoc.totalAmount | currency }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              *ngIf="stagedDoc"
              type="button"
              class="btn btn-secondary mr-auto"
              (click)="stagedDoc = null"
            >
              ← Rescan / Choose Another Document
            </button>
            <button type="button" class="btn btn-secondary" (click)="closeModals()">Cancel</button>
            <button
              *ngIf="stagedDoc"
              type="button"
              class="btn btn-primary"
              [disabled]="isSubmitting || !stagedDoc.items.length"
              (click)="confirmStagedOrder()"
            >
              {{ isSubmitting ? 'Reserving Stock & Placing Order...' : 'Confirm & Create Order' }}
            </button>
          </div>
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
    .header-actions { display: flex; align-items: center; gap: 0.75rem; }

    .btn-ai-import {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.6rem 1.15rem;
      border-radius: var(--radius-sm);
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-ai-import:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(79, 70, 229, 0.45);
    }
    .ai-sparkle { font-size: 1rem; }
    .ai-badge-chip {
      background: rgba(255, 255, 255, 0.25);
      font-size: 0.6875rem;
      padding: 0.15rem 0.45rem;
      border-radius: 9999px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

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
    .flex-grow { flex-grow: 1; }

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

    /* AI Document Ingestion Modal Styles */
    .modal-dialog-xl {
      max-width: 960px;
      width: 95%;
    }
    .ai-modal-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      color: #fff;
    }
    .ai-modal-header h3 {
      color: #ffffff;
      margin: 0;
      font-size: 1.25rem;
    }
    .ai-modal-branding {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .ai-modal-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .ai-modal-subtitle {
      font-size: 0.785rem;
      color: #c7d2fe;
    }

    .ai-dropzone {
      border: 2px dashed #818cf8;
      background: #f5f3ff;
      border-radius: 12px;
      padding: 2.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ai-dropzone:hover, .ai-dropzone.drag-over {
      background: #ede9fe;
      border-color: #6366f1;
    }
    .dropzone-icon { font-size: 2.5rem; }
    .ai-dropzone h4 { margin: 0; font-size: 1.15rem; color: #1e1b4b; }
    .dropzone-hint { margin: 0; font-size: 0.8125rem; color: #64748b; }
    .upload-btn-label { cursor: pointer; margin-top: 0.5rem; }

    .demo-samples-section {
      margin-top: 2rem;
    }
    .samples-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 0.85rem;
      letter-spacing: 0.03em;
    }
    .samples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }
    .sample-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .sample-card:hover {
      border-color: #6366f1;
      transform: translateY(-2px);
      box-shadow: 0 8px 16px -4px rgba(99, 102, 241, 0.2);
    }
    .sample-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sample-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .sample-items-chip {
      font-size: 0.6875rem;
      color: #64748b;
      font-weight: 600;
    }
    .sample-name {
      font-weight: 700;
      font-size: 0.9375rem;
      color: #0f172a;
    }
    .sample-desc {
      font-size: 0.8125rem;
      color: #64748b;
      line-height: 1.4;
      flex: 1;
    }
    .sample-footer {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 0.785rem;
    }
    .sample-cost {
      font-weight: 700;
      color: #10b981;
    }

    /* Scanning State */
    .ai-scanning-state {
      padding: 3rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.75rem;
    }
    .scanner-wrap {
      position: relative;
      width: 120px;
      height: 140px;
      margin-bottom: 1rem;
    }
    .doc-sheet {
      width: 100%;
      height: 100%;
      background: #ffffff;
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      box-shadow: 0 8px 20px rgba(0,0,0,0.06);
      position: relative;
      overflow: hidden;
    }
    .scanner-laser {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: #6366f1;
      box-shadow: 0 0 10px #6366f1, 0 0 20px #818cf8;
      animation: scanAnim 1.6s infinite ease-in-out;
    }
    @keyframes scanAnim {
      0% { top: 0; }
      50% { top: calc(100% - 3px); }
      100% { top: 0; }
    }
    .doc-lines { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .line { height: 6px; background: #e2e8f0; border-radius: 3px; }
    .w-75 { width: 75%; }
    .w-50 { width: 50%; }
    .w-90 { width: 90%; }
    .w-60 { width: 60%; }

    .scanning-steps {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      text-align: left;
    }
    .scan-step {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #94a3b8;
    }
    .scan-step.done { color: #10b981; }
    .scan-step.active { color: #4f46e5; }

    /* Reconciled Staged Review */
    .doc-overview-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      background: #f8fafc;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 1.25rem;
      align-items: center;
    }
    .overview-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .overview-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .customer-staged-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .items-table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .staged-table td {
      vertical-align: middle;
    }
    .extracted-desc {
      font-weight: 600;
      font-size: 0.8125rem;
      color: #1e293b;
      margin-bottom: 0.25rem;
    }
    .match-reason-badge {
      font-size: 0.6875rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; }
    .dot-green { background: #10b981; }
    .dot-yellow { background: #f59e0b; }

    .btn-remove-line {
      background: #fee2e2;
      border: none;
      color: var(--danger);
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-remove-line:hover { background: var(--danger); color: #fff; }

    .staged-financials-bar {
      margin-top: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .notes-hint {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #64748b;
      max-width: 50%;
    }
    .financials-totals {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 240px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      color: #475569;
    }
    .grand-total {
      font-size: 1.15rem;
      font-weight: 800;
      border-top: 1px dashed #cbd5e1;
      padding-top: 0.4rem;
      color: #0f172a;
    }
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
  showAiImportModal = false;
  selectedOrder: Order | null = null;
  orderForm: FormGroup;
  isSubmitting = false;

  // AI Document Ingestion State (Phase 1)
  sampleDocuments: SampleDocumentOption[] = [];
  stagedDoc: ExtractedOrderDocument | null = null;
  isIngesting = false;
  isDraggingOver = false;

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
    this.loadSampleDocuments();
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

  loadSampleDocuments() {
    this.api.getDocumentSamples().subscribe({
      next: (samples) => {
        this.sampleDocuments = samples;
        this.cdr.markForCheck();
      },
      error: () => {}
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

  // ============================================
  // Standard Order Modal
  // ============================================

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
      this.cdr.markForCheck();
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

  // ============================================
  // Phase 1: AI Document Ingestion Workflow
  // ============================================

  openAiImportModal() {
    this.stagedDoc = null;
    this.isIngesting = false;
    this.showAiImportModal = true;
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDraggingOver = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.isDraggingOver = false;
  }

  onFileDrop(e: DragEvent) {
    e.preventDefault();
    this.isDraggingOver = false;
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.processUploadedFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.processUploadedFile(target.files[0]);
    }
  }

  processUploadedFile(file: File) {
    this.isIngesting = true;
    this.cdr.markForCheck();

    this.api.ingestDocument({ file, warehouseId: this.warehouses[0]?.id }).subscribe({
      next: (doc) => {
        this.isIngesting = false;
        this.stagedDoc = doc;
        this.onStagedWarehouseChange();
        this.notify.success('Document Parsed', `Extracted ${doc.items.length} items from ${file.name}`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isIngesting = false;
        this.notify.danger('Extraction Failed', 'Failed to parse document. Please check the file format.');
        this.cdr.markForCheck();
      }
    });
  }

  loadSampleDocument(sampleId: string) {
    this.isIngesting = true;
    this.cdr.markForCheck();

    this.api.ingestDocument({ sampleId, warehouseId: this.warehouses[0]?.id }).subscribe({
      next: (doc) => {
        this.isIngesting = false;
        this.stagedDoc = doc;
        this.onStagedWarehouseChange();
        this.notify.success('Sample Loaded', `Loaded sample document with ${doc.items.length} line items.`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isIngesting = false;
        this.notify.danger('Load Error', 'Could not load sample document.');
        this.cdr.markForCheck();
      }
    });
  }

  onStagedWarehouseChange() {
    if (!this.stagedDoc) return;
    const whId = this.stagedDoc.suggestedWarehouseId;

    this.api.getInventories({ warehouseId: whId, pageSize: 100 }).subscribe(res => {
      const invMap = new Map<number, number>();
      res.items.forEach(inv => invMap.set(inv.productId, inv.availableQuantity));

      if (this.stagedDoc) {
        this.stagedDoc.items.forEach(item => {
          if (item.matchedProductId) {
            item.warehouseAvailableStock = invMap.get(item.matchedProductId) || 0;
            item.isStockSufficient = item.warehouseAvailableStock >= item.quantity;
          }
        });
      }
      this.cdr.markForCheck();
    });
  }

  onStagedProductChange(item: ExtractedLineItem) {
    const prod = this.products.find(p => p.id === item.matchedProductId);
    if (prod) {
      item.matchedProductName = prod.name;
      item.matchedProductSku = prod.sku;
      item.unitPrice = prod.price;
      item.matchReason = `Manual Selection: ${prod.sku}`;
      item.matchConfidence = 1.0;
    }
    this.onStagedWarehouseChange();
    this.recalcStagedTotals();
  }

  addStagedItem() {
    if (!this.stagedDoc || !this.products.length) return;
    const defaultProd = this.products[0];
    this.stagedDoc.items.push({
      rawDescription: defaultProd.name,
      extractedSku: defaultProd.sku,
      quantity: 1,
      unitPrice: defaultProd.price,
      subTotal: defaultProd.price,
      matchedProductId: defaultProd.id,
      matchedProductName: defaultProd.name,
      matchedProductSku: defaultProd.sku,
      matchConfidence: 1.0,
      matchReason: 'Custom Item Added',
      warehouseAvailableStock: 0,
      isStockSufficient: true
    });
    this.onStagedWarehouseChange();
    this.recalcStagedTotals();
  }

  removeStagedItem(index: number) {
    if (!this.stagedDoc) return;
    this.stagedDoc.items.splice(index, 1);
    this.recalcStagedTotals();
  }

  recalcStagedTotals() {
    if (!this.stagedDoc) return;
    let sub = 0;
    this.stagedDoc.items.forEach(i => {
      i.subTotal = i.quantity * i.unitPrice;
      sub += i.subTotal;
    });
    this.stagedDoc.subTotal = sub;
    this.stagedDoc.tax = Math.round(sub * 0.0825 * 100) / 100;
    this.stagedDoc.totalAmount = this.stagedDoc.subTotal + this.stagedDoc.tax;
    this.cdr.markForCheck();
  }

  confirmStagedOrder() {
    if (!this.stagedDoc) return;

    if (!this.stagedDoc.customerName || !this.stagedDoc.customerEmail || !this.stagedDoc.shippingAddress) {
      this.notify.warning('Validation Required', 'Please ensure customer name, email, and shipping address are filled.');
      return;
    }

    if (!this.stagedDoc.items.length) {
      this.notify.warning('Validation Required', 'Order must contain at least one line item.');
      return;
    }

    // Verify stock availability
    for (const itm of this.stagedDoc.items) {
      if (!itm.matchedProductId) {
        this.notify.danger('Unmatched Item', `Please select a catalog product for '${itm.rawDescription}'.`);
        return;
      }
      if (itm.quantity > itm.warehouseAvailableStock) {
        this.notify.danger('Insufficient Stock', `Requested ${itm.quantity} of '${itm.matchedProductName}', but only ${itm.warehouseAvailableStock} available.`);
        return;
      }
    }

    this.isSubmitting = true;
    const orderPayload = {
      customerName: this.stagedDoc.customerName,
      customerEmail: this.stagedDoc.customerEmail,
      customerPhone: this.stagedDoc.customerPhone,
      shippingAddress: this.stagedDoc.shippingAddress,
      warehouseId: this.stagedDoc.suggestedWarehouseId,
      items: this.stagedDoc.items.map(i => ({
        productId: i.matchedProductId!,
        quantity: i.quantity
      }))
    };

    this.api.createOrder(orderPayload).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.notify.success('Order Created via AI Ingestion', `Order ${created.orderNumber} successfully booked and stock reserved.`);
        this.closeModals();
        this.loadOrders();
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  // ============================================
  // General Modal Actions
  // ============================================

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
    if (reason === null) return;

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
    this.showAiImportModal = false;
    this.stagedDoc = null;
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
