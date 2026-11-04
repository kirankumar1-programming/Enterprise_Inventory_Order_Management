namespace EnterpriseInventory_Application.DTOs;

public class DashboardSummaryDto
{
    public int TotalProducts { get; set; }
    public int TotalWarehouses { get; set; }
    public int TotalSuppliers { get; set; }
    public int LowStockItemCount { get; set; }
    public int PendingOrdersCount { get; set; }
    public int ConfirmedOrdersCount { get; set; }
    public int DeliveredOrdersCount { get; set; }
    public decimal TotalStockInventoryValue { get; set; }
    public decimal TotalSalesRevenue { get; set; }

    public List<WarehouseStockSummaryDto> WarehouseBreakdown { get; set; } = new();
    public List<LowStockAlertDto> TopLowStockAlerts { get; set; } = new();
    public List<OrderDto> RecentOrders { get; set; } = new();
    public List<StockMovementDto> RecentMovements { get; set; } = new();
}

public class WarehouseStockSummaryDto
{
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public int TotalUnitsInStock { get; set; }
    public int Capacity { get; set; }
    public double UtilizationPercentage => Capacity > 0 ? Math.Round((double)TotalUnitsInStock / Capacity * 100, 1) : 0;
}

public class AuditLogDto
{
    public int Id { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? ChangesJson { get; set; }
    public DateTime Timestamp { get; set; }
    public string? IpAddress { get; set; }
}

public class AuditFilterParams : PaginationParams
{
    public string? EntityName { get; set; }
    public string? Action { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

