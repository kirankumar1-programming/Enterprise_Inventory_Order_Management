import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  Supplier, SupplierIntelligenceReport, SupplierScorecard,
  SupplierTier, AutonomousReorderPolicy
} from '../../models/app.models';

@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Page Header & Tab Pills -->
      <div class="page-header">
        <div>
          <div class="title-with-badge">
            <h1>Supplier Directory & Reliability Intelligence</h1>
            <span class="phase-pill">Phase 3 Autonomous AI</span>
          </div>
          <p class="subtitle">Maintain vendor profiles, monitor lead-time reliability variance, and configure autonomous replenishment policies</p>
        </div>

        <div class="header-actions">
          <div class="tab-pills">
            <button
              class="tab-pill"
              [class.active]="activeView === 'directory'"
              (click)="switchView('directory')"
            >
              📋 Directory
            </button>
            <button
              class="tab-pill"
              [class.active]="activeView === 'ai-scorecard'"
              (click)="switchView('ai-scorecard')"
            >
              🤝 AI Scorecards & Autonomous Policies
            </button>
          </div>

          <button
            *ngIf="activeView === 'directory' && (auth.isAdmin() || auth.isManager())"
            (click)="openAddModal()"
            class="btn btn-primary"
          >
            <span>+</span> Add Supplier
          </button>
          <button
            *ngIf="activeView === 'ai-scorecard'"
            (click)="loadIntelligence()"
            class="btn btn-secondary"
          >
            🔄 Recalculate Scorecards
          </button>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- VIEW 1: SUPPLIERS DIRECTORY -->
      <!-- ============================================================ -->
      <ng-container *ngIf="activeView === 'directory'">
        <div class="suppliers-grid">
          <div *ngFor="let s of suppliers" class="card supplier-card">
            <div class="card-header">
              <div>
                <h3>{{ s.name }}</h3>
                <span class="text-muted text-sm">{{ s.city }}, {{ s.country }}</span>
              </div>
              <div class="header-badges">
                <span class="badge badge-info">{{ s.productCount }} Products</span>
                <button
                  *ngIf="auth.isAdmin() || auth.isManager()"
                  (click)="openEditModal(s)"
                  class="btn-icon-edit"
                  title="Edit Supplier">
                  ✏️ Edit
                </button>
              </div>
            </div>

            <div class="supplier-details">
              <div class="detail-item">
                <span class="detail-label">Contact Person</span>
                <strong>{{ s.contactPerson }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email</span>
                <a [href]="'mailto:' + s.email" class="supplier-link">{{ s.email }}</a>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span>{{ s.phone }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Address</span>
                <span class="text-sm text-muted">{{ s.address }}</span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ============================================================ -->
      <!-- VIEW 2: AI SUPPLIER RELIABILITY SCORECARDS & AUTONOMOUS POLICIES -->
      <!-- ============================================================ -->
      <ng-container *ngIf="activeView === 'ai-scorecard'">
        <!-- Executive Network Reliability Metrics -->
        <div class="metrics-grid" *ngIf="intelligenceReport">
          <div class="metric-card">
            <div class="metric-icon">⭐</div>
            <div class="metric-content">
              <span class="metric-label">Network Reliability Index</span>
              <span class="metric-value text-primary font-bold">{{ intelligenceReport.averageNetworkReliability }}%</span>
              <span class="metric-subtext">Weighted on-time probability</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🥇</div>
            <div class="metric-content">
              <span class="metric-label">Tier 1 Preferred Vendors</span>
              <span class="metric-value text-success font-bold">{{ tier1Count }}</span>
              <span class="metric-subtext">Zero-risk primary fulfillment</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">⚠️</div>
            <div class="metric-content">
              <span class="metric-label">High-Risk / Volatile Vendors</span>
              <span class="metric-value text-danger font-bold">{{ intelligenceReport.highRiskVendorsCount }}</span>
              <span class="metric-subtext">Lead-time variance &gt; 3.0 days</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">⚙️</div>
            <div class="metric-content">
              <span class="metric-label">Autonomous Replenishment</span>
              <span class="metric-value font-bold">{{ activePoliciesCount }} Active</span>
              <span class="metric-subtext">Self-governing purchase drafts</span>
            </div>
          </div>
        </div>

        <!-- Supplier Scorecards Grid -->
        <div class="section-title-row">
          <div>
            <h3>Vendor Reliability & Lead-Time Variance Matrix</h3>
            <p class="subtitle">AI evaluates historical order completion, variance deviations, and automated failover alternatives</p>
          </div>
        </div>

        <div class="scorecards-grid" *ngIf="intelligenceReport">
          <div
            *ngFor="let s of intelligenceReport.scorecards"
            class="card scorecard-card"
            [class.border-gold]="s.tier === SupplierTier.Tier1Gold"
            [class.border-silver]="s.tier === SupplierTier.Tier2Silver"
            [class.border-risk]="s.tier === SupplierTier.HighRisk || s.tier === SupplierTier.Tier3Standard"
          >
            <!-- Card Header -->
            <div class="scorecard-header">
              <div>
                <div class="supplier-title-row">
                  <h4>{{ s.supplierName }}</h4>
                  <span class="tier-pill" [ngClass]="getTierClass(s.tier)">
                    {{ getTierBadgeText(s.tier) }}
                  </span>
                </div>
                <span class="text-xs text-muted">{{ s.contactEmail }} • {{ s.suppliedProductsCount }} Products Supplied</span>
              </div>

              <div class="reliability-circle" [ngClass]="getScoreCircleClass(s.reliabilityScore)">
                <span class="score-num">{{ s.reliabilityScore }}%</span>
                <span class="score-label">Score</span>
              </div>
            </div>

            <!-- Metrics Matrix -->
            <div class="scorecard-stats-grid">
              <div class="stat-box">
                <span class="stat-label">Avg Lead Time</span>
                <span class="stat-value">{{ s.averageLeadTimeDays }} Days</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Lead Time Variance</span>
                <span class="stat-value" [class.text-danger]="s.leadTimeVarianceDays > 2.5">
                  ±{{ s.leadTimeVarianceDays | number:'1.1-1' }} Days
                </span>
              </div>
              <div class="stat-box">
                <span class="stat-label">On-Time Probability</span>
                <span class="stat-value font-bold" [class.text-success]="s.onTimeDeliveryProbability >= 0.9">
                  {{ (s.onTimeDeliveryProbability * 100) | number:'1.0-0' }}%
                </span>
              </div>
            </div>

            <!-- Risk Alerts -->
            <div class="risk-alerts-box" *ngIf="s.activeRiskAlerts.length > 0">
              <span class="risk-alerts-title">⚠️ AI Risk Alerts:</span>
              <ul class="risk-list">
                <li *ngFor="let alert of s.activeRiskAlerts">{{ alert }}</li>
              </ul>
            </div>

            <!-- Recommended Alternate Vendor -->
            <div class="alternate-vendor-box" *ngIf="s.recommendedAlternateSupplierName">
              <span class="alt-label">🔄 Recommended Failover Supplier:</span>
              <strong>{{ s.recommendedAlternateSupplierName }}</strong>
            </div>
          </div>
        </div>

        <!-- Autonomous Procurement Policies Section -->
        <div class="section-title-row mt-4">
          <div>
            <h3>Autonomous Procurement & Replenishment Policies</h3>
            <p class="subtitle">Self-executing purchase order drafting rules triggered when product runway breaches safety thresholds</p>
          </div>
        </div>

        <div class="policies-grid">
          <div *ngFor="let p of policies" class="card policy-card">
            <div class="policy-header">
              <div>
                <div class="policy-title-row">
                  <h4>{{ p.name }}</h4>
                  <span class="badge" [class.badge-success]="p.isEnabled" [class.badge-neutral]="!p.isEnabled">
                    {{ p.isEnabled ? '🟢 Autonomous Active' : '⚪ Paused' }}
                  </span>
                </div>
                <p class="policy-desc">{{ p.description }}</p>
              </div>

              <!-- Toggle Switch -->
              <label class="switch-toggle" *ngIf="auth.isAdmin() || auth.isManager()">
                <input
                  type="checkbox"
                  [checked]="p.isEnabled"
                  (change)="togglePolicy(p, $event)"
                />
                <span class="slider round"></span>
              </label>
            </div>

            <div class="policy-specs-grid">
              <div class="policy-spec">
                <span class="spec-label">Trigger Runway Threshold</span>
                <span class="spec-val">≤ {{ p.runwayThresholdDays }} Days Remaining</span>
              </div>
              <div class="policy-spec">
                <span class="spec-label">Max Auto-PO Approval Limit</span>
                <span class="spec-val font-bold text-primary">&#36;{{ p.maxAutoApproveValue | number:'1.0-0' }}</span>
              </div>
              <div class="policy-spec">
                <span class="spec-label">Auto Orders Drafted</span>
                <span class="spec-val font-bold">{{ p.totalOrdersAutoDrafted }} Orders</span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Add/Edit Supplier Modal -->
      <div *ngIf="showModal" class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ editingSupplier ? 'Edit Supplier' : 'Add New Supplier' }}</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>
          <form [formGroup]="supplierForm" (ngSubmit)="saveSupplier()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Company Name *</label>
                <input type="text" class="form-control" formControlName="name" placeholder="Acme Logistics Corp" />
                <div *ngIf="sf['name'].touched && sf['name'].invalid" class="invalid-feedback">Company name is required.</div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Contact Person *</label>
                  <input type="text" class="form-control" formControlName="contactPerson" placeholder="Jane Smith" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Email *</label>
                  <input type="email" class="form-control" formControlName="email" placeholder="contact@acme.com" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Phone *</label>
                  <input type="text" class="form-control" formControlName="phone" placeholder="+1-555-0123" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">City *</label>
                  <input type="text" class="form-control" formControlName="city" placeholder="Chicago" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Country *</label>
                  <input type="text" class="form-control" formControlName="country" placeholder="USA" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Street Address</label>
                <input type="text" class="form-control" formControlName="address" placeholder="123 Industrial Way" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="supplierForm.invalid || isSubmitting">
                {{ isSubmitting ? 'Saving...' : (editingSupplier ? 'Update Supplier' : 'Add Supplier') }}
              </button>
            </div>
          </form>
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
    }

    .tab-pill.active {
      background: #ffffff;
      color: var(--primary-color, #4f46e5);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .suppliers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    .supplier-card { display: flex; flex-direction: column; }
    .text-sm { font-size: 0.8125rem; }
    .text-xs { font-size: 0.75rem; }
    .supplier-details { display: flex; flex-direction: column; gap: 0.75rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .detail-label { font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
    .supplier-link { color: var(--primary, #4f46e5); text-decoration: none; font-size: 0.875rem; }
    .supplier-link:hover { text-decoration: underline; }

    .header-badges { display: flex; align-items: center; gap: 0.5rem; }
    .btn-icon-edit {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      border-radius: 6px;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      transition: all 0.15s ease-in-out;
    }
    .btn-icon-edit:hover {
      background: var(--primary, #4f46e5);
      color: #ffffff;
      border-color: var(--primary, #4f46e5);
    }

    /* Executive Metrics */
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

    .metric-icon { font-size: 2rem; }
    .metric-content { display: flex; flex-direction: column; }
    .metric-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .metric-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0.2rem 0; }
    .metric-subtext { font-size: 0.75rem; color: #64748b; }

    .section-title-row {
      margin-top: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title-row h3 { margin: 0; font-size: 1.15rem; }

    /* Scorecard Grid */
    .scorecards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .scorecard-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.2s ease-in-out;
    }

    .scorecard-card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }

    .border-gold { border-top: 4px solid #f59e0b; }
    .border-silver { border-top: 4px solid #94a3b8; }
    .border-risk { border-top: 4px solid #ef4444; }

    .scorecard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .supplier-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .supplier-title-row h4 { margin: 0; font-size: 1.05rem; }

    .tier-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .tier-gold { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .tier-silver { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .tier-risk { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

    .reliability-circle {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 3px solid;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .circle-high { border-color: #10b981; color: #047857; }
    .circle-med { border-color: #f59e0b; color: #b45309; }
    .circle-low { border-color: #ef4444; color: #b91c1c; }
    .score-num { font-size: 0.875rem; font-weight: 800; line-height: 1; }
    .score-label { font-size: 0.65rem; text-transform: uppercase; font-weight: 600; color: #64748b; margin-top: 0.1rem; }

    .scorecard-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: var(--radius-md);
      text-align: center;
    }
    .stat-box { display: flex; flex-direction: column; gap: 0.15rem; }
    .stat-label { font-size: 0.6875rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .stat-value { font-size: 0.875rem; font-weight: 700; color: #1e293b; }

    .risk-alerts-box {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: var(--radius-sm);
      padding: 0.6rem 0.75rem;
      font-size: 0.775rem;
    }
    .risk-alerts-title { font-weight: 700; color: #991b1b; display: block; margin-bottom: 0.25rem; }
    .risk-list { margin: 0; padding-left: 1.1rem; color: #7f1d1d; }

    .alternate-vendor-box {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: var(--radius-sm);
      padding: 0.55rem 0.75rem;
      font-size: 0.775rem;
      color: #1e40af;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .alt-label { font-size: 0.7rem; text-transform: uppercase; font-weight: 600; color: #3b82f6; }

    /* Autonomous Policies */
    .policies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.25rem;
    }

    .policy-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .policy-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .policy-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .policy-title-row h4 { margin: 0; font-size: 1.05rem; }
    .policy-desc { margin: 0; font-size: 0.8125rem; color: #64748b; }

    .policy-specs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.5rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: var(--radius-md);
      font-size: 0.8rem;
    }
    .policy-spec { display: flex; flex-direction: column; gap: 0.15rem; }
    .spec-label { font-size: 0.6875rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .spec-val { font-size: 0.8125rem; font-weight: 600; }

    /* Switch Toggle */
    .switch-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .switch-toggle input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1;
      transition: .3s;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
    }
    input:checked + .slider { background-color: #10b981; }
    input:checked + .slider:before { transform: translateX(20px); }
    .slider.round { border-radius: 24px; }
    .slider.round:before { border-radius: 50%; }

    .form-row { display: flex; gap: 1rem; }
    .flex-1 { flex: 1; }
    .font-bold { font-weight: 700; }
    .mt-4 { margin-top: 1.5rem; }
    .text-success { color: #16a34a; }
    .text-danger { color: #dc2626; }
    .text-primary { color: #4f46e5; }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
  `]
})
export class SuppliersListComponent implements OnInit {
  activeView: 'directory' | 'ai-scorecard' = 'directory';

  // Standard Directory
  suppliers: Supplier[] = [];
  showModal = false;
  editingSupplier: Supplier | null = null;
  supplierForm: FormGroup;
  isSubmitting = false;

  // Phase 3 Intelligence
  intelligenceReport: SupplierIntelligenceReport | null = null;
  policies: AutonomousReorderPolicy[] = [];

  readonly SupplierTier = SupplierTier;

  constructor(
    private api: InventoryApiService,
    public auth: AuthService,
    private notify: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.supplierForm = this.fb.group({
      name: ['', [Validators.required]],
      contactPerson: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['USA', [Validators.required]],
      address: ['']
    });
  }

  get sf() { return this.supplierForm.controls; }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['view'] === 'ai-scorecard') {
        this.activeView = 'ai-scorecard';
        this.loadIntelligence();
      } else {
        this.activeView = 'directory';
        this.loadSuppliers();
      }
    });
  }

  switchView(view: 'directory' | 'ai-scorecard') {
    this.activeView = view;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view === 'ai-scorecard' ? 'ai-scorecard' : null },
      queryParamsHandling: 'merge'
    });

    if (view === 'directory' && this.suppliers.length === 0) {
      this.loadSuppliers();
    } else if (view === 'ai-scorecard') {
      this.loadIntelligence();
    }
  }

  loadSuppliers() {
    this.api.getSuppliers().subscribe({
      next: (res) => {
        this.suppliers = res;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  loadIntelligence() {
    this.api.getSupplierScorecards().subscribe({
      next: (report) => {
        this.intelligenceReport = report;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notify.danger('Scorecards Failed', 'Could not load AI supplier reliability scorecards.');
        this.cdr.markForCheck();
      }
    });

    this.api.getAutonomousPolicies().subscribe({
      next: (policies) => {
        this.policies = policies;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  get tier1Count(): number {
    return this.intelligenceReport?.scorecards.filter(s => s.tier === SupplierTier.Tier1Gold).length || 0;
  }

  get activePoliciesCount(): number {
    return this.policies.filter(p => p.isEnabled).length;
  }

  togglePolicy(policy: AutonomousReorderPolicy, event: Event) {
    const target = event.target as HTMLInputElement;
    const newStatus = target.checked;

    this.api.toggleAutonomousPolicy({ policyId: policy.policyId, enabled: newStatus }).subscribe({
      next: (res) => {
        policy.isEnabled = res.enabled;
        this.notify.success(
          policy.isEnabled ? 'Autonomous Policy Activated' : 'Policy Paused',
          `${policy.name} is now ${policy.isEnabled ? 'active and monitoring runway' : 'paused'}.`
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        target.checked = !newStatus; // revert
        this.notify.danger('Policy Toggle Error', err.error?.message || 'Failed to update policy status.');
        this.cdr.markForCheck();
      }
    });
  }

  getTierBadgeText(tier: SupplierTier): string {
    switch (tier) {
      case SupplierTier.Tier1Gold: return '🥇 Tier 1 Gold';
      case SupplierTier.Tier2Silver: return '🥈 Tier 2 Silver';
      case SupplierTier.Tier3Standard: return '🥉 Tier 3 Standard';
      case SupplierTier.HighRisk: return '⚠️ High Risk';
      default: return 'Evaluated';
    }
  }

  getTierClass(tier: SupplierTier): string {
    switch (tier) {
      case SupplierTier.Tier1Gold: return 'tier-gold';
      case SupplierTier.Tier2Silver: return 'tier-silver';
      case SupplierTier.HighRisk:
      case SupplierTier.Tier3Standard: return 'tier-risk';
      default: return '';
    }
  }

  getScoreCircleClass(score: number): string {
    if (score >= 90) return 'circle-high';
    if (score >= 75) return 'circle-med';
    return 'circle-low';
  }

  openAddModal() {
    this.editingSupplier = null;
    this.supplierForm.reset({ country: 'USA' });
    this.showModal = true;
  }

  openEditModal(s: Supplier) {
    this.editingSupplier = s;
    this.supplierForm.patchValue({
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      city: s.city,
      country: s.country,
      address: s.address || ''
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingSupplier = null;
  }

  saveSupplier() {
    if (this.supplierForm.invalid) return;

    this.isSubmitting = true;

    if (this.editingSupplier) {
      this.api.updateSupplier(this.editingSupplier.id, this.supplierForm.value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notify.success('Supplier Updated', 'Supplier profile updated successfully.');
          this.closeModal();
          this.loadSuppliers();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notify.danger('Update Failed', err?.error?.message || 'Failed to update supplier.');
          this.cdr.markForCheck();
        }
      });
    } else {
      this.api.createSupplier(this.supplierForm.value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notify.success('Supplier Added', 'New supplier profile added successfully.');
          this.closeModal();
          this.loadSuppliers();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notify.danger('Add Failed', err?.error?.message || 'Failed to add supplier.');
          this.cdr.markForCheck();
        }
      });
    }
  }
}
