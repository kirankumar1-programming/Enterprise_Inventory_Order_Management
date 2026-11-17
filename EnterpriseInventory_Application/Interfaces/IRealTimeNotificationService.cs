using System;
using System.Threading.Tasks;

namespace EnterpriseInventory_Application.Interfaces;

public class RealTimeStockUpdateEvent
{
    public int ProductId { get; set; }
    public string ProductSKU { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int PreviousQuantity { get; set; }
    public int NewQuantity { get; set; }
    public int ChangeQuantity { get; set; }
    public int AvailableQuantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class RealTimeOrderEvent
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // "Created", "Cancelled", "StatusUpdated"
    public string? Reason { get; set; }
    public int ItemCount { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class RealTimeAlertEvent
{
    public string AlertType { get; set; } = "LowStock"; // "LowStock", "InsufficientStockAttempt", "ConcurrencyConflict"
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? ProductId { get; set; }
    public int? WarehouseId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public interface IRealTimeNotificationService
{
    Task BroadcastStockUpdateAsync(RealTimeStockUpdateEvent stockEvent);
    Task BroadcastOrderEventAsync(RealTimeOrderEvent orderEvent);
    Task BroadcastAlertAsync(RealTimeAlertEvent alertEvent);
}
