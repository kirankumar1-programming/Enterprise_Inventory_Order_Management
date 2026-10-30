import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ProductsListComponent } from './features/products/products-list.component';
import { InventoryViewComponent } from './features/inventory/inventory-view.component';
import { OrdersListComponent } from './features/orders/orders-list.component';
import { SuppliersListComponent } from './features/suppliers/suppliers-list.component';
import { AuditLogsComponent } from './features/audit/audit-logs.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'products', component: ProductsListComponent, canActivate: [authGuard] },
  { path: 'inventory', component: InventoryViewComponent, canActivate: [authGuard] },
  { path: 'orders', component: OrdersListComponent, canActivate: [authGuard] },
  { path: 'suppliers', component: SuppliersListComponent, canActivate: [authGuard] },
  {
    path: 'audit',
    component: AuditLogsComponent,
    canActivate: [authGuard, roleGuard(['Admin', 'Auditor'])]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
