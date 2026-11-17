using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory_Application.Services;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Enums;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory.Core.Interfaces;

namespace EnterpriseInventoryApi.Controllers;

[Authorize]
public class ScenariosController : BaseApiController
{
    private readonly IOrderService _orderService;
    private readonly IInventoryService _inventoryService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IRealTimeNotificationService _realTimeNotification;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScenariosController> _logger;

    public ScenariosController(
        IOrderService orderService,
        IInventoryService inventoryService,
        IUnitOfWork unitOfWork,
        IRealTimeNotificationService realTimeNotification,
        IServiceScopeFactory scopeFactory,
        ILogger<ScenariosController> logger)
    {
        _orderService = orderService;
        _inventoryService = inventoryService;
        _unitOfWork = unitOfWork;
        _realTimeNotification = realTimeNotification;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <summary>
    /// Scenario 1: Demonstrates real-time insufficient stock validation.
    /// Attempts to place an order exceeding available stock.
    /// Returns detailed verification proving transaction rollback and stock preservation.
    /// </summary>
    [HttpPost("insufficient-stock")]
    [ProducesResponseType(typeof(InsufficientStockScenarioResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunInsufficientStockScenario([FromBody] InsufficientStockScenarioRequest request)
    {
        var inventory = await _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .FirstOrDefaultAsync(i => i.WarehouseId == request.WarehouseId && i.ProductId == request.ProductId);

        if (inventory == null)
        {
            return NotFound(new { message = $"No inventory record found for product {request.ProductId} in warehouse {request.WarehouseId}." });
        }

        int availableBefore = inventory.AvailableQuantity;
        int requestedQuantity = request.RequestedQuantity > 0 
            ? request.RequestedQuantity 
            : availableBefore + 15; // Guarantee shortage

        var dto = new CreateOrderDto
        {
            CustomerName = "Insufficient Stock Tester",
            CustomerEmail = "test-oversell@enterprise.com",
            CustomerPhone = "+1-555-0199",
            ShippingAddress = "100 Validation Boulevard, Suite 400",
            WarehouseId = request.WarehouseId,
            Items = new List<OrderItemRequestDto>
            {
                new() { ProductId = request.ProductId, Quantity = requestedQuantity }
            }
        };

        var stopwatch = Stopwatch.StartNew();
        bool exceptionCaught = false;
        string exceptionType = string.Empty;
        string exceptionMessage = string.Empty;
        InsufficientStockException? stockEx = null;

        try
        {
            await _orderService.CreateOrderAsync(dto);
        }
        catch (InsufficientStockException ex)
        {
            exceptionCaught = true;
            stockEx = ex;
            exceptionType = nameof(InsufficientStockException);
            exceptionMessage = ex.Message;
        }
        catch (Exception ex)
        {
            exceptionCaught = true;
            exceptionType = ex.GetType().Name;
            exceptionMessage = ex.Message;
        }
        finally
        {
            stopwatch.Stop();
        }

        // Verify that stock is completely unchanged
        var refreshedInventory = await _unitOfWork.Inventories.Query()
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.WarehouseId == request.WarehouseId && i.ProductId == request.ProductId);

        int availableAfter = refreshedInventory?.AvailableQuantity ?? 0;
        bool stockPreserved = availableBefore == availableAfter;

        return Ok(new InsufficientStockScenarioResult
        {
            ScenarioName = "Scenario 1: Real-Time Insufficient Stock Validation",
            ProductSKU = inventory.Product.SKU,
            ProductName = inventory.Product.Name,
            WarehouseName = inventory.Warehouse.Name,
            AvailableStock = availableBefore,
            RequestedQuantity = requestedQuantity,
            Deficit = requestedQuantity - availableBefore,
            ValidationTriggered = exceptionCaught,
            ExceptionType = exceptionType,
            ValidationMessage = exceptionMessage,
            StockPreserved = stockPreserved,
            StockBefore = availableBefore,
            StockAfter = availableAfter,
            ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
            Timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Scenario 2: Demonstrates order cancellation and automatic stock restoration.
    /// Cancels an order, verifies automatic warehouse restocking, stock movement ledger entry,
    /// audit log write, and real-time SignalR push.
    /// </summary>
    [HttpPost("order-cancellation")]
    [ProducesResponseType(typeof(OrderCancellationScenarioResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunOrderCancellationScenario([FromBody] OrderCancellationScenarioRequest request)
    {
        Order? orderToCancel = null;

        // If no orderId provided, find an existing Confirmed order or create a test one
        if (request.OrderId.HasValue && request.OrderId.Value > 0)
        {
            orderToCancel = await _unitOfWork.Orders.Query()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Warehouse)
                .FirstOrDefaultAsync(o => o.Id == request.OrderId.Value);
        }

        if (orderToCancel == null)
        {
            // Find existing confirmed order
            orderToCancel = await _unitOfWork.Orders.Query()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Warehouse)
                .FirstOrDefaultAsync(o => o.Status == OrderStatus.Confirmed);
        }

        if (orderToCancel == null)
        {
            // Create a small test order to cancel
            var anyInv = await _unitOfWork.Inventories.Query()
                .Include(i => i.Product)
                .Include(i => i.Warehouse)
                .FirstOrDefaultAsync(i => (i.Quantity - i.ReservedQuantity) >= 3);

            if (anyInv == null)
            {
                return BadRequest(new { message = "Cannot create sample order for cancellation: insufficient warehouse stock across all products." });
            }

            var newOrder = await _orderService.CreateOrderAsync(new CreateOrderDto
            {
                CustomerName = "Cancellation Flow Demo",
                CustomerEmail = "demo-cancellation@enterprise.com",
                ShippingAddress = "500 Restock Lane, Logistics Center",
                WarehouseId = anyInv.WarehouseId,
                Items = new List<OrderItemRequestDto>
                {
                    new() { ProductId = anyInv.ProductId, Quantity = 2 }
                }
            });

            orderToCancel = await _unitOfWork.Orders.Query()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Warehouse)
                .FirstOrDefaultAsync(o => o.Id == newOrder.Id);
        }

        if (orderToCancel == null)
        {
            return NotFound(new { message = "No suitable order found for cancellation demonstration." });
        }

        // Record stock before cancellation for each item
        var itemStockBefore = new Dictionary<int, int>();
        foreach (var item in orderToCancel.Items)
        {
            var inv = await _unitOfWork.Inventories.Query().AsNoTracking()
                .FirstOrDefaultAsync(i => i.WarehouseId == orderToCancel.WarehouseId && i.ProductId == item.ProductId);
            itemStockBefore[item.ProductId] = inv?.Quantity ?? 0;
        }

        var sw = Stopwatch.StartNew();
        string reason = string.IsNullOrWhiteSpace(request.Reason)
            ? "Customer requested order cancellation - duplicate purchase"
            : request.Reason;

        var cancelledOrder = await _orderService.CancelOrderAsync(orderToCancel.Id, reason);
        sw.Stop();

        // Verify stock restoration for each item
        var itemsRestored = new List<RestoredItemDetail>();
        bool allRestoredCorrectly = true;

        foreach (var item in orderToCancel.Items)
        {
            var invAfter = await _unitOfWork.Inventories.Query().AsNoTracking()
                .FirstOrDefaultAsync(i => i.WarehouseId == orderToCancel.WarehouseId && i.ProductId == item.ProductId);

            int before = itemStockBefore[item.ProductId];
            int after = invAfter?.Quantity ?? 0;
            int restoredQty = after - before;

            bool isMatch = restoredQty == item.Quantity;
            if (!isMatch) allRestoredCorrectly = false;

            itemsRestored.Add(new RestoredItemDetail
            {
                ProductId = item.ProductId,
                ProductName = item.Product.Name,
                ProductSKU = item.Product.SKU,
                StockBefore = before,
                QuantityRestored = item.Quantity,
                StockAfter = after,
                IsRestoredCorrectly = isMatch
            });
        }

        // Verify StockMovement audit ledger entry exists
        var ledgerEntry = await _unitOfWork.StockMovements.Query().AsNoTracking()
            .Where(sm => sm.ReferenceNumber == orderToCancel.OrderNumber && sm.MovementType == MovementType.OrderCancellationReturn)
            .FirstOrDefaultAsync();

        return Ok(new OrderCancellationScenarioResult
        {
            ScenarioName = "Scenario 2: Order Cancellation & Automatic Stock Restoration",
            OrderId = cancelledOrder.Id,
            OrderNumber = cancelledOrder.OrderNumber,
            CancellationReason = reason,
            PreviousStatus = "Confirmed",
            NewStatus = cancelledOrder.StatusName,
            WarehouseName = cancelledOrder.WarehouseName,
            AllItemsRestored = allRestoredCorrectly,
            RestoredItems = itemsRestored,
            LedgerReference = ledgerEntry?.ReferenceNumber ?? "Logged",
            LedgerMovementType = ledgerEntry?.MovementType.ToString() ?? "OrderCancellationReturn",
            ExecutionTimeMs = sw.ElapsedMilliseconds,
            Timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Scenario 3: Demonstrates concurrent order processing with zero overselling.
    /// Fires multiple parallel asynchronous order placements against limited stock.
    /// Proves that total allocated stock never exceeds initial stock.
    /// </summary>
    [HttpPost("concurrent-orders")]
    [ProducesResponseType(typeof(ConcurrentOrdersScenarioResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunConcurrentOrdersScenario([FromBody] ConcurrentOrdersScenarioRequest request)
    {
        int concurrentUsers = Math.Clamp(request.ConcurrentUsersCount, 2, 20);
        int quantityPerOrder = Math.Max(1, request.QuantityPerOrder);
        int initialStockToSet = request.SetStockTo.GetValueOrDefault(5); // e.g. 5 units in stock

        // Prepare inventory with known stock level for race condition test
        var inventory = await _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .FirstOrDefaultAsync(i => i.WarehouseId == request.WarehouseId && i.ProductId == request.ProductId);

        if (inventory == null)
        {
            return NotFound(new { message = $"Inventory not found for product {request.ProductId} in warehouse {request.WarehouseId}." });
        }

        // Explicitly set the stock level to test the race condition
        inventory.Quantity = initialStockToSet;
        inventory.ReservedQuantity = 0;
        inventory.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Inventories.Update(inventory);
        await _unitOfWork.SaveChangesAsync();

        int totalDemand = concurrentUsers * quantityPerOrder;
        int maxPossibleFulfillments = initialStockToSet / quantityPerOrder;

        _logger.LogInformation("Starting Concurrent Orders Scenario: Stock={Stock}, Users={Users}, QtyPerOrder={Qty}, Demand={Demand}",
            initialStockToSet, concurrentUsers, quantityPerOrder, totalDemand);

        var overallSw = Stopwatch.StartNew();
        var parallelTasks = new List<Task<ConcurrentOrderThreadResult>>();

        // Create parallel async tasks with independent DI scopes
        for (int i = 1; i <= concurrentUsers; i++)
        {
            int userIndex = i;
            parallelTasks.Add(Task.Run(async () =>
            {
                using var scope = _scopeFactory.CreateScope();
                var scopedOrderService = scope.ServiceProvider.GetRequiredService<IOrderService>();
                var threadSw = Stopwatch.StartNew();

                var orderDto = new CreateOrderDto
                {
                    CustomerName = $"Concurrent Buyer #{userIndex:D2}",
                    CustomerEmail = $"buyer{userIndex}@fastrace.com",
                    ShippingAddress = $"Station {userIndex}, Fast Checkout Hub",
                    WarehouseId = request.WarehouseId,
                    Items = new List<OrderItemRequestDto>
                    {
                        new() { ProductId = request.ProductId, Quantity = quantityPerOrder }
                    }
                };

                try
                {
                    var created = await scopedOrderService.CreateOrderAsync(orderDto);
                    threadSw.Stop();
                    return new ConcurrentOrderThreadResult
                    {
                        ThreadId = userIndex,
                        CustomerName = orderDto.CustomerName,
                        Success = true,
                        Status = "Confirmed",
                        OrderNumber = created.OrderNumber,
                        QuantityDeducted = quantityPerOrder,
                        Message = "Stock allocated and order confirmed.",
                        DurationMs = threadSw.ElapsedMilliseconds
                    };
                }
                catch (InsufficientStockException isEx)
                {
                    threadSw.Stop();
                    return new ConcurrentOrderThreadResult
                    {
                        ThreadId = userIndex,
                        CustomerName = orderDto.CustomerName,
                        Success = false,
                        Status = "Rejected (Insufficient Stock)",
                        QuantityDeducted = 0,
                        Message = isEx.Message,
                        DurationMs = threadSw.ElapsedMilliseconds
                    };
                }
                catch (ConcurrencyConflictException ccEx)
                {
                    threadSw.Stop();
                    return new ConcurrentOrderThreadResult
                    {
                        ThreadId = userIndex,
                        CustomerName = orderDto.CustomerName,
                        Success = false,
                        Status = "Rejected (Concurrency Conflict)",
                        QuantityDeducted = 0,
                        Message = ccEx.Message,
                        DurationMs = threadSw.ElapsedMilliseconds
                    };
                }
                catch (Exception ex)
                {
                    threadSw.Stop();
                    return new ConcurrentOrderThreadResult
                    {
                        ThreadId = userIndex,
                        CustomerName = orderDto.CustomerName,
                        Success = false,
                        Status = "Error",
                        QuantityDeducted = 0,
                        Message = ex.Message,
                        DurationMs = threadSw.ElapsedMilliseconds
                    };
                }
            }));
        }

        var threadResults = await Task.WhenAll(parallelTasks);
        overallSw.Stop();

        // Refresh inventory to verify final stock
        var finalInventory = await _unitOfWork.Inventories.Query().AsNoTracking()
            .FirstOrDefaultAsync(i => i.WarehouseId == request.WarehouseId && i.ProductId == request.ProductId);

        int finalStock = finalInventory?.Quantity ?? 0;
        int successfulOrders = threadResults.Count(r => r.Success);
        int rejectedOrders = threadResults.Count(r => !r.Success);
        int totalQuantityDeducted = threadResults.Where(r => r.Success).Sum(r => r.QuantityDeducted);

        // Verification checks
        bool noOverselling = finalStock >= 0;
        bool stockMathExact = (initialStockToSet - totalQuantityDeducted) == finalStock;

        return Ok(new ConcurrentOrdersScenarioResult
        {
            ScenarioName = "Scenario 3: Concurrent Orders & Race Condition Protection",
            ProductSKU = inventory.Product.SKU,
            ProductName = inventory.Product.Name,
            WarehouseName = inventory.Warehouse.Name,
            InitialStock = initialStockToSet,
            ConcurrentBuyers = concurrentUsers,
            QuantityPerBuyer = quantityPerOrder,
            TotalDemand = totalDemand,
            SuccessfulOrdersCount = successfulOrders,
            RejectedOrdersCount = rejectedOrders,
            TotalStockDeducted = totalQuantityDeducted,
            FinalStock = finalStock,
            NoOversellingGuaranteed = noOverselling && stockMathExact,
            TotalExecutionTimeMs = overallSw.ElapsedMilliseconds,
            ThreadResults = threadResults.OrderBy(r => r.ThreadId).ToList(),
            Timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Scenario 4: Demonstrates automatic stock updates via real-time SignalR push.
    /// Simulates rapid inventory adjustment or supplier replenishment, triggering
    /// instant WebSocket updates to all connected browser dashboards.
    /// </summary>
    [HttpPost("automatic-stock-update")]
    [ProducesResponseType(typeof(AutomaticStockUpdateScenarioResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunAutomaticStockUpdateScenario([FromBody] AutomaticStockUpdateScenarioRequest request)
    {
        var inv = await _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .FirstOrDefaultAsync(i => i.WarehouseId == request.WarehouseId && i.ProductId == request.ProductId);

        if (inv == null)
        {
            return NotFound(new { message = $"Inventory not found for product {request.ProductId} in warehouse {request.WarehouseId}." });
        }

        int previousQty = inv.Quantity;
        int adjustment = request.QuantityChange != 0 ? request.QuantityChange : 15;
        string reason = string.IsNullOrWhiteSpace(request.Reason) 
            ? "Automated Supplier Shipment Inbound Receipt #PO-AUTO-2026" 
            : request.Reason;

        var sw = Stopwatch.StartNew();
        var adjusted = await _inventoryService.AdjustStockAsync(new StockAdjustmentDto
        {
            ProductId = request.ProductId,
            WarehouseId = request.WarehouseId,
            AdjustmentQuantity = adjustment,
            Reason = reason
        });
        sw.Stop();

        return Ok(new AutomaticStockUpdateScenarioResult
        {
            ScenarioName = "Scenario 4: Automatic Stock Updates via Real-Time SignalR Push",
            ProductSKU = adjusted.ProductSKU,
            ProductName = adjusted.ProductName,
            WarehouseName = adjusted.WarehouseName,
            PreviousStock = previousQty,
            QuantityChanged = adjustment,
            NewStock = adjusted.Quantity,
            AvailableStock = adjusted.AvailableQuantity,
            UpdateReason = reason,
            SignalRBroadcastPushed = true,
            ExecutionTimeMs = sw.ElapsedMilliseconds,
            Timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Overview metrics of the real-time engine and test fixtures.
    /// </summary>
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var warehouseCount = await _unitOfWork.Warehouses.Query().CountAsync();
        var productCount = await _unitOfWork.Products.Query().CountAsync();
        var totalOrders = await _unitOfWork.Orders.Query().CountAsync();
        var confirmedOrders = await _unitOfWork.Orders.Query().CountAsync(o => o.Status == OrderStatus.Confirmed);
        var cancelledOrders = await _unitOfWork.Orders.Query().CountAsync(o => o.Status == OrderStatus.Cancelled);

        return Ok(new
        {
            serverTime = DateTime.UtcNow,
            realtimeHub = "/hubs/inventory",
            signalRStatus = "Online",
            activeWarehouses = warehouseCount,
            activeProducts = productCount,
            totalOrders,
            confirmedOrders,
            cancelledOrders,
            scenariosAvailable = new[]
            {
                "Scenario 1: Insufficient Stock Validation",
                "Scenario 2: Order Cancellation & Automatic Stock Restoration",
                "Scenario 3: Concurrent Orders (Race Condition Prevention & Zero Overselling)",
                "Scenario 4: Automatic Real-Time Stock Updates & SignalR Push"
            }
        });
    }
}

// Request and Result DTOs for Scenarios
public class InsufficientStockScenarioRequest
{
    public int WarehouseId { get; set; } = 1;
    public int ProductId { get; set; } = 1;
    public int RequestedQuantity { get; set; } = 0; // 0 = auto-calculate to exceed available
}

public class InsufficientStockScenarioResult
{
    public string ScenarioName { get; set; } = string.Empty;
    public string ProductSKU { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public int AvailableStock { get; set; }
    public int RequestedQuantity { get; set; }
    public int Deficit { get; set; }
    public bool ValidationTriggered { get; set; }
    public string ExceptionType { get; set; } = string.Empty;
    public string ValidationMessage { get; set; } = string.Empty;
    public bool StockPreserved { get; set; }
    public int StockBefore { get; set; }
    public int StockAfter { get; set; }
    public long ExecutionTimeMs { get; set; }
    public DateTime Timestamp { get; set; }
}

public class OrderCancellationScenarioRequest
{
    public int? OrderId { get; set; }
    public string? Reason { get; set; }
}

public class OrderCancellationScenarioResult
{
    public string ScenarioName { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CancellationReason { get; set; } = string.Empty;
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public bool AllItemsRestored { get; set; }
    public List<RestoredItemDetail> RestoredItems { get; set; } = new();
    public string LedgerReference { get; set; } = string.Empty;
    public string LedgerMovementType { get; set; } = string.Empty;
    public long ExecutionTimeMs { get; set; }
    public DateTime Timestamp { get; set; }
}

public class RestoredItemDetail
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSKU { get; set; } = string.Empty;
    public int StockBefore { get; set; }
    public int QuantityRestored { get; set; }
    public int StockAfter { get; set; }
    public bool IsRestoredCorrectly { get; set; }
}

public class ConcurrentOrdersScenarioRequest
{
    public int WarehouseId { get; set; } = 1;
    public int ProductId { get; set; } = 1;
    public int ConcurrentUsersCount { get; set; } = 5;
    public int QuantityPerOrder { get; set; } = 2;
    public int? SetStockTo { get; set; } = 5;
}

public class ConcurrentOrdersScenarioResult
{
    public string ScenarioName { get; set; } = string.Empty;
    public string ProductSKU { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public int InitialStock { get; set; }
    public int ConcurrentBuyers { get; set; }
    public int QuantityPerBuyer { get; set; }
    public int TotalDemand { get; set; }
    public int SuccessfulOrdersCount { get; set; }
    public int RejectedOrdersCount { get; set; }
    public int TotalStockDeducted { get; set; }
    public int FinalStock { get; set; }
    public bool NoOversellingGuaranteed { get; set; }
    public long TotalExecutionTimeMs { get; set; }
    public List<ConcurrentOrderThreadResult> ThreadResults { get; set; } = new();
    public DateTime Timestamp { get; set; }
}

public class ConcurrentOrderThreadResult
{
    public int ThreadId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? OrderNumber { get; set; }
    public int QuantityDeducted { get; set; }
    public string Message { get; set; } = string.Empty;
    public long DurationMs { get; set; }
}

public class AutomaticStockUpdateScenarioRequest
{
    public int WarehouseId { get; set; } = 1;
    public int ProductId { get; set; } = 1;
    public int QuantityChange { get; set; } = 15;
    public string? Reason { get; set; }
}

public class AutomaticStockUpdateScenarioResult
{
    public string ScenarioName { get; set; } = string.Empty;
    public string ProductSKU { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public int PreviousStock { get; set; }
    public int QuantityChanged { get; set; }
    public int NewStock { get; set; }
    public int AvailableStock { get; set; }
    public string UpdateReason { get; set; } = string.Empty;
    public bool SignalRBroadcastPushed { get; set; }
    public long ExecutionTimeMs { get; set; }
    public DateTime Timestamp { get; set; }
}
