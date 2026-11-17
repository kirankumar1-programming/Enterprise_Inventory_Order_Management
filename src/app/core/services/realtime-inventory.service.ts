import { Injectable, NgZone } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { RealTimeStockUpdateEvent, RealTimeOrderEvent, RealTimeAlertEvent } from '../../models/app.models';

@Injectable({
  providedIn: 'root'
})
export class RealtimeInventoryService {
  private hubConnection: HubConnection | null = null;
  private readonly hubUrl = 'http://localhost:5000/hubs/inventory';

  private stockUpdatedSubject = new Subject<RealTimeStockUpdateEvent>();
  private orderEventsSubject = new Subject<RealTimeOrderEvent>();
  private alertsSubject = new Subject<RealTimeAlertEvent>();
  private connectionStateSubject = new BehaviorSubject<boolean>(false);

  public stockUpdated$: Observable<RealTimeStockUpdateEvent> = this.stockUpdatedSubject.asObservable();
  public orderEvents$: Observable<RealTimeOrderEvent> = this.orderEventsSubject.asObservable();
  public alerts$: Observable<RealTimeAlertEvent> = this.alertsSubject.asObservable();
  public isConnected$: Observable<boolean> = this.connectionStateSubject.asObservable();

  constructor(
    private auth: AuthService,
    private notify: NotificationService,
    private zone: NgZone
  ) {
    this.initConnection();
  }

  public initConnection(): void {
    if (this.hubConnection && this.hubConnection.state === HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.auth.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Information)
      .build();

    this.registerHandlers();
    this.startConnection();
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('StockUpdated', (data: RealTimeStockUpdateEvent) => {
      this.zone.run(() => {
        this.stockUpdatedSubject.next(data);
      });
    });

    this.hubConnection.on('OrderEvent', (data: RealTimeOrderEvent) => {
      this.zone.run(() => {
        this.orderEventsSubject.next(data);
        if (data.action === 'Created') {
          this.notify.info('Live Order Placed', `Order ${data.orderNumber} for ${data.customerName} confirmed.`);
        } else if (data.action === 'Cancelled') {
          this.notify.warning('Live Order Cancelled', `Order ${data.orderNumber} cancelled. Stock restored to warehouse.`);
        }
      });
    });

    this.hubConnection.on('RealTimeAlert', (data: RealTimeAlertEvent) => {
      this.zone.run(() => {
        this.alertsSubject.next(data);
        if (data.alertType === 'LowStock') {
          this.notify.warning(data.title, data.message);
        } else if (data.alertType === 'InsufficientStockAttempt') {
          this.notify.danger(data.title, data.message);
        } else if (data.alertType === 'ConcurrencyConflict') {
          this.notify.danger(data.title, data.message);
        }
      });
    });

    this.hubConnection.onreconnecting(() => {
      this.zone.run(() => {
        this.connectionStateSubject.next(false);
      });
    });

    this.hubConnection.onreconnected(() => {
      this.zone.run(() => {
        this.connectionStateSubject.next(true);
        this.notify.success('Real-Time Connected', 'Live inventory synchronization active.');
      });
    });

    this.hubConnection.onclose(() => {
      this.zone.run(() => {
        this.connectionStateSubject.next(false);
      });
    });
  }

  public startConnection(): void {
    if (!this.hubConnection) return;

    if (this.hubConnection.state === HubConnectionState.Disconnected) {
      this.hubConnection.start()
        .then(() => {
          this.zone.run(() => {
            this.connectionStateSubject.next(true);
          });
        })
        .catch(() => {
          this.zone.run(() => {
            this.connectionStateSubject.next(false);
          });
        });
    }
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }
}
