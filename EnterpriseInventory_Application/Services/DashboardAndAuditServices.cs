using Microsoft.EntityFrameworkCore;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Enums;
using EnterpriseInventory.Core.Interfaces;

namespace EnterpriseInventory_Application.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetDashboardSummaryAsync();
}

public interface IAuditService
{
    Task<PagedResult<AuditLogDto>> GetAuditLogsAsync(AuditFilterParams filter);
}

public class DashboardService : IDashboardService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IInventoryService _inventoryService;

    public DashboardService(IUnitOfWork unitOfWork, IInventoryService inventoryService)
    {
        _unitOfWork = unitOfWork;
        _inventoryService = inventoryService;
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync()
    {
        var totalProducts = await _unitOfWork.Products.Query().CountAsync(p => p.IsActive);
        var totalWarehouses = await _unitOfWork.Warehouses.Query().CountAsync(w => w.IsActive);
        var totalSuppliers = await _unitOfWork.Suppliers.Query().CountAsync();

        var pendingOrdersCount = await _unitOfWork.Orders.Query().CountAsync(o => o.Status == OrderStatus.Pending);
        var confirmedOrdersCount = await _unitOfWork.Orders.Query().CountAsync(o => o.Status == OrderStatus.Confirmed);
        var deliveredOrdersCount = await _unitOfWork.Orders.Query().CountAsync(o => o.Status == OrderStatus.Delivered);

        var totalSalesRevenue = await _unitOfWork.Orders.Query()
            .Where(o => o.Status != OrderStatus.Cancelled)
            .SumAsync(o => o.TotalAmount);

        // Low stock products
        var lowStockAlerts = (await _inventoryService.GetLowStockAlertsAsync()).ToList();

        // Total inventory valuation
        var totalStockValue = await _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .SumAsync(i => i.Quantity * i.Product.CostPrice);

        // Warehouse breakdown
        var warehouses = await _unitOfWork.Warehouses.Query()
            .Include(w => w.Inventories)
            .Where(w => w.IsActive)
            .Select(w => new WarehouseStockSummaryDto
            {
                WarehouseId = w.Id,
                WarehouseCode = w.Code,
                WarehouseName = w.Name,
                Capacity = w.Capacity,
                TotalUnitsInStock = w.Inventories.Sum(i => i.Quantity)
            })
            .ToListAsync();

        // Recent orders
        var recentOrders = await _unitOfWork.Orders.Query()
            .Include(o => o.Warehouse)
            .Include(o => o.CreatedByUser)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .OrderByDescending(o => o.OrderDate)
            .Take(5)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                CustomerName = o.CustomerName,
                CustomerEmail = o.CustomerEmail,
                Status = o.Status,
                TotalAmount = o.TotalAmount,
                WarehouseId = o.WarehouseId,
                WarehouseName = o.Warehouse.Name,
                OrderDate = o.OrderDate,
                CreatedAt = o.CreatedAt
            })
            .ToListAsync();

        // Recent movements
        var recentMovements = await _unitOfWork.StockMovements.Query()
            .Include(sm => sm.Product)
            .Include(sm => sm.Warehouse)
            .Include(sm => sm.CreatedByUser)
            .OrderByDescending(sm => sm.CreatedAt)
            .Take(6)
            .Select(sm => new StockMovementDto
            {
                Id = sm.Id,
                ProductId = sm.ProductId,
                ProductName = sm.Product.Name,
                ProductSKU = sm.Product.SKU,
                WarehouseId = sm.WarehouseId,
                WarehouseName = sm.Warehouse.Name,
                MovementType = sm.MovementType.ToString(),
                Quantity = sm.Quantity,
                BalanceAfter = sm.BalanceAfter,
                ReferenceNumber = sm.ReferenceNumber,
                Notes = sm.Notes,
                CreatedByUserName = sm.CreatedByUser != null ? sm.CreatedByUser.FullName : "System",
                CreatedAt = sm.CreatedAt
            })
            .ToListAsync();

        return new DashboardSummaryDto
        {
            TotalProducts = totalProducts,
            TotalWarehouses = totalWarehouses,
            TotalSuppliers = totalSuppliers,
            LowStockItemCount = lowStockAlerts.Count,
            PendingOrdersCount = pendingOrdersCount,
            ConfirmedOrdersCount = confirmedOrdersCount,
            DeliveredOrdersCount = deliveredOrdersCount,
            TotalStockInventoryValue = totalStockValue,
            TotalSalesRevenue = totalSalesRevenue,
            WarehouseBreakdown = warehouses,
            TopLowStockAlerts = lowStockAlerts.Take(5).ToList(),
            RecentOrders = recentOrders,
            RecentMovements = recentMovements
        };
    }
}

public class AuditService : IAuditService
{
    private readonly IUnitOfWork _unitOfWork;

    public AuditService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedResult<AuditLogDto>> GetAuditLogsAsync(AuditFilterParams filter)
    {
        var query = _unitOfWork.AuditLogs.Query().AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.EntityName))
        {
            query = query.Where(a => a.EntityName.ToLower() == filter.EntityName.ToLower().Trim());
        }

        if (!string.IsNullOrWhiteSpace(filter.Action))
        {
            query = query.Where(a => a.Action.ToLower().Contains(filter.Action.ToLower().Trim()));
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(a => a.Timestamp >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(a => a.Timestamp <= filter.ToDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var search = filter.SearchTerm.Trim().ToLower();
            query = query.Where(a => a.EntityId.ToLower().Contains(search) || 
                                     (a.UserEmail != null && a.UserEmail.ToLower().Contains(search)) ||
                                     (a.ChangesJson != null && a.ChangesJson.ToLower().Contains(search)));
        }

        var total = await query.CountAsync();
        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                EntityName = a.EntityName,
                EntityId = a.EntityId,
                Action = a.Action,
                UserId = a.UserId,
                UserEmail = a.UserEmail,
                ChangesJson = a.ChangesJson,
                Timestamp = a.Timestamp,
                IpAddress = a.IpAddress
            })
            .ToListAsync();

        return new PagedResult<AuditLogDto>(logs, total, filter.PageNumber, filter.PageSize);
    }
}

