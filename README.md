# Enterprise Inventory Management - Backend API

ASP.NET Core 10 Web API built on **Clean Architecture** principles, exposing RESTful endpoints, real-time WebSocket communication via **SignalR**, and supporting dual database providers (**SQLite** for zero-setup local demo and **SQL Server** for enterprise production).

---

## Architecture Layers

```
EnterpriseInventoryApi/
├── EnterpriseInventory.Core/            # Domain Entities, Enums, AppExceptions
├── EnterpriseInventory_Application/     # Services, Interfaces, DTOs, Event Models
├── EnterpriseInventory_Infrastructure/  # EF Core DbContext, Repositories, DbInitializer
├── EnterpriseInventoryApi/              # Controllers, SignalR Hubs, Middlewares, Program.cs
└── EnterpriseInventory_Tests/           # xUnit Unit & Integration Tests (11 Tests)
```

### Layer Responsibilities
- **`EnterpriseInventory.Core`**:
  - Independent domain core with zero external framework dependencies.
  - Entities: `Product`, `Inventory`, `Warehouse`, `Category`, `Supplier`, `Order`, `OrderItem`, `StockMovement`, `User`, `Role`, `AuditLog`.
  - Custom domain exceptions: `InsufficientStockException`, `ConcurrencyConflictException`, `BusinessRuleValidationException`, `NotFoundException`.
- **`EnterpriseInventory_Application`**:
  - Business logic orchestration: `OrderService`, `InventoryService`, `ProductService`, `AuthService`.
  - Interfaces: `IOrderService`, `IInventoryService`, `IUnitOfWork`, `IRealTimeNotificationService`, `ICurrentUserService`.
  - DTOs and Real-Time Event payloads.
- **`EnterpriseInventory_Infrastructure`**:
  - Data access: `EnterpriseInventoryDbContext`, `GenericRepository<T>`, `UnitOfWork`.
  - Dual database provider configuration: `Microsoft.EntityFrameworkCore.Sqlite` & `Microsoft.EntityFrameworkCore.SqlServer`.
  - `DbInitializer`: Automatic schema generation (`EnsureCreated`) and pre-seeded demo dataset.
- **`EnterpriseInventoryApi`**:
  - Entry point (`Program.cs`), CORS policies, Swagger/OpenAPI specifications.
  - `ExceptionHandlingMiddleware`: Centralized RFC 7807 problem details error mapping.
  - `InventoryHub`: SignalR hub mapped at `/hubs/inventory`.
  - REST Controllers: `AuthController`, `ProductsController`, `InventoryController`, `OrdersController`, `ScenariosController`, etc.

---

## Configuration & Dual Database Engine

Configured in `EnterpriseInventoryApi/appsettings.json`:

```json
{
  "DatabaseProvider": "Sqlite",
  "ConnectionStrings": {
    "SqliteConnection": "Data Source=EnterpriseInventory.db",
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=EnterpriseInventoryDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  },
  "JwtSettings": {
    "Secret": "EnterpriseInventorySuperSecretKeyForJwtTokenGeneration2026!",
    "Issuer": "EnterpriseInventoryApi",
    "Audience": "EnterpriseInventoryClient",
    "ExpiryMinutes": 480
  }
}
```

- To use **SQLite** (Default): Set `"DatabaseProvider": "Sqlite"`. Reads/writes to `EnterpriseInventory.db`.
- To use **SQL Server**: Set `"DatabaseProvider": "SqlServer"`. Reads/writes to `"DefaultConnection"`.

---

## Running the API

```powershell
cd EnterpriseInventoryApi\EnterpriseInventoryApi
dotnet run
```
- **HTTP**: `http://localhost:5000`
- **HTTPS**: `https://localhost:5001`
- **Swagger UI**: `http://localhost:5000/swagger`

---

## Running Tests

```powershell
dotnet test EnterpriseInventoryApi\EnterpriseInventory_Tests\EnterpriseInventory_Tests.csproj
```
**11 passed (100% success rate)**:
- Insufficient stock validation & rollback tests
- Order cancellation & automatic stock restoration tests
- Concurrent order race conditions & zero-overselling tests
- Automatic stock update & alert broadcast tests
- Local SQLite database initializer & seed tests

---

## Detailed References
- [Root Architecture & Quick Start Guide](../README.md)
- [Complete REST & SignalR API Documentation](../docs/API_DOCUMENTATION.md)
- [Database Design & Concurrency Guide](../docs/DATABASE_DESIGN.md)
- [Error Handling & Resilience Architecture](../docs/ERROR_HANDLING.md)
- [Unit Testing Guide](../docs/TESTING_GUIDE.md)
