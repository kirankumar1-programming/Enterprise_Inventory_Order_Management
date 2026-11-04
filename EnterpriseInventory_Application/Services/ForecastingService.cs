using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Enums;
using EnterpriseInventory.Core.Interfaces;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;

namespace EnterpriseInventory_Application.Services;

public class ForecastingService : IForecastingService
{
    private readonly IUnitOfWork _unitOfWork;

    public ForecastingService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ProductForecastSummaryDto> GetForecastSummaryAsync(int? warehouseId = null)
    {
        var recommendations = (await GetRestockRecommendationsAsync(warehouseId)).ToList();
        var overstock = (await GetOverstockAlertsAsync(warehouseId)).ToList();

        return new ProductForecastSummaryDto
        {
            TotalAtRiskItems = recommendations.Count,
            CriticalItemsCount = recommendations.Count(r => r.Urgency == StockUrgencyLevel.Critical),
            OverstockedItemsCount = overstock.Count,
            TotalCapitalInOverstock = overstock.Sum(o => o.CapitalTiedUp),
            HighPriorityRecommendations = recommendations.Take(10)
        };
    }

    public async Task<IEnumerable<RestockRecommendationDto>> GetRestockRecommendationsAsync(int? warehouseId = null)
    {
        var now = DateTime.UtcNow;
        var lookbackPeriodDays = 30;
        var windowStart = now.AddDays(-lookbackPeriodDays);

        // Fetch inventories with product and warehouse details
        var inventoryQuery = _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .Include(i => i.Product)
                .ThenInclude(p => p.Supplier)
            .Include(i => i.Warehouse)
            .Where(i => i.Product.IsActive && i.Warehouse.IsActive);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            inventoryQuery = inventoryQuery.Where(i => i.WarehouseId == warehouseId.Value);
        }

        var inventories = await inventoryQuery.ToListAsync();
        if (!inventories.Any())
        {
            return Enumerable.Empty<RestockRecommendationDto>();
        }

