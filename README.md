# Enterprise Inventory Management - Frontend (Angular)

Modern, responsive web application built with **Angular (Standalone Components)**, **TypeScript**, and **Tailwind CSS**, featuring real-time state synchronization via **SignalR WebSockets**.

---

## Key Features

- **Live Synchronization via SignalR**: Real-time stock update indicators, animated row-flash notifications (`.row-flash`), low-stock badges, and connection status pill in the navbar (`🟢 Live Sync Active`).
- **Interactive Scenarios Dashboard (`/scenarios`)**: Dedicated 4-card live simulation control center for:
  1. Insufficient Stock Validation
  2. Order Cancellation & Stock Restoration
  3. High-Concurrency Flash Sale Orders
  4. Automatic Stock Updates & Event Broadcasting
- **Multi-Warehouse Inventory Tracking**: Warehouse breakdown tables, cycle count adjustments, and inter-facility stock transfers.
- **Order Management & Fulfillment**: Real-time line item availability validation, order status tracking, and 1-click order cancellation with restock verification.
- **Role-Based Navigation & 1-Click Login**: Quick-login role chips for `Admin`, `Manager`, `Sales`, and `Auditor`.

---

## Frontend Architecture

```
EnterpriseInventory/src/app/
├── app.routes.ts                       # Application route definitions (/scenarios, /inventory, /orders...)
├── core/
│   ├── guards/                         # AuthGuard, RoleGuard
│   ├── interceptors/                   # AuthInterceptor (JWT injection), ErrorInterceptor
│   └── services/
│       ├── auth.service.ts             # JWT token storage and login/logout state
│       ├── inventory-api.service.ts    # REST API client
│       └── realtime-inventory.service.ts # SignalR WebSocket hub connection & observable streams
├── features/
│   ├── auth/                           # Login component with 1-click role chips
│   ├── dashboard/                      # KPI summary cards and low stock alerts
│   ├── inventory/                      # Multi-warehouse inventory grid with live row-flashes
│   ├── orders/                         # Order creation and live restock cancellation
│   ├── products/                       # Catalog management, search, and category filtering
│   └── scenarios/                      # Interactive Real-Time Scenarios Control Center
└── shared/
    ├── navbar/                         # Real-time WebSocket connection badge
    ├── sidebar/                        # Role-aware navigation drawer
    └── layout/                         # Main application layout
```

---

## Running the Frontend

### Development Server
```powershell
npm start
```
Navigate to **`http://localhost:4200`** in your browser. The app connects to the API at `http://localhost:5000`.

### Production Build
```powershell
npm run build
```
Build output is generated in the `dist/` folder.

### Running Unit Tests
```powershell
npm test
```
Executes unit tests using **Vitest**.

---

## Detailed References
- [Root Architecture & Quick Start Guide](../README.md)
- [Complete REST & SignalR API Documentation](../docs/API_DOCUMENTATION.md)
- [Database Design & Concurrency Guide](../docs/DATABASE_DESIGN.md)
- [Error Handling & Resilience Architecture](../docs/ERROR_HANDLING.md)
- [Unit Testing Guide](../docs/TESTING_GUIDE.md)
