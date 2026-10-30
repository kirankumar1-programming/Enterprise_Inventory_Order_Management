import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">📦</div>
        <div class="brand-text">
          <span class="brand-title">Enterprise</span>
          <span class="brand-sub">Inventory & Orders</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">CORE OPERATIONS</div>
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Dashboard</span>
        </a>
        <a routerLink="/products" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">🏷️</span>
          <span class="nav-label">Products</span>
        </a>
        <a routerLink="/inventory" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">🏬</span>
          <span class="nav-label">Inventory & Stock</span>
        </a>
        <a routerLink="/orders" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">🛒</span>
          <span class="nav-label">Customer Orders</span>
        </a>

        <div class="nav-section-title">RELATIONS & AUDIT</div>
        <a routerLink="/suppliers" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">🤝</span>
          <span class="nav-label">Suppliers</span>
        </a>
        <a *ngIf="auth.isAdmin() || auth.isAuditor()" routerLink="/audit" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">📋</span>
          <span class="nav-label">Audit Logs</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="user-pill">
          <div class="avatar">{{ auth.currentUser()?.fullName?.charAt(0) || 'U' }}</div>
          <div class="user-meta">
            <span class="user-name">{{ auth.currentUser()?.fullName }}</span>
            <span class="user-role">{{ auth.currentUser()?.role }}</span>
          </div>
        </div>
        <button class="btn-logout" (click)="auth.logout()" title="Logout">
          ↪ Sign Out
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      background-color: var(--bg-sidebar);
      color: #fff;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      user-select: none;
    }
    .sidebar-brand {
      height: 70px;
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .brand-icon {
      font-size: 1.75rem;
      background: rgba(37, 99, 235, 0.2);
      border-radius: var(--radius-sm);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-text { display: flex; flex-direction: column; }
    .brand-title { font-weight: 800; font-size: 1.05rem; letter-spacing: -0.02em; color: #fff; }
    .brand-sub { font-size: 0.75rem; color: var(--text-light); }
    .sidebar-nav {
      flex: 1;
      padding: 1.25rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow-y: auto;
    }
    .nav-section-title {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.06em;
      padding: 0.75rem 0.75rem 0.35rem;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 0.875rem;
      border-radius: var(--radius-sm);
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .nav-item:hover {
      background-color: var(--bg-sidebar-hover);
      color: #fff;
    }
    .nav-item.active {
      background-color: var(--primary);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }
    .nav-icon { font-size: 1.1rem; }
    .sidebar-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
    }
    .user-meta { display: flex; flex-direction: column; overflow: hidden; }
    .user-name { font-size: 0.8125rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { font-size: 0.6875rem; color: #38bdf8; font-weight: 600; }
    .btn-logout {
      width: 100%;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      padding: 0.4rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-logout:hover {
      background: var(--danger);
      border-color: var(--danger);
      color: #fff;
    }
  `]
})
export class SidebarComponent {
  constructor(public auth: AuthService) {}
}
