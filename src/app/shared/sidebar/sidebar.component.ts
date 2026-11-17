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
        <a routerLink="/scenarios" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">⚡</span>
          <span class="nav-label">Real-Time Scenarios</span>
          <span class="badge-phase badge-p3">Live</span>
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

      <!-- Sidebar Footer with Social Links -->
      <div class="sidebar-footer">
        <div class="footer-label">Connect With Us</div>
        <div class="social-links-row">
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            class="social-btn linkedin-btn"
            title="LinkedIn"
            aria-label="LinkedIn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
          </a>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            class="social-btn youtube-btn"
            title="YouTube"
            aria-label="YouTube"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            class="social-btn github-btn"
            title="GitHub"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            class="social-btn twitter-btn"
            title="X (Twitter)"
            aria-label="X (Twitter)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
        <div class="footer-copy">© 2026 Enterprise Inventory</div>
      </div>
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

    .sidebar-footer {
      flex-shrink: 0;
      padding: 0.85rem 1.15rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .footer-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .social-links-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .social-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm, 6px);
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all 0.18s ease-in-out;
    }
    .social-btn:hover {
      transform: translateY(-2px);
      color: #fff;
    }
    .social-btn.linkedin-btn:hover {
      background: #0a66c2;
      border-color: #0a66c2;
      box-shadow: 0 4px 10px rgba(10, 102, 194, 0.4);
    }
    .social-btn.youtube-btn:hover {
      background: #ff0000;
      border-color: #ff0000;
      box-shadow: 0 4px 10px rgba(255, 0, 0, 0.4);
    }
    .social-btn.github-btn:hover {
      background: #24292e;
      border-color: #444c56;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    }
    .social-btn.twitter-btn:hover {
      background: #000;
      border-color: #333;
      box-shadow: 0 4px 10px rgba(255, 255, 255, 0.2);
    }
    .footer-copy {
      font-size: 0.65rem;
      color: #64748b;
    }
  `]
})
export class SidebarComponent {
  constructor(public auth: AuthService) {}
}
