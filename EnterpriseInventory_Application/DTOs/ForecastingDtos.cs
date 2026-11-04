using System;
using System.Collections.Generic;

namespace EnterpriseInventory_Application.DTOs;

public enum StockUrgencyLevel
{
    Critical = 1,      // < 3 days of stock remaining
    RestockAdvised = 2,// < Lead time + safety buffer (e.g. < 7-14 days)
    Healthy = 3,       // 15 - 60 days
    Overstocked = 4    // > 60 days of stock without high turnover
}

public class RestockRecommendationDto
{
    public int ProductId { get; set; }
    public string ProductSKU { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public int ReservedStock { get; set; }
    public int AvailableStock { get; set; }
    public double DailyBurnRate { get; set; }
    public int SupplierLeadTimeDays { get; set; }
    public int DynamicSafetyStock { get; set; }
    public int DynamicReorderPoint { get; set; }
    public double DaysOfStockRemaining { get; set; }
    public DateTime? PredictedStockoutDate { get; set; }
    public int RecommendedOrderQuantity { get; set; }
    public StockUrgencyLevel Urgency { get; set; }
    public string? SupplierName { get; set; }
    public decimal UnitCostPrice { get; set; }
    public decimal EstimatedOrderCost => RecommendedOrderQuantity * UnitCostPrice;
}

public class OverstockAlertDto
{
    public int ProductId { get; set; }
    public string ProductSKU { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public double DailyBurnRate { get; set; }
    public double DaysOfStockRemaining { get; set; }
    public int ExcessQuantity { get; set; }
    public decimal CapitalTiedUp { get; set; }
    public string Recommendation { get; set; } = string.Empty;
}

public class ProductForecastSummaryDto
{
    public int TotalAtRiskItems { get; set; }
    public int CriticalItemsCount { get; set; }
    public int OverstockedItemsCount { get; set; }
    public decimal TotalCapitalInOverstock { get; set; }
    public IEnumerable<RestockRecommendationDto> HighPriorityRecommendations { get; set; } = new List<RestockRecommendationDto>();
}

public class RestockPoDraftItemDto
{
    public int ProductId { get; set; }
    public string ProductSKU { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int QuantityToOrder { get; set; }
    public decimal UnitCostPrice { get; set; }
    public decimal TotalCost => QuantityToOrder * UnitCostPrice;
    public string SupplierName { get; set; } = string.Empty;
    public int SupplierLeadTimeDays { get; set; }
}

public class RestockPoDraftDto
{
    public string PoReferenceNumber { get; set; } = string.Empty;
    public DateTime GeneratedDate { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public List<RestockPoDraftItemDto> Items { get; set; } = new();
    public decimal GrandTotalCost { get; set; }
    public DateTime EstimatedDeliveryDate { get; set; }
}

public class GeneratePoDraftRequestDto
{
    public int? WarehouseId { get; set; }
    public List<int>? ProductIds { get; set; }
}
