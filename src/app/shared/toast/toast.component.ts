import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" *ngIf="notify.toasts().length > 0">
      <div *ngFor="let t of notify.toasts()" class="toast-item" [ngClass]="'toast-' + t.type">
        <div class="toast-icon">
          <span *ngIf="t.type === 'success'">✓</span>
          <span *ngIf="t.type === 'danger'">✕</span>
          <span *ngIf="t.type === 'warning'">⚠</span>
          <span *ngIf="t.type === 'info'">ℹ</span>
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ t.title }}</div>
          <div class="toast-message">{{ t.message }}</div>
        </div>
        <button class="toast-close" (click)="notify.remove(t.id)">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 420px;
      width: calc(100% - 3rem);
      pointer-events: none;
    }
    .toast-item {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      background: #ffffff;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border-color);
      pointer-events: auto;
      animation: slideIn 0.25s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
      font-size: 0.875rem;
    }
    .toast-success { border-left: 4px solid var(--success); }
    .toast-success .toast-icon { background: var(--success-bg); color: var(--success); }
    .toast-danger { border-left: 4px solid var(--danger); }
    .toast-danger .toast-icon { background: var(--danger-bg); color: var(--danger); }
    .toast-warning { border-left: 4px solid var(--warning); }
    .toast-warning .toast-icon { background: var(--warning-bg); color: var(--warning); }
    .toast-info { border-left: 4px solid var(--info); }
    .toast-info .toast-icon { background: var(--info-bg); color: var(--info); }
    .toast-content { flex: 1; }
    .toast-title { font-weight: 700; font-size: 0.875rem; color: var(--text-main); margin-bottom: 0.2rem; }
    .toast-message { font-size: 0.8125rem; color: var(--text-muted); line-height: 1.4; }
    .toast-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--text-light);
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }
    .toast-close:hover { color: var(--text-main); }
  `]
})
export class ToastComponent {
  constructor(public notify: NotificationService) {}
}
