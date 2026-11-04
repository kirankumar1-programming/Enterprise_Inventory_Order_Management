using System;
using System.Collections.Generic;

namespace EnterpriseInventory_Application.DTOs;

public enum AnomalySeverity
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum AnomalyType
{
    OffHoursWriteOff = 1,
    HighVolumeAdjustment = 2,
    RapidOrderCancellation = 3,
    TransferDiscrepancy = 4,
    UnusualShrinkageSpike = 5
}

public class InventoryAnomalyDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public AnomalyType Type { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public AnomalySeverity Severity { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int DiscrepancyQuantity { get; set; }
    public decimal EstimatedFinancialExposure { get; set; }
    public string Description { get; set; } = string.Empty;
    public int RiskScore { get; set; } // 0-100
    public bool IsResolved { get; set; }
    public string? ResolutionNotes { get; set; }
}

public class AnomalyRadarReportDto
{
    public string OverallRiskLevel { get; set; } = "Low";
    public int TotalAnomaliesCount { get; set; }
    public int CriticalCount { get; set; }
    public int HighCount { get; set; }
    public decimal EstimatedTotalExposure { get; set; }
    public DateTime ScanTimestamp { get; set; }
    public List<InventoryAnomalyDto> Anomalies { get; set; } = new();
}

public class ResolveAnomalyRequestDto
{
    public string AnomalyId { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}
