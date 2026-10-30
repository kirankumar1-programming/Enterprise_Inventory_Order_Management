import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'danger' | 'warning' | 'info';
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  toasts = signal<ToastMessage[]>([]);
  private counter = 0;

  show(type: 'success' | 'danger' | 'warning' | 'info', title: string, message: string, duration = 5000) {
    const id = ++this.counter;
    const toast: ToastMessage = { id, type, title, message };
    this.toasts.update(current => [...current, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(title: string, message: string) {
    this.show('success', title, message);
  }

  danger(title: string, message: string) {
    this.show('danger', title, message, 7000);
  }

  warning(title: string, message: string) {
    this.show('warning', title, message, 6000);
  }

  info(title: string, message: string) {
    this.show('info', title, message);
  }

  remove(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
