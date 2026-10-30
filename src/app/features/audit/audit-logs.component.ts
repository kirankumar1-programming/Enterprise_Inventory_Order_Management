import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuditLog, PagedResult } from '../../models/app.models';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>System Audit & Compliance Logs</h1>
          <p class="subtitle">Immutable record of security events, inventory movements, status updates, and user modifications</p>
        </div>
        <button class="btn btn-secondary" (click)="loadLogs()">
          🔄 Refresh Log
        </button>
      </div>

      <!-- Filters Toolbar -->
      <div class="card toolbar-card">
        <div class="toolbar-grid">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="form-control"
              placeholder="Search by Entity ID, User Email, or Payload..."
              [(ngModel)]="searchTerm"
              (keyup.enter)="loadLogs()"
            />
          </div>

          <div class="filter-group">
            <select class="form-control" [(ngModel)]="selectedEntity" (change)="loadLogs()">
              <option value="">All Entities</option>
              <option value="Order">Orders</option>
              <option value="Product">Products</option>
              <option value="Inventory">Inventory Adjustments</option>
              <option value="InventoryTransfer">Stock Transfers</option>
              <option value="User">User / Authentication</option>
            </select>
          </div>

          <button class="btn btn-secondary" (click)="loadLogs()">
            Filter
          </button>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="card table-card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Entity</th>
                <th>Entity Reference</th>
                <th>Action</th>
                <th>Actor Email</th>
                <th>Payload Changes</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of logsPaged?.items">
                <td class="text-muted">{{ log.timestamp | date:'medium' }}</td>
                <td>
                  <span class="badge" [ngClass]="getEntityBadgeClass(log.entityName)">
                    {{ log.entityName }}
                  </span>
                </td>
                <td>
                  <span class="code-badge font-bold">{{ log.entityId }}</span>
                </td>
                <td>
                  <strong>{{ log.action }}</strong>
                </td>
                <td>{{ log.userEmail || 'System / Batch' }}</td>
                <td>
                  <pre *ngIf="log.changesJson" class="json-box">{{ formatJson(log.changesJson) }}</pre>
                  <span *ngIf="!log.changesJson" class="text-muted text-sm">-</span>
                </td>
              </tr>

              <tr *ngIf="logsPaged?.items?.length === 0">
                <td colspan="6" class="text-center text-muted py-4">
                  No audit logs found matching your filter criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; }

    .toolbar-card { padding: 1rem 1.25rem; }
    .toolbar-grid { display: flex; gap: 1rem; align-items: center; }
    .search-box { flex: 2; position: relative; }
    .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); }
    .search-box .form-control { padding-left: 2.25rem; }
    .filter-group { flex: 1; }

    .table-card { padding: 0; overflow: hidden; }
    .font-bold { font-weight: 700; }
    .text-sm { font-size: 0.8125rem; }
    .py-4 { padding-top: 2rem; padding-bottom: 2rem; }

    .json-box {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.4rem 0.6rem;
      max-width: 380px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      color: #334155;
    }
  `]
})
export class AuditLogsComponent implements OnInit {
  logsPaged: PagedResult<AuditLog> | null = null;
  searchTerm = '';
  selectedEntity = '';

  constructor(
    private api: InventoryApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.api.getAuditLogs({
      searchTerm: this.searchTerm || undefined,
      entityName: this.selectedEntity || undefined,
      pageSize: 50
    }).subscribe({
      next: (res) => {
        this.logsPaged = res;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  getEntityBadgeClass(entity: string): string {
    switch (entity?.toLowerCase()) {
      case 'order': return 'badge-info';
      case 'product': return 'badge-success';
      case 'inventory': return 'badge-warning';
      case 'inventorytransfer': return 'badge-neutral';
      case 'user': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  }

  formatJson(rawJson: string): string {
    try {
      const parsed = JSON.parse(rawJson);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return rawJson;
    }
  }
}
