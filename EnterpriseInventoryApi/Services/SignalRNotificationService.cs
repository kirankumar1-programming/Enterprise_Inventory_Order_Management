using Microsoft.AspNetCore.SignalR;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventoryApi.Hubs;

namespace EnterpriseInventoryApi.Services;

public class SignalRNotificationService : IRealTimeNotificationService
{
    private readonly IHubContext<InventoryHub> _hubContext;
    private readonly ILogger<SignalRNotificationService> _logger;

    public SignalRNotificationService(IHubContext<InventoryHub> hubContext, ILogger<SignalRNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task BroadcastStockUpdateAsync(RealTimeStockUpdateEvent stockEvent)
    {
        try
        {
            _logger.LogInformation("Broadcasting StockUpdated: Product {ProductSKU} ({ProductId}) in Warehouse {WarehouseId}. Change: {ChangeQuantity}, New Available: {AvailableQuantity}",
                stockEvent.ProductSKU, stockEvent.ProductId, stockEvent.WarehouseId, stockEvent.ChangeQuantity, stockEvent.AvailableQuantity);

            await _hubContext.Clients.All.SendAsync("StockUpdated", stockEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast StockUpdated via SignalR");
        }
    }

    public async Task BroadcastOrderEventAsync(RealTimeOrderEvent orderEvent)
    {
        try
        {
            _logger.LogInformation("Broadcasting OrderEvent: Order {OrderNumber} Action {Action} Status {Status}",
                orderEvent.OrderNumber, orderEvent.Action, orderEvent.Status);

            await _hubContext.Clients.All.SendAsync("OrderEvent", orderEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast OrderEvent via SignalR");
        }
    }

    public async Task BroadcastAlertAsync(RealTimeAlertEvent alertEvent)
    {
        try
        {
            _logger.LogInformation("Broadcasting RealTimeAlert: Type {AlertType} Title {Title}",
                alertEvent.AlertType, alertEvent.Title);

            await _hubContext.Clients.All.SendAsync("RealTimeAlert", alertEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast RealTimeAlert via SignalR");
        }
    }
}
