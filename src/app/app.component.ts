import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { ToastComponent } from './shared/toast/toast.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent, ToastComponent],
  template: `
    <app-toast></app-toast>

    <div *ngIf="!auth.isAuthenticated(); else authLayout" class="guest-layout">
      <router-outlet></router-outlet>
    </div>

    <ng-template #authLayout>
      <div class="app-container">
        <app-sidebar></app-sidebar>
        <div class="main-content">
          <app-navbar></app-navbar>
          <main class="page-content">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .guest-layout {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 1.5rem;
    }
  `]
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
