import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="brand-badge">📦 ENTERPRISE INVENTORY</div>
          <h2>Sign in to Portal</h2>
          <p class="login-subtitle">Centralized Inventory, Multi-Warehouse & Order Management</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input
              type="text"
              class="form-control"
              formControlName="username"
              placeholder="e.g. admin, manager, sales"
              [class.is-invalid]="f['username'].touched && f['username'].invalid"
            />
            <div *ngIf="f['username'].touched && f['username'].invalid" class="invalid-feedback">
              User Name is required.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input
              type="password"
              class="form-control"
              formControlName="password"
              placeholder="••••••••"
              [class.is-invalid]="f['password'].touched && f['password'].invalid"
            />
            <div *ngIf="f['password'].touched && f['password'].invalid" class="invalid-feedback">
              Password is required.
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loginForm.invalid || isLoading">
            <span *ngIf="isLoading" class="spinner"></span>
            {{ isLoading ? 'Authenticating...' : 'Sign In' }}
          </button>
        </form>

        <div class="demo-accounts">
          <div class="demo-title">⚡ Quick Sign-In Roles (Click to Fill)</div>
          <div class="demo-chips">
            <button type="button" class="chip" (click)="fillDemo('admin')">
              👑 Admin
            </button>
            <button type="button" class="chip" (click)="fillDemo('manager')">
              🏬 Warehouse Mgr
            </button>
            <button type="button" class="chip" (click)="fillDemo('sales')">
              💼 Sales Rep
            </button>
            <button type="button" class="chip" (click)="fillDemo('auditor')">
              🔍 Auditor
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      width: 100%;
      max-width: 440px;
    }
    .login-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .brand-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--primary);
      background: var(--primary-light);
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    .login-header h2 {
      font-size: 1.625rem;
      text-decoration: underline red;
      color: var(--text-main);
      margin-bottom: 0.5rem;
    }
    .login-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .btn-block {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
    }
    .demo-accounts {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px dashed var(--border-color);
    }
    .demo-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      text-align: center;
    }
    .demo-chips {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .chip {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }
    .chip:hover {
      background: var(--primary-light);
      border-color: var(--primary-border);
      color: var(--primary);
    }
    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid #ffffff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private notify: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      username: ['admin', [Validators.required]],
      password: ['Password123!', [Validators.required]]
    });
  }

  get f() { return this.loginForm.controls; }

  fillDemo(roleUsername: string) {
    this.loginForm.patchValue({
      username: roleUsername,
      password: 'Password123!'
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.cdr.markForCheck();
        this.notify.success('Signed In', `Welcome back, ${res.user.fullName}!`);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
