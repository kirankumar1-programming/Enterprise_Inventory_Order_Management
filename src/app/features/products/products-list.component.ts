import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Product, Category, Supplier, PagedResult, DuplicateProductMatch, CategorySuggestion, CatalogAuditReport } from '../../models/app.models';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>Product Catalog</h1>
          <p class="subtitle">Manage enterprise master products, SKU identifiers, pricing, and reorder levels</p>
        </div>
        <div class="d-flex gap-2">
          <button (click)="openAuditModal()" class="btn btn-ai-gradient">
            <span>✨</span>
            <span>AI Catalog Deduplication</span>
            <span class="ai-badge-chip phase2">Phase 2 AI</span>
          </button>
          <button *ngIf="auth.isAdmin() || auth.isManager()" (click)="openAddModal()" class="btn btn-primary">
            <span>+</span> Add Product
          </button>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card toolbar-card">
        <div class="toolbar-grid">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="form-control"
              placeholder="Search by SKU or Product Name..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange($event)"
              (keyup.enter)="onFilterChange()"
            />
          </div>

          <div class="filter-group">
            <select class="form-control" [(ngModel)]="selectedCategory" (change)="onFilterChange()">
              <option [ngValue]="null">All Categories</option>
              <option *ngFor="let c of categories" [ngValue]="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="filter-group">
            <select class="form-control" [(ngModel)]="selectedSupplier" (change)="onFilterChange()">
              <option [ngValue]="null">All Suppliers</option>
              <option *ngFor="let s of suppliers" [ngValue]="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div class="filter-group">
            <select class="form-control" [(ngModel)]="sortBy" (change)="onFilterChange()">
              <option value="name_asc">Sort by Name (A-Z)</option>
              <option value="name_desc">Sort by Name (Z-A)</option>
              <option value="sku_asc">Sort by SKU (A-Z)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="reorderlevel_asc">Reorder Level: Low to High</option>
              <option value="reorderlevel_desc">Reorder Level: High to Low</option>
            </select>
          </div>

          <div class="checkbox-filter">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="lowStockOnly" (change)="onFilterChange()" />
              <span>Low Stock Alerts Only</span>
            </label>
          </div>

          <button (click)="onFilterChange()" class="btn btn-secondary">
            Apply Filters
          </button>
        </div>
      </div>

      <!-- Products Table -->
      <div class="card table-card">
        <div class="loading-bar-container" *ngIf="isLoading && pagedResult">
          <div class="loading-bar-indicator"></div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th class="col-sku">SKU</th>
                <th class="col-name">Product Name</th>
                <th class="col-category">Category</th>
                <th class="col-price">Price / Cost</th>
                <th class="col-safety">Safety Level</th>
                <th class="col-stock">Total In Stock</th>
                <th class="col-avail">Available</th>
                <th class="col-status">Stock Status</th>
                <th class="col-actions" *ngIf="auth.isAdmin() || auth.isManager()">Actions</th>
              </tr>
            </thead>
            <tbody [class.table-loading]="isLoading && pagedResult">
              <!-- Initial Loading State -->
              <tr *ngIf="isLoading && !pagedResult">
                <td colspan="9" class="text-center py-5">
                  <div class="table-loading-spinner">
                    <div class="loading-spinner"></div>
                    <p>Loading product catalog...</p>
                  </div>
                </td>
              </tr>

              <!-- Error State -->
              <tr *ngIf="!isLoading && errorMessage">
                <td colspan="9" class="text-center text-danger py-4">
                  <p>⚠️ {{ errorMessage }}</p>
                  <button class="btn btn-sm btn-secondary mt-2" (click)="loadProducts()">Retry</button>
                </td>
              </tr>

              <!-- Data Rows -->
              <ng-container *ngIf="!errorMessage && pagedResult">
                <tr *ngFor="let p of pagedResult.items">
                  <td class="col-sku">
                    <span class="code-badge">{{ p.sku }}</span>
                  </td>
                  <td class="col-name">
                    <div class="prod-title">{{ p.name }}</div>
                    <small class="text-muted" *ngIf="p.supplierName">Supplier: {{ p.supplierName }}</small>
                  </td>
                  <td class="col-category">
                    <span class="badge badge-neutral">{{ p.categoryName }}</span>
                  </td>
                  <td class="col-price">
                    <div><strong>{{ p.price | currency }}</strong></div>
                    <small class="text-muted">Cost: {{ p.costPrice | currency }}</small>
                  </td>
                  <td class="col-safety">{{ p.reorderLevel }} {{ p.unitOfMeasure }}</td>
                  <td class="col-stock"><strong>{{ p.totalQuantity }}</strong></td>
                  <td class="col-avail">
                    <span [ngClass]="p.totalAvailableQuantity <= p.reorderLevel ? 'text-danger font-bold' : 'text-success'">
                      {{ p.totalAvailableQuantity }}
                    </span>
                  </td>
                  <td class="col-status">
                    <span *ngIf="p.isLowStock" class="badge badge-danger">⚠️ Low Stock</span>
                    <span *ngIf="!p.isLowStock && p.totalAvailableQuantity > 0" class="badge badge-success">✓ Healthy</span>
                    <span *ngIf="p.totalAvailableQuantity === 0" class="badge badge-neutral">Out of Stock</span>
                  </td>
                  <td class="col-actions" *ngIf="auth.isAdmin() || auth.isManager()">
                    <div class="action-buttons">
                      <button class="btn btn-sm btn-secondary" (click)="openEditModal(p)">Edit</button>
                      <button *ngIf="auth.isAdmin()" class="btn btn-sm btn-danger" (click)="deleteProduct(p)">Delete</button>
                    </div>
                  </td>
                </tr>

                <tr *ngIf="pagedResult.items.length === 0">
                  <td colspan="9" class="text-center text-muted py-4">
                    No products matched your search or filters.
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar" *ngIf="pagedResult && pagedResult.totalCount > 0 && !errorMessage">
          <div class="page-info">
            Showing <strong>{{ (currentPage - 1) * pageSize + 1 }}</strong> to
            <strong>{{ mathMin(currentPage * pageSize, pagedResult.totalCount) }}</strong> of
            <strong>{{ pagedResult.totalCount }}</strong> products
          </div>
          <div class="pagination-controls">
            <button class="btn btn-sm btn-secondary" [disabled]="!pagedResult.hasPreviousPage" (click)="changePage(currentPage - 1)">
              &larr; Previous
            </button>
            <span class="current-page-badge">{{ currentPage }} / {{ pagedResult.totalPages }}</span>
            <button class="btn btn-sm btn-secondary" [disabled]="!pagedResult.hasNextPage" (click)="changePage(currentPage + 1)">
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Add / Edit Product Modal -->
      <div *ngIf="showModal" class="modal-backdrop">
        <div class="modal-dialog modal-dialog-lg">
          <div class="modal-header">
            <h3>{{ editingProduct ? 'Edit Product' : 'Add New Product' }}</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>

          <form [formGroup]="productForm" (ngSubmit)="saveProduct()">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">SKU (Stock Keeping Unit)</label>
                  <input
                    type="text"
                    class="form-control"
                    formControlName="sku"
                    placeholder="e.g. PRD-ELEC-009"
                    [readonly]="!!editingProduct"
                  />
                  <div *ngIf="pf['sku'].touched && pf['sku'].invalid" class="invalid-feedback">SKU is required.</div>
                </div>

                <div class="form-group flex-2">
                  <div class="d-flex justify-between align-center">
                    <div class="d-flex align-center gap-2">
                      <label class="form-label m-0">Product Name</label>
                      <span class="ai-badge-chip phase2">Phase 2 AI Duplicate Check</span>
                    </div>
                    <span *ngIf="isCheckingDuplicates" class="text-sm text-muted">Checking duplicates...</span>
                  </div>
                  <input type="text" class="form-control" formControlName="name" placeholder="Full descriptive product name" />
                  <div *ngIf="pf['name'].touched && pf['name'].invalid" class="invalid-feedback">Product name is required.</div>

                  <!-- AI Duplicate Warning Notification -->
                  <div *ngIf="duplicateMatches.length > 0" class="duplicate-warning-box mt-2">
                    <div class="font-bold text-warning text-sm">⚠️ Similar Catalog Items Detected:</div>
                    <div *ngFor="let m of duplicateMatches" class="duplicate-item text-sm">
                      • <strong>{{ m.name }}</strong> ({{ m.sku }}) - <span class="badge badge-warning">{{ m.similarityScore * 100 }}% match</span>: {{ m.matchReason }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <div class="d-flex justify-between align-center">
                    <label class="form-label">Category</label>
                    <button
                      type="button"
                      class="btn-link-ai"
                      (click)="suggestCategory()"
                      [disabled]="isSuggestingCategory || !productForm.get('name')?.value"
                    >
                      ✨ {{ isSuggestingCategory ? 'Analyzing...' : 'AI Auto-Pick [Phase 2]' }}
                    </button>
                  </div>
                  <select class="form-control" formControlName="categoryId">
                    <option value="" disabled>Select category</option>
                    <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
                  </select>
                  <small *ngIf="categorySuggestion" class="text-success text-sm mt-1 d-block">
                    ✓ {{ categorySuggestion.explanation }}
                  </small>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Supplier</label>
                  <select class="form-control" formControlName="supplierId">
                    <option [ngValue]="null">None / Direct Sourcing</option>
                    <option *ngFor="let s of suppliers" [value]="s.id">{{ s.name }}</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Selling Price ($)</label>
                  <input type="number" step="0.01" class="form-control" formControlName="price" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Cost Price ($)</label>
                  <input type="number" step="0.01" class="form-control" formControlName="costPrice" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Reorder Level (Alert)</label>
                  <input type="number" class="form-control" formControlName="reorderLevel" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Description / Specifications</label>
                <textarea rows="3" class="form-control" formControlName="description" placeholder="Technical specs or item details..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="productForm.invalid || isSubmitting">
                {{ isSubmitting ? 'Saving...' : 'Save Product' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- AI CATALOG AUDIT MODAL (PHASE 2) -->
      <div *ngIf="showAuditModal" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 860px;">
          <div class="modal-header">
            <div>
              <div class="d-flex align-center gap-2">
                <h3>AI Catalog Deduplication & Integrity Audit</h3>
                <span class="ai-badge-chip phase2">Phase 2 AI</span>
              </div>
              <p class="subtitle text-sm">Natural language token overlap (Jaccard) and SKU normalization scanning for catalog hygiene</p>
            </div>
            <button class="btn-close" (click)="showAuditModal = false">×</button>
          </div>
          <div class="modal-body">
            <div *ngIf="isLoadingAudit" class="p-5 text-center" style="padding: 2.5rem; text-align: center;">
              <div class="loading-spinner mb-3" style="margin: 0 auto 1rem;"></div>
              <p class="text-muted">Analyzing catalog token embeddings, normalized SKUs, and category distributions...</p>
            </div>

            <div *ngIf="!isLoadingAudit && auditReport">
              <!-- KPI Row -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="card p-3" style="text-align: center; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem;">
                  <span class="text-xs text-muted" style="font-size: 0.75rem; display: block;">QUALITY SCORE</span>
                  <div class="font-bold text-success" style="font-size: 1.75rem;">{{ auditReport.catalogQualityScore }}%</div>
                  <span class="text-xs text-muted" style="font-size: 0.75rem;">Clean Health Index</span>
                </div>
                <div class="card p-3" style="text-align: center; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem;">
                  <span class="text-xs text-muted" style="font-size: 0.75rem; display: block;">TOTAL PRODUCTS</span>
                  <div class="font-bold" style="font-size: 1.75rem;">{{ auditReport.totalProductsScanned }}</div>
                  <span class="text-xs text-muted" style="font-size: 0.75rem;">Active Master SKUs</span>
                </div>
                <div class="card p-3" style="text-align: center; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem;">
                  <span class="text-xs text-muted" style="font-size: 0.75rem; display: block;">DUPLICATE CLUSTERS</span>
                  <div class="font-bold" [ngClass]="auditReport.potentialDuplicatePairsCount > 0 ? 'text-warning' : 'text-success'" style="font-size: 1.75rem;">
                    {{ auditReport.potentialDuplicatePairsCount }}
                  </div>
                  <span class="text-xs text-muted" style="font-size: 0.75rem;">Identified Overlaps</span>
                </div>
                <div class="card p-3" style="text-align: center; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem;">
                  <span class="text-xs text-muted" style="font-size: 0.75rem; display: block;">CATEGORY ANOMALIES</span>
                  <div class="font-bold text-info" style="font-size: 1.75rem;">{{ auditReport.categoryAnomaliesCount }}</div>
                  <span class="text-xs text-muted" style="font-size: 0.75rem;">Classification Flags</span>
                </div>
              </div>

              <!-- Duplicate Clusters Table -->
              <div class="card p-0 mb-3" style="overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 1rem;">
                <div class="card-header" style="background: #f8fafc; padding: 0.75rem 1rem;">
                  <h4 style="margin: 0; font-size: 0.95rem;">Potential Duplicate & Conflicting Products</h4>
                </div>
                <div class="table-responsive">
                  <table class="table" style="min-width: 100%;">
                    <thead>
                      <tr>
                        <th>Product A</th>
                        <th>Product B (Similar Match)</th>
                        <th>Similarity Score</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let pair of auditReport.duplicatePairs">
                        <td>
                          <strong>{{ pair.productAName }}</strong>
                          <div class="code-badge">{{ pair.productASku }}</div>
                          <div class="text-xs text-muted" style="font-size: 0.75rem;">{{ pair.productACategory }} • {{ pair.productAPrice | currency }}</div>
                        </td>
                        <td>
                          <strong>{{ pair.productBName }}</strong>
                          <div class="code-badge">{{ pair.productBSku }}</div>
                          <div class="text-xs text-muted" style="font-size: 0.75rem;">{{ pair.productBCategory }} • {{ pair.productBPrice | currency }}</div>
                        </td>
                        <td>
                          <span class="badge" [ngClass]="pair.similarityScore >= 0.85 ? 'badge-danger' : 'badge-warning'">
                            {{ pair.similarityScore * 100 }}% Match
                          </span>
                        </td>
                        <td>
                          <span class="text-sm">{{ pair.similarityReason }}</span>
                        </td>
                      </tr>
                      <tr *ngIf="auditReport.duplicatePairs.length === 0">
                        <td colspan="4" class="text-center text-success py-4">
                          ✓ Catalog Deduplication Passed: No conflicting or redundant product records found!
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Category Misclassifications (if any) -->
              <div *ngIf="auditReport.misclassificationAlerts.length > 0" class="card p-0" style="overflow: hidden; border: 1px solid var(--border-color);">
                <div class="card-header" style="background: #fffbeb; padding: 0.75rem 1rem;">
                  <h4 style="margin: 0; font-size: 0.95rem; color: #92400e;">Category Misclassification Suggestions</h4>
                </div>
                <div class="table-responsive">
                  <table class="table" style="min-width: 100%;">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Current Category</th>
                        <th>AI Suggested Category</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let a of auditReport.misclassificationAlerts">
                        <td>
                          <strong>{{ a.productName }}</strong> ({{ a.sku }})
                        </td>
                        <td><span class="badge badge-neutral">{{ a.currentCategory }}</span></td>
                        <td><strong class="text-success">{{ a.suggestedCategory }}</strong></td>
                        <td><span class="badge badge-info">{{ a.confidence * 100 }}%</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="showAuditModal = false">Close</button>
            <button type="button" class="btn btn-primary" (click)="openAuditModal()">
              <span>🔄</span> Re-scan Catalog
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

    .toolbar-card { padding: 1rem 1.25rem; }
    .toolbar-grid {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
    }
    .search-box {
      flex: 2;
      min-width: 250px;
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.875rem;
    }
    .search-box .form-control {
      padding-left: 2.25rem;
    }
    .filter-group { flex: 1; min-width: 160px; }
    .checkbox-filter {
      display: flex;
      align-items: center;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-main);
    }

    .table-card { padding: 0; overflow: hidden; }
    .table { min-width: 1180px; }
    .col-sku { width: 140px; min-width: 130px; white-space: nowrap; }
    .col-name { min-width: 290px; }
    .prod-title { font-weight: 600; color: var(--text-main); white-space: nowrap; }
    .col-category { width: 140px; min-width: 130px; white-space: nowrap; }
    .col-price { width: 130px; min-width: 120px; white-space: nowrap; }
    .col-safety { width: 120px; min-width: 110px; white-space: nowrap; }
    .col-stock { width: 110px; min-width: 100px; white-space: nowrap; }
    .col-avail { width: 100px; min-width: 90px; white-space: nowrap; }
    .col-status { width: 130px; min-width: 120px; white-space: nowrap; }
    .col-actions { width: 140px; min-width: 130px; white-space: nowrap; }
    .action-buttons { display: flex; gap: 0.5rem; }
    .font-bold { font-weight: 700; }
    .py-4 { padding-top: 2rem; padding-bottom: 2rem; }

    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      background: #fafafa;
    }
    .page-info { font-size: 0.8125rem; color: var(--text-muted); }
    .pagination-controls { display: flex; align-items: center; gap: 0.75rem; }
    .current-page-badge { font-size: 0.8125rem; font-weight: 600; color: var(--text-main); }

    .form-row { display: flex; gap: 1rem; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-muted);
    }

    .table-loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: var(--text-muted);
      font-size: 0.875rem;
      padding: 1.5rem 0;
    }
    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .mt-2 { margin-top: 0.5rem; }
    .py-5 { padding-top: 2.5rem; padding-bottom: 2.5rem; }

    tbody.table-loading {
      opacity: 0.5;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    .loading-bar-container {
      height: 3px;
      width: 100%;
      background-color: #e2e8f0;
      overflow: hidden;
      position: relative;
    }
    .loading-bar-indicator {
      width: 40%;
      height: 100%;
      background-color: var(--primary);
      position: absolute;
      animation: indeterminateBar 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    @keyframes indeterminateBar {
      0% { left: -40%; width: 40%; }
      50% { left: 40%; width: 50%; }
      100% { left: 100%; width: 40%; }
    }

    /* Phase 2: AI Catalog Intelligence Styles */
    .duplicate-warning-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--radius-sm);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .duplicate-item {
      color: #92400e;
      line-height: 1.4;
    }
    .btn-link-ai {
      background: none;
      border: none;
      color: #0284c7;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
    }
    .btn-link-ai:hover:not(:disabled) {
      text-decoration: underline;
    }
    .btn-link-ai:disabled {
      color: var(--text-muted);
      cursor: not-allowed;
    }
    .d-flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .align-center { align-items: center; }
    .d-block { display: block; }
  `]
})
export class ProductsListComponent implements OnInit, OnDestroy {
  pagedResult: PagedResult<Product> | null = null;
  categories: Category[] = [];
  suppliers: Supplier[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  private loadSub?: Subscription;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  searchTerm = '';
  selectedCategory: number | null = null;
  selectedSupplier: number | null = null;
  lowStockOnly = false;
  sortBy = 'name_asc';
  currentPage = 1;
  pageSize = 10;

  showModal = false;
  editingProduct: Product | null = null;
  productForm: FormGroup;
  isSubmitting = false;

  // Phase 2: AI Catalog Intelligence
  duplicateMatches: DuplicateProductMatch[] = [];
  isCheckingDuplicates = false;
  categorySuggestion: CategorySuggestion | null = null;
  isSuggestingCategory = false;
  showAuditModal = false;
  isLoadingAudit = false;
  auditReport: CatalogAuditReport | null = null;
  private nameChangeSub?: Subscription;

  constructor(
    private api: InventoryApiService,
    public auth: AuthService,
    private notify: NotificationService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.productForm = this.fb.group({
      sku: ['', [Validators.required]],
      name: ['', [Validators.required]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0.01)]],
      costPrice: [0, [Validators.required, Validators.min(0)]],
      unitOfMeasure: ['Units', [Validators.required]],
      reorderLevel: [10, [Validators.required, Validators.min(1)]],
      categoryId: ['', [Validators.required]],
      supplierId: [null]
    });

    this.nameChangeSub = this.productForm.get('name')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((name: string) => {
      if (name && name.trim().length >= 3) {
        this.checkDuplicates(name);
      } else {
        this.duplicateMatches = [];
        this.cdr.markForCheck();
      }
    });
  }

  get pf() { return this.productForm.controls; }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'audit') {
        this.openAuditModal();
      }
    });

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadProducts(true);
    });

    this.loadLookups();
    this.loadProducts(true);
  }

  openAuditModal() {
    this.showAuditModal = true;
    this.isLoadingAudit = true;
    this.api.getCatalogAuditReport().subscribe({
      next: (report) => {
        this.auditReport = report;
        this.isLoadingAudit = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingAudit = false;
        this.notify.danger('Catalog Deduplication', 'Error loading catalog deduplication audit');
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    this.loadSub?.unsubscribe();
    this.searchSub?.unsubscribe();
    this.nameChangeSub?.unsubscribe();
  }

  checkDuplicates(name: string) {
    this.isCheckingDuplicates = true;
    this.api.detectDuplicateProducts({
      name,
      sku: this.productForm.get('sku')?.value || undefined,
      currentProductId: this.editingProduct?.id
    }).subscribe({
      next: (res) => {
        this.isCheckingDuplicates = false;
        this.duplicateMatches = res.matches;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isCheckingDuplicates = false;
        this.cdr.markForCheck();
      }
    });
  }

  suggestCategory() {
    const name = this.productForm.get('name')?.value;
    const description = this.productForm.get('description')?.value;
    if (!name) return;

    this.isSuggestingCategory = true;
    this.api.suggestCategory({ name, description }).subscribe({
      next: (res) => {
        this.isSuggestingCategory = false;
        this.categorySuggestion = res;
        if (res && res.categoryId) {
          this.productForm.patchValue({ categoryId: res.categoryId });
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSuggestingCategory = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchChange(text: string) {
    this.searchSubject.next(text);
  }

  loadLookups() {
    this.api.getCategories().subscribe({
      next: (res) => {
        this.categories = res;
        this.cdr.markForCheck();
      }
    });
    this.api.getSuppliers().subscribe({
      next: (res) => {
        this.suppliers = res;
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange() {
    this.loadProducts(true);
  }

  loadProducts(resetPage = false) {
    if (resetPage) {
      this.currentPage = 1;
    }

    this.loadSub?.unsubscribe();

    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    const catId = this.selectedCategory !== null && this.selectedCategory !== undefined && String(this.selectedCategory) !== 'null'
      ? Number(this.selectedCategory)
      : undefined;

    const suppId = this.selectedSupplier !== null && this.selectedSupplier !== undefined && String(this.selectedSupplier) !== 'null'
      ? Number(this.selectedSupplier)
      : undefined;

    let sortByField = 'name';
    let sortDescending = false;

    if (this.sortBy.endsWith('_desc')) {
      sortByField = this.sortBy.replace('_desc', '');
      sortDescending = true;
    } else if (this.sortBy.endsWith('_asc')) {
      sortByField = this.sortBy.replace('_asc', '');
      sortDescending = false;
    } else {
      sortByField = this.sortBy;
      sortDescending = false;
    }

    this.loadSub = this.api.getProducts({
      searchTerm: this.searchTerm.trim() || undefined,
      categoryId: catId,
      supplierId: suppId,
      lowStockOnly: this.lowStockOnly,
      sortBy: sortByField,
      sortDescending: sortDescending,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: (res) => {
        this.pagedResult = res;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || err?.message || 'Failed to load products. Please check the backend connection.';
        this.cdr.markForCheck();
      }
    });
  }

  changePage(page: number) {
    this.currentPage = page;
    this.loadProducts();
  }

  openAddModal() {
    this.editingProduct = null;
    this.duplicateMatches = [];
    this.categorySuggestion = null;
    this.productForm.reset({
      sku: '',
      name: '',
      description: '',
      price: 0,
      costPrice: 0,
      unitOfMeasure: 'Units',
      reorderLevel: 10,
      categoryId: this.categories[0]?.id || '',
      supplierId: null
    });
    this.showModal = true;
  }

  openEditModal(p: Product) {
    this.editingProduct = p;
    this.duplicateMatches = [];
    this.categorySuggestion = null;
    this.productForm.patchValue({
      sku: p.sku,
      name: p.name,
      description: p.description,
      price: p.price,
      costPrice: p.costPrice,
      unitOfMeasure: p.unitOfMeasure,
      reorderLevel: p.reorderLevel,
      categoryId: p.categoryId,
      supplierId: p.supplierId || null
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingProduct = null;
    this.duplicateMatches = [];
    this.categorySuggestion = null;
  }

  saveProduct() {
    if (this.productForm.invalid) return;

    this.isSubmitting = true;
    if (this.editingProduct) {
      this.api.updateProduct(this.editingProduct.id, this.productForm.value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notify.success('Updated', 'Product updated successfully.');
          this.closeModal();
          this.loadProducts();
        },
        error: () => this.isSubmitting = false
      });
    } else {
      this.api.createProduct(this.productForm.value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notify.success('Created', 'New product added to catalog.');
          this.closeModal();
          this.loadProducts();
        },
        error: () => this.isSubmitting = false
      });
    }
  }

  deleteProduct(p: Product) {
    if (!confirm(`Are you sure you want to delete product '${p.name}' (${p.sku})?`)) return;

    this.api.deleteProduct(p.id).subscribe({
      next: () => {
        this.notify.success('Deleted', `Product '${p.sku}' was deleted.`);
        this.loadProducts();
      }
    });
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }
}
