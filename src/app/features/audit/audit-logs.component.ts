import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  AuditLog, PagedResult, AnomalyRadarReport, InventoryAnomaly,
  AnomalySeverity, AnomalyType, ResolveAnomalyRequest
} from '../../models/app.models';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <!-- Page Header & Tab Bar -->
      <div class="page-header">
        <div>
          <div class="title-with-badge">
            <h1>System Audit & Compliance Radar</h1>
            <span class="phase-pill">Phase 3 Autonomous AI</span>
          </div>
          <p class="subtitle">Immutable audit trail, compliance logs, and unsupervised shrinkage & anomaly detection</p>
        </div>

        <div class="header-actions">
          <div class="tab-pills">
            <button
              class="tab-pill"
              [class.active]="activeTab === 'logs'"
              (click)="switchTab('logs')"
            >
              📜 Compliance Logs
            </button>
            <button
              class="tab-pill"
              [class.active]="activeTab === 'anomalies'"
              (click)="switchTab('anomalies')"
            >
              🛡️ AI Shrinkage & Anomaly Radar
              <span class="indicator-dot" *ngIf="radarReport && radarReport.totalAnomaliesCount > 0"></span>
            </button>
          </div>

          <button class="btn btn-secondary" (click)="refreshCurrentView()">
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- TAB 1: STANDARD COMPLIANCE AUDIT LOGS -->
      <!-- ============================================================ -->
      <ng-container *ngIf="activeTab === 'logs'">
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

            <button class="btn btn-primary" (click)="loadLogs()">
              Apply Filter
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
      </ng-container>

      <!-- ============================================================ -->
      <!-- TAB 2: AI SHRINKAGE & ANOMALY RADAR (PHASE 3) -->
      <!-- ============================================================ -->
      <ng-container *ngIf="activeTab === 'anomalies'">
        <!-- Radar Executive Metrics -->
        <div class="metrics-grid" *ngIf="radarReport">
          <div class="metric-card risk-card" [ngClass]="getRiskCardClass(radarReport.overallRiskLevel)">
            <div class="metric-icon">📡</div>
            <div class="metric-content">
              <span class="metric-label">Overall Network Risk</span>
              <span class="metric-value">{{ radarReport.overallRiskLevel }}</span>
              <span class="metric-subtext">Scanned {{ radarReport.scanTimestamp | date:'shortTime' }} UTC</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">⚠️</div>
            <div class="metric-content">
              <span class="metric-label">Active Anomalies Flagged</span>
              <span class="metric-value">{{ radarReport.totalAnomaliesCount }}</span>
              <span class="metric-subtext">Unresolved discrepancy events</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🔴</div>
            <div class="metric-content">
              <span class="metric-label">Critical / High Severity</span>
              <span class="metric-value text-danger">{{ radarReport.criticalCount + radarReport.highCount }}</span>
              <span class="metric-subtext">{{ radarReport.criticalCount }} Critical, {{ radarReport.highCount }} High</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">💰</div>
            <div class="metric-content">
              <span class="metric-label">Financial Exposure At Risk</span>
              <span class="metric-value font-bold">&#36;{{ radarReport.estimatedTotalExposure | number:'1.2-2' }}</span>
              <span class="metric-subtext">Potential shrinkage or unverified write-off</span>
            </div>
          </div>
        </div>

        <!-- Anomaly Filters & Actions -->
        <div class="card toolbar-card">
          <div class="toolbar-grid">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                class="form-control"
                placeholder="Filter by description, facility, or product..."
                [(ngModel)]="anomalySearchTerm"
              />
            </div>

            <div class="filter-group">
              <select class="form-control" [(ngModel)]="severityFilter">
                <option value="ALL">All Severities</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High Only</option>
                <option value="Medium">Medium Only</option>
                <option value="Low">Low Only</option>
              </select>
            </div>

            <div class="filter-group">
              <select class="form-control" [(ngModel)]="statusFilter">
                <option value="ALL">All Statuses</option>
                <option value="UNRESOLVED">Unresolved / Open</option>
                <option value="RESOLVED">Resolved Only</option>
              </select>
            </div>

            <button class="btn btn-secondary" (click)="loadRadar()">
              Scan Radar
            </button>
          </div>
        </div>

        <!-- Anomaly Radar Table -->
        <div class="card table-card">
          <div class="table-header-custom">
            <div>
              <h3>Flagged Security & Inventory Anomalies</h3>
              <p class="text-muted text-sm">Autonomous heuristic detection evaluating off-hours access, volume shifts, and rapid cancellations</p>
            </div>
            <span class="badge badge-info">{{ filteredAnomalies.length }} Displayed</span>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Anomaly Type</th>
                  <th>Severity</th>
                  <th>Facility & User</th>
                  <th>Financial Exposure</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of filteredAnomalies" [class.row-critical]="item.severity === AnomalySeverity.Critical && !item.isResolved">
                  <td>
                    <div class="time-block">
                      <span class="font-bold">{{ item.timestamp | date:'MMM d, HH:mm' }}</span>
                      <span class="text-xs text-muted">ID: {{ item.id }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="type-badge-container">
                      <span class="anomaly-type-tag" [ngClass]="getAnomalyTypeClass(item.type)">
                        {{ getAnomalyTypeIcon(item.type) }} {{ item.typeName }}
                      </span>
                      <p class="description-subtext">{{ item.description }}</p>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="getSeverityBadgeClass(item.severity)">
                      {{ getSeverityLabel(item.severity) }}
                    </span>
                  </td>
                  <td>
                    <div class="cell-stack">
                      <span class="font-bold">{{ item.warehouseName }}</span>
                      <span class="text-xs text-muted">{{ item.userEmail }}</span>
                      <span class="text-xs product-tag" *ngIf="item.productName">📦 {{ item.productName }} ({{ item.discrepancyQuantity }} units)</span>
                    </div>
                  </td>
                  <td>
                    <div class="cell-stack">
                      <span class="font-bold text-danger">&#36;{{ item.estimatedFinancialExposure | number:'1.2-2' }}</span>
                      <span class="text-xs text-muted">{{ item.discrepancyQuantity }} units impacted</span>
                    </div>
                  </td>
                  <td>
                    <div class="risk-score-wrapper">
                      <div class="risk-score-bar">
                        <div
                          class="risk-score-fill"
                          [style.width.%]="item.riskScore"
                          [ngClass]="getRiskScoreClass(item.riskScore)"
                        ></div>
                      </div>
                      <span class="risk-score-num">{{ item.riskScore }}/100</span>
                    </div>
                  </td>
                  <td>
                    <span *ngIf="!item.isResolved" class="badge badge-warning">⚠️ Open</span>
                    <span *ngIf="item.isResolved" class="badge badge-success" title="{{ item.resolutionNotes }}">✓ Resolved</span>
                  </td>
                  <td>
                    <button
                      *ngIf="!item.isResolved"
                      class="btn btn-sm btn-outline-danger"
                      (click)="openResolveModal(item)"
                    >
                      Investigate
                    </button>
                    <button
                      *ngIf="item.isResolved"
                      class="btn btn-sm btn-secondary"
                      (click)="viewResolutionDetails(item)"
                    >
                      Details
                    </button>
                  </td>
                </tr>

                <tr *ngIf="filteredAnomalies.length === 0">
                  <td colspan="8" class="text-center text-muted py-4">
                    No anomalies match the current filter parameters.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- Resolution Investigation Modal -->
      <div class="modal-backdrop" *ngIf="selectedAnomalyForResolve" (click)="closeResolveModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>🛡️ Anomaly Investigation & Resolution</h3>
              <p class="text-muted text-sm">Log supervisor verification notes and resolve security flag {{ selectedAnomalyForResolve.id }}</p>
            </div>
            <button class="btn-close" (click)="closeResolveModal()">×</button>
          </div>

          <div class="modal-body">
            <div class="alert alert-info">
              <strong>{{ selectedAnomalyForResolve.typeName }}</strong>
              <p class="mb-0 text-sm">{{ selectedAnomalyForResolve.description }}</p>
            </div>

            <div class="investigation-details-grid">
              <div>
                <span class="label-muted">Warehouse Hub:</span>
                <strong>{{ selectedAnomalyForResolve.warehouseName }}</strong>
              </div>
              <div>
                <span class="label-muted">Reported Actor:</span>
                <strong>{{ selectedAnomalyForResolve.userEmail }}</strong>
              </div>
              <div>
                <span class="label-muted">Financial Exposure:</span>
                <strong class="text-danger">&#36;{{ selectedAnomalyForResolve.estimatedFinancialExposure | number:'1.2-2' }}</strong>
              </div>
              <div>
                <span class="label-muted">Discrepancy Units:</span>
                <strong>{{ selectedAnomalyForResolve.discrepancyQuantity }}</strong>
              </div>
            </div>

            <div class="form-group mt-3">
              <label for="resolveNotes">Supervisor / Auditor Resolution Notes <span class="text-danger">*</span></label>
              <textarea
                id="resolveNotes"
                class="form-control"
                rows="4"
                placeholder="e.g., Physical count completed at Hub. Discrepancy reconciled with damage waiver #8921. No foul play detected."
                [(ngModel)]="resolutionNotes"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeResolveModal()">Cancel</button>
            <button
              class="btn btn-primary"
              [disabled]="!resolutionNotes || resolutionNotes.trim().length < 5 || isResolving"
              (click)="submitResolution()"
            >
              {{ isResolving ? 'Resolving...' : '✓ Confirm & Clear Anomaly' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .title-with-badge { display: flex; align-items: center; gap: 0.75rem; }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; }

    .phase-pill {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .header-actions { display: flex; align-items: center; gap: 1rem; }

    .tab-pills {
      display: flex;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: var(--radius-md);
      gap: 0.25rem;
    }

    .tab-pill {
      background: transparent;
      border: none;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s ease-in-out;
      position: relative;
    }

    .tab-pill.active {
      background: #ffffff;
      color: var(--primary-color, #4f46e5);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .indicator-dot {
      width: 8px;
      height: 8px;
      background-color: #ef4444;
      border-radius: 50%;
      display: inline-block;
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    .toolbar-card { padding: 1rem 1.25rem; }
    .toolbar-grid { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .search-box { flex: 2; min-width: 240px; position: relative; }
    .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); }
    .search-box .form-control { padding-left: 2.25rem; }
    .filter-group { flex: 1; min-width: 150px; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .metric-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .risk-card.risk-high {
      border-left: 5px solid #ef4444;
      background: linear-gradient(to right, #fef2f2, #ffffff);
    }

    .risk-card.risk-medium {
      border-left: 5px solid #f59e0b;
      background: linear-gradient(to right, #fffbeb, #ffffff);
    }

    .risk-card.risk-low {
      border-left: 5px solid #10b981;
      background: linear-gradient(to right, #f0fdf4, #ffffff);
    }

    .metric-icon { font-size: 2rem; }
    .metric-content { display: flex; flex-direction: column; }
    .metric-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .metric-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0.2rem 0; }
    .metric-subtext { font-size: 0.75rem; color: #64748b; }

    .table-card { padding: 0; overflow: hidden; }
    .table-header-custom {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .table-header-custom h3 { margin: 0; font-size: 1.1rem; }

    .time-block { display: flex; flex-direction: column; }
    .type-badge-container { display: flex; flex-direction: column; gap: 0.25rem; }
    .anomaly-type-tag {
      display: inline-block;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      width: fit-content;
    }
    .tag-offhours { background: #ede9fe; color: #5b21b6; }
    .tag-shrinkage { background: #fee2e2; color: #991b1b; }
    .tag-cancel { background: #ffedd5; color: #9a3412; }
    .tag-transfer { background: #e0f2fe; color: #075985; }
    .tag-volume { background: #fef3c7; color: #92400e; }

    .description-subtext { margin: 0; font-size: 0.775rem; color: #64748b; max-width: 320px; }
    .cell-stack { display: flex; flex-direction: column; gap: 0.15rem; }
    .product-tag { background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 3px; font-weight: 500; }

    .risk-score-wrapper { display: flex; align-items: center; gap: 0.5rem; }
    .risk-score-bar {
      width: 60px;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .risk-score-fill { height: 100%; border-radius: 3px; }
    .score-critical { background: #ef4444; }
    .score-high { background: #f97316; }
    .score-medium { background: #f59e0b; }
    .score-low { background: #10b981; }
    .risk-score-num { font-size: 0.75rem; font-weight: 600; font-family: var(--font-mono); }

    .row-critical { background-color: #fff1f2; }

    .font-bold { font-weight: 700; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.8125rem; }
    .text-danger { color: #dc2626; }
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

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }

    .modal-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      width: 90%;
      max-width: 540px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .modal-header h3 { margin: 0; font-size: 1.15rem; }
    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: #94a3b8;
    }

    .modal-body { padding: 1.5rem; }
    .investigation-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      background: #f8fafc;
      padding: 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
    }
    .label-muted { color: #64748b; font-size: 0.775rem; display: block; }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
    }
  `]
})
export class AuditLogsComponent implements OnInit {
  activeTab: 'logs' | 'anomalies' = 'logs';

  // Standard Logs State
  logsPaged: PagedResult<AuditLog> | null = null;
  searchTerm = '';
  selectedEntity = '';

  // Phase 3 Radar State
  radarReport: AnomalyRadarReport | null = null;
  anomalySearchTerm = '';
  severityFilter = 'ALL';
  statusFilter = 'ALL';
  selectedAnomalyForResolve: InventoryAnomaly | null = null;
  resolutionNotes = '';
  isResolving = false;

  readonly AnomalySeverity = AnomalySeverity;
  readonly AnomalyType = AnomalyType;

  constructor(
    private api: InventoryApiService,
    private notify: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'anomalies') {
        this.activeTab = 'anomalies';
        this.loadRadar();
      } else {
        this.activeTab = 'logs';
        this.loadLogs();
      }
    });
  }

  switchTab(tab: 'logs' | 'anomalies') {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'anomalies' ? 'anomalies' : null },
      queryParamsHandling: 'merge'
    });

    if (tab === 'logs' && !this.logsPaged) {
      this.loadLogs();
    } else if (tab === 'anomalies') {
      this.loadRadar();
    }
  }

  refreshCurrentView() {
    if (this.activeTab === 'logs') {
      this.loadLogs();
    } else {
      this.loadRadar();
    }
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

  loadRadar() {
    this.api.getAnomalyRadarReport().subscribe({
      next: (res) => {
        this.radarReport = res;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notify.danger('Radar Scan Failed', 'Unable to retrieve inventory anomaly radar report.');
        this.cdr.markForCheck();
      }
    });
  }

  get filteredAnomalies(): InventoryAnomaly[] {
    if (!this.radarReport?.anomalies) return [];
    return this.radarReport.anomalies.filter(item => {
      // Search text
      if (this.anomalySearchTerm) {
        const q = this.anomalySearchTerm.toLowerCase();
        const matchesText =
          item.description?.toLowerCase().includes(q) ||
          item.warehouseName?.toLowerCase().includes(q) ||
          item.productName?.toLowerCase().includes(q) ||
          item.userEmail?.toLowerCase().includes(q) ||
          item.id?.toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      // Severity
      if (this.severityFilter !== 'ALL') {
        const label = this.getSeverityLabel(item.severity);
        if (label !== this.severityFilter) return false;
      }

      // Status
      if (this.statusFilter === 'UNRESOLVED' && item.isResolved) return false;
      if (this.statusFilter === 'RESOLVED' && !item.isResolved) return false;

      return true;
    });
  }

  openResolveModal(anomaly: InventoryAnomaly) {
    this.selectedAnomalyForResolve = anomaly;
    this.resolutionNotes = `Physical audit verified at ${anomaly.warehouseName}. Incident logged and verified by supervisor.`;
  }

  closeResolveModal() {
    this.selectedAnomalyForResolve = null;
    this.resolutionNotes = '';
  }

  viewResolutionDetails(anomaly: InventoryAnomaly) {
    this.notify.info(`Anomaly ${anomaly.id} Resolved`, anomaly.resolutionNotes || 'No extra notes provided.');
  }

  submitResolution() {
    if (!this.selectedAnomalyForResolve || !this.resolutionNotes) return;
    this.isResolving = true;

    const request: ResolveAnomalyRequest = {
      anomalyId: this.selectedAnomalyForResolve.id,
      notes: this.resolutionNotes
    };

    this.api.resolveAnomaly(request).subscribe({
      next: (res) => {
        this.notify.success('Anomaly Resolved', res.message || `Anomaly ${request.anomalyId} has been acknowledged.`);
        if (this.selectedAnomalyForResolve) {
          this.selectedAnomalyForResolve.isResolved = true;
          this.selectedAnomalyForResolve.resolutionNotes = request.notes;
        }
        this.isResolving = false;
        this.closeResolveModal();
        this.loadRadar();
      },
      error: (err) => {
        this.notify.danger('Resolution Error', err.error?.message || 'Could not resolve anomaly.');
        this.isResolving = false;
        this.cdr.markForCheck();
      }
    });
  }

  getRiskCardClass(risk: string): string {
    switch (risk?.toLowerCase()) {
      case 'critical':
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      default: return 'risk-low';
    }
  }

  getAnomalyTypeIcon(type: AnomalyType): string {
    switch (type) {
      case AnomalyType.OffHoursWriteOff: return '🌙';
      case AnomalyType.HighVolumeAdjustment: return '📈';
      case AnomalyType.RapidOrderCancellation: return '⚡';
      case AnomalyType.TransferDiscrepancy: return '🔄';
      case AnomalyType.UnusualShrinkageSpike: return '📦';
      default: return '⚠️';
    }
  }

  getAnomalyTypeClass(type: AnomalyType): string {
    switch (type) {
      case AnomalyType.OffHoursWriteOff: return 'tag-offhours';
      case AnomalyType.UnusualShrinkageSpike: return 'tag-shrinkage';
      case AnomalyType.RapidOrderCancellation: return 'tag-cancel';
      case AnomalyType.TransferDiscrepancy: return 'tag-transfer';
      case AnomalyType.HighVolumeAdjustment: return 'tag-volume';
      default: return '';
    }
  }

  getSeverityBadgeClass(sev: AnomalySeverity): string {
    switch (sev) {
      case AnomalySeverity.Critical: return 'badge-danger font-bold';
      case AnomalySeverity.High: return 'badge-warning font-bold';
      case AnomalySeverity.Medium: return 'badge-info';
      default: return 'badge-neutral';
    }
  }

  getSeverityLabel(sev: AnomalySeverity): string {
    switch (sev) {
      case AnomalySeverity.Critical: return 'Critical';
      case AnomalySeverity.High: return 'High';
      case AnomalySeverity.Medium: return 'Medium';
      default: return 'Low';
    }
  }

  getRiskScoreClass(score: number): string {
    if (score >= 80) return 'score-critical';
    if (score >= 60) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
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
