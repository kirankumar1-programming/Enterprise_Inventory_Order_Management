import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="navbar">
      <div class="navbar-left">
        <span class="environment-badge">PRODUCTION</span>
        <span class="system-time">{{ today | date:'mediumDate' }}</span>
      </div>

      <div class="navbar-right">
        <div class="badge-role" [ngClass]="'role-' + auth.currentUser()?.role?.toLowerCase()">
          {{ auth.currentUser()?.role }}
        </div>
        <div class="user-greeting">
          Hello, <strong>{{ auth.currentUser()?.fullName }}</strong>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      height: 70px;
      background: #ffffff;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      flex-shrink: 0;
    }
    .navbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .environment-badge {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: var(--success);
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .system-time {
      font-size: 0.8125rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .navbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .badge-role {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .role-admin { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .role-warehousemanager { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .role-salesrepresentative { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .role-auditor { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
    .user-greeting {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .user-greeting strong {
      color: var(--text-main);
    }
  `]
})
export class NavbarComponent {
  today = new Date();
  constructor(public auth: AuthService) {}
}
