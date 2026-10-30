import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let title = 'Error';
      let message = 'An unexpected error occurred.';

      if (error.error) {
        if (typeof error.error === 'string') {
          message = error.error;
        } else if (error.error.detail) {
          message = error.error.detail;
          title = error.error.title || title;
        } else if (error.error.message) {
          message = error.error.message;
        }
      }

      if (error.status === 401) {
        notify.warning('Session Expired', 'Please login to continue.');
        authService.logout();
      } else if (error.status === 0) {
        notify.danger('Connection Error', 'Cannot reach backend API at localhost:5000. Please verify the API is running.');
      } else if (error.status === 409) {
        notify.danger('Concurrency Conflict', message || 'Another user updated this record simultaneously. Please refresh to view current stock.');
      } else if (error.status === 400) {
        notify.danger(title, message || 'Invalid request parameters or business rule violation.');
      } else if (error.status === 404) {
        notify.warning('Not Found', message || 'Requested item was not found.');
      } else if (error.status === 500) {
        notify.danger('Server Error', 'A server-side error occurred. Please try again later.');
      }

      return throwError(() => error);
    })
  );
};
