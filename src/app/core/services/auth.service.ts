import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User, LoginResponse } from '../../models/app.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:5000/api/auth';
  private readonly TOKEN_KEY = 'ent_inv_token';
  private readonly USER_KEY = 'ent_inv_user';

  currentUser = signal<User | null>(this.getStoredUser());
  isAuthenticated = computed(() => {
    const user = this.currentUser();
    const token = this.getToken();
    if (!user || !token) return false;
    return !this.isTokenExpired(token);
  });

  isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  isManager = computed(() => this.currentUser()?.role === 'WarehouseManager');
  isSales = computed(() => this.currentUser()?.role === 'SalesRepresentative');
  isAuditor = computed(() => this.currentUser()?.role === 'Auditor');

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isTokenExpired(token?: string | null): boolean {
    const t = token ?? this.getToken();
    if (!t) return true;
    try {
      const parts = t.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  private getStoredUser(): User | null {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
