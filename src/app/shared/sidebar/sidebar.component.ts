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

      <!-- User Profile at Top -->
      <div class="sidebar-user-top">
        <div class="user-pill">
          <div class="avatar">{{ auth.currentUser()?.fullName?.charAt(0) || 'U' }}</div>
          <div class="user-meta">
            <span class="user-name">{{ auth.currentUser()?.fullName }}</span>
            <span class="user-role">{{ auth.currentUser()?.role }}</span>
          </div>
          <button class="btn-logout-mini" (click)="auth.logout()" title="Sign Out">
            ↪
          </button>
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

        <div class="nav-section-title">AI PREDICTIVE & AUTONOMOUS SUITE</div>
        <a routerLink="/audit" [queryParams]="{ tab: 'anomalies' }" class="nav-item ai-nav-item">
          <span class="nav-icon">🛡️</span>
          <span class="nav-label">Shrinkage & Anomaly Radar</span>
          <span class="badge-phase badge-p3">Phase 3</span>
        </a>
        <a routerLink="/suppliers" [queryParams]="{ view: 'ai-scorecard' }" class="nav-item ai-nav-item">
          <span class="nav-icon">⚡</span>
          <span class="nav-label">Autonomous Procurement</span>
          <span class="badge-phase badge-p3">Phase 3</span>
        </a>
        <a routerLink="/inventory" [queryParams]="{ tab: 'forecast' }" class="nav-item ai-nav-item">
          <span class="nav-icon">🤖</span>
          <span class="nav-label">AI Demand Forecast</span>
          <span class="badge-phase badge-p2">Phase 2</span>
        </a>
        <a routerLink="/products" [queryParams]="{ action: 'audit' }" class="nav-item ai-nav-item">
          <span class="nav-icon">✨</span>
          <span class="nav-label">Catalog Deduplication</span>
          <span class="badge-phase badge-p2">Phase 2</span>
        </a>
        <a routerLink="/orders" [queryParams]="{ action: 'import' }" class="nav-item ai-nav-item">
          <span class="nav-icon">📄</span>
          <span class="nav-label">Document Ingestion</span>
          <span class="badge-phase badge-p1">Phase 1</span>
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
    </aside>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      flex-shrink: 0;
      overflow: hidden;
    }

    .sidebar {
      width: 260px;
      height: 100%;
      max-height: 100vh;
      background-color: var(--bg-sidebar);
      color: #fff;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      user-select: none;
      overflow: hidden;
    }
    .sidebar-brand {
      height: 70px;
      flex-shrink: 0;
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
      min-height: 0;
      padding: 1.25rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
    }
    .sidebar-nav::-webkit-scrollbar {
      width: 5px;
    }
    .sidebar-nav::-webkit-scrollbar-track {
      background: transparent;
    }
    .sidebar-nav::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }
    .sidebar-nav::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.4);
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
    .badge-phase {
      margin-left: auto;
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .badge-p3 {
      background: rgba(16, 185, 129, 0.25);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.4);
    }
    .badge-p2 {
      background: rgba(147, 51, 234, 0.25);
      color: #c084fc;
      border: 1px solid rgba(192, 132, 252, 0.4);
    }
    .badge-p1 {
      background: rgba(14, 165, 233, 0.25);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .nav-icon { font-size: 1.1rem; }

    .sidebar-user-top {
      flex-shrink: 0;
      padding: 0.85rem 1.15rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.25);
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--primary, #2563eb);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.95rem;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }
    .user-name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      font-size: 0.6875rem;
      color: #38bdf8;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .btn-logout-mini {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      flex-shrink: 0;
    }
    .btn-logout-mini:hover {
      background: var(--danger, #dc2626);
      border-color: var(--danger, #dc2626);
      color: #fff;
      transform: scale(1.05);
    }
  `]
})
export class SidebarComponent {
  constructor(public auth: AuthService) {}
}