        // Fetch sales velocity from confirmed/delivered orders in window
        var productIds = inventories.Select(i => i.ProductId).Distinct().ToList();
        var salesQuery = await _unitOfWork.OrderItems.Query()
            .Include(oi => oi.Order)
            .Where(oi => productIds.Contains(oi.ProductId)
                         && oi.Order.OrderDate >= windowStart
                         && oi.Order.Status != OrderStatus.Cancelled)
            .GroupBy(oi => oi.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                TotalQuantitySold = g.Sum(x => x.Quantity)
            })
            .ToDictionaryAsync(x => x.ProductId, x => x.TotalQuantitySold);

        var recommendations = new List<RestockRecommendationDto>();

        foreach (var inv in inventories)
        {
            var product = inv.Product;
            var available = inv.AvailableQuantity;

            // Sales in last 30 days
            var soldLast30Days = salesQuery.TryGetValue(inv.ProductId, out var qty) ? qty : 0;
            // Daily burn rate with floor to avoid 0 for products with low frequency
            var dailyBurnRate = Math.Round((double)soldLast30Days / lookbackPeriodDays, 2);
            if (dailyBurnRate <= 0)
            {
                // Fallback estimated baseline based on reorder level
                dailyBurnRate = Math.Round(Math.Max(0.2, product.ReorderLevel / 30.0), 2);
            }

            // Lead time: default 7 days unless specified
            var leadTimeDays = 7;
            // Dynamic safety stock calculation (Z=1.65 for 95% service level)
            var dynamicSafetyStock = (int)Math.Ceiling(1.65 * Math.Sqrt(leadTimeDays) * Math.Max(1.0, dailyBurnRate * 0.7));
            var dynamicROP = (int)Math.Ceiling((dailyBurnRate * leadTimeDays) + dynamicSafetyStock);

            var daysRemaining = dailyBurnRate > 0 
                ? Math.Round(available / dailyBurnRate, 1) 
                : 999.0;

            StockUrgencyLevel urgency;
            if (daysRemaining <= 3 || available <= 0)
            {
                urgency = StockUrgencyLevel.Critical;
            }
            else if (daysRemaining <= (leadTimeDays + 5) || available <= dynamicROP)
            {
                urgency = StockUrgencyLevel.RestockAdvised;
            }
            else if (daysRemaining > 60)
            {
                urgency = StockUrgencyLevel.Overstocked;
            }
            else
            {
                urgency = StockUrgencyLevel.Healthy;
            }

            // Filter for items requiring restock (Critical or RestockAdvised)
            if (urgency == StockUrgencyLevel.Critical || urgency == StockUrgencyLevel.RestockAdvised)
            {
                var targetInventory = (int)Math.Ceiling(30 * dailyBurnRate); // Target 30-day stock cover
                var recommendedOrderQty = Math.Max(product.ReorderLevel * 2, targetInventory - available);

                recommendations.Add(new RestockRecommendationDto
                {
                    ProductId = product.Id,
                    ProductSKU = product.SKU,
                    ProductName = product.Name,
                    CategoryName = product.Category?.Name ?? "Unassigned",
                    WarehouseId = inv.WarehouseId,
                    WarehouseName = inv.Warehouse?.Name ?? "Main Facility",
                    CurrentStock = inv.Quantity,
                    ReservedStock = inv.ReservedQuantity,
                    AvailableStock = available,
                    DailyBurnRate = dailyBurnRate,
                    SupplierLeadTimeDays = leadTimeDays,
                    DynamicSafetyStock = dynamicSafetyStock,
                    DynamicReorderPoint = dynamicROP,
                    DaysOfStockRemaining = daysRemaining,
                    PredictedStockoutDate = daysRemaining < 365 ? now.AddDays(daysRemaining) : null,
                    RecommendedOrderQuantity = recommendedOrderQty,
                    Urgency = urgency,
                    SupplierName = product.Supplier?.Name,
                    UnitCostPrice = product.CostPrice
                });
            }
        }

        return recommendations.OrderBy(r => r.Urgency).ThenBy(r => r.DaysOfStockRemaining);
    }

    public async Task<IEnumerable<OverstockAlertDto>> GetOverstockAlertsAsync(int? warehouseId = null)
    {
        var lookbackPeriodDays = 30;
        var now = DateTime.UtcNow;
        var windowStart = now.AddDays(-lookbackPeriodDays);

        var inventoryQuery = _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .Where(i => i.Product.IsActive && i.Warehouse.IsActive);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            inventoryQuery = inventoryQuery.Where(i => i.WarehouseId == warehouseId.Value);
        }

        var inventories = await inventoryQuery.ToListAsync();
        var productIds = inventories.Select(i => i.ProductId).Distinct().ToList();

        var salesQuery = await _unitOfWork.OrderItems.Query()
            .Include(oi => oi.Order)
            .Where(oi => productIds.Contains(oi.ProductId)
                         && oi.Order.OrderDate >= windowStart
                         && oi.Order.Status != OrderStatus.Cancelled)
            .GroupBy(oi => oi.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                TotalQuantitySold = g.Sum(x => x.Quantity)
            })
            .ToDictionaryAsync(x => x.ProductId, x => x.TotalQuantitySold);

        var overstockAlerts = new List<OverstockAlertDto>();

        foreach (var inv in inventories)
        {
            var product = inv.Product;
            var available = inv.AvailableQuantity;
            var soldLast30Days = salesQuery.TryGetValue(inv.ProductId, out var qty) ? qty : 0;
            var dailyBurnRate = Math.Round((double)soldLast30Days / lookbackPeriodDays, 2);

            if (dailyBurnRate <= 0.05 && available > (product.ReorderLevel * 3))
            {
                var healthyStockTarget = Math.Max(product.ReorderLevel, 5);
                var excess = Math.Max(0, available - healthyStockTarget);
                var capitalTiedUp = excess * product.CostPrice;

                overstockAlerts.Add(new OverstockAlertDto
                {
                    ProductId = product.Id,
                    ProductSKU = product.SKU,
                    ProductName = product.Name,
                    WarehouseId = inv.WarehouseId,
                    WarehouseName = inv.Warehouse?.Name ?? "Warehouse",
                    CurrentStock = inv.Quantity,
                    DailyBurnRate = dailyBurnRate,
                    DaysOfStockRemaining = 180.0,
                    ExcessQuantity = excess,
                    CapitalTiedUp = capitalTiedUp,
                    Recommendation = "Stagnant inventory: Consider promotional bundling, warehouse transfer, or vendor return."
                });
            }
            else if (dailyBurnRate > 0)
            {
                var daysRemaining = Math.Round(available / dailyBurnRate, 1);
                if (daysRemaining > 75 && available > 50)
                {
                    var target60Days = (int)Math.Ceiling(60 * dailyBurnRate);
                    var excess = Math.Max(0, available - target60Days);
                    var capitalTiedUp = excess * product.CostPrice;

                    if (excess > 10)
                    {
                        overstockAlerts.Add(new OverstockAlertDto
                        {
                            ProductId = product.Id,
                            ProductSKU = product.SKU,
                            ProductName = product.Name,
                            WarehouseId = inv.WarehouseId,
                            WarehouseName = inv.Warehouse?.Name ?? "Warehouse",
                            CurrentStock = inv.Quantity,
                            DailyBurnRate = dailyBurnRate,
                            DaysOfStockRemaining = daysRemaining,
                            ExcessQuantity = excess,
                            CapitalTiedUp = capitalTiedUp,
                            Recommendation = $"Overstocked ({daysRemaining:F0} days runway). Pause reorders until inventory normalizes below 45 days."
                        });
                    }
                }
            }
        }

        return overstockAlerts.OrderByDescending(o => o.CapitalTiedUp);
    }

    public async Task<RestockRecommendationDto?> GetProductRunwayAsync(int productId, int? warehouseId = null)
    {
        var allRecs = await GetRestockRecommendationsAsync(warehouseId);
        return allRecs.FirstOrDefault(r => r.ProductId == productId);
    }

    public async Task<RestockPoDraftDto> GenerateRestockPoDraftAsync(GeneratePoDraftRequestDto request)
    {
        var allRecs = (await GetRestockRecommendationsAsync(request.WarehouseId)).ToList();
        if (request.ProductIds != null && request.ProductIds.Any())
        {
            allRecs = allRecs.Where(r => request.ProductIds.Contains(r.ProductId)).ToList();
        }

        var warehouseName = allRecs.FirstOrDefault()?.WarehouseName ?? "Primary Fulfillment Hub";
        var warehouseId = request.WarehouseId ?? allRecs.FirstOrDefault()?.WarehouseId ?? 1;

        var items = allRecs.Select(r => new RestockPoDraftItemDto
        {
            ProductId = r.ProductId,
            ProductSKU = r.ProductSKU,
            ProductName = r.ProductName,
            WarehouseId = r.WarehouseId,
            WarehouseName = r.WarehouseName,
            QuantityToOrder = r.RecommendedOrderQuantity,
            UnitCostPrice = r.UnitCostPrice,
            SupplierName = r.SupplierName ?? "Authorized Wholesale Distributor",
            SupplierLeadTimeDays = r.SupplierLeadTimeDays
        }).ToList();

        var maxLeadTime = items.Any() ? items.Max(i => i.SupplierLeadTimeDays) : 7;
        var poRef = $"PO-RESTOCK-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";

        return new RestockPoDraftDto
        {
            PoReferenceNumber = poRef,
            GeneratedDate = DateTime.UtcNow,
            WarehouseId = warehouseId,
            WarehouseName = warehouseName,
            SupplierName = items.FirstOrDefault()?.SupplierName ?? "Various Suppliers",
            Items = items,
            GrandTotalCost = items.Sum(i => i.TotalCost),
            EstimatedDeliveryDate = DateTime.UtcNow.AddDays(maxLeadTime)
        };
    }
}
