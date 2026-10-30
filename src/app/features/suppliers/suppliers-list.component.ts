import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Supplier } from '../../models/app.models';

@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Supplier Directory</h1>
          <p class="subtitle">Maintain enterprise vendor profiles, communication contacts, and product catalogs</p>
        </div>
        <button *ngIf="auth.isAdmin() || auth.isManager()" (click)="openAddModal()" class="btn btn-primary">
          <span>+</span> Add Supplier
        </button>
      </div>

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
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; }

    .suppliers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    .supplier-card {
      display: flex;
      flex-direction: column;
    }
    .text-sm { font-size: 0.8125rem; }
    .supplier-details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .detail-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .supplier-link {
      color: var(--primary);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .supplier-link:hover { text-decoration: underline; }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
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
      background: var(--primary, #3b82f6);
      color: #ffffff;
      border-color: var(--primary, #3b82f6);
    }

    .form-row { display: flex; gap: 1rem; }
    .flex-1 { flex: 1; }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
  `]
})
export class SuppliersListComponent implements OnInit {
  suppliers: Supplier[] = [];
  showModal = false;
  editingSupplier: Supplier | null = null;
  supplierForm: FormGroup;
  isSubmitting = false;

  constructor(
    private api: InventoryApiService,
    public auth: AuthService,
    private notify: NotificationService,
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
    this.loadSuppliers();
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
