using System;
using System.Collections.Generic;

namespace EnterpriseInventory_Application.DTOs;

public enum SupplierTier
{
    Tier1Gold = 1,
    Tier2Silver = 2,
    Tier3Standard = 3,
    HighRisk = 4
}

public class SupplierScorecardDto
{
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public SupplierTier Tier { get; set; }
    public string TierName { get; set; } = string.Empty;
    public int ReliabilityScore { get; set; } // 0-100%
    public double OnTimeDeliveryProbability { get; set; } // 0.0 to 1.0 (e.g. 0.94)
    public int AverageLeadTimeDays { get; set; }
    public double LeadTimeVarianceDays { get; set; }
    public int SuppliedProductsCount { get; set; }
    public List<string> ActiveRiskAlerts { get; set; } = new();
    public int? RecommendedAlternateSupplierId { get; set; }
    public string? RecommendedAlternateSupplierName { get; set; }
}

public class SupplierIntelligenceReportDto
{
    public int TotalSuppliersEvaluated { get; set; }
    public double AverageNetworkReliability { get; set; } // e.g. 91.5%
    public int HighRiskVendorsCount { get; set; }
    public DateTime EvaluationTimestamp { get; set; }
    public List<SupplierScorecardDto> Scorecards { get; set; } = new();
}

public class AutonomousReorderPolicyDto
{
    public string PolicyId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public decimal MaxAutoApproveValue { get; set; }
    public int RunwayThresholdDays { get; set; }
    public DateTime LastEvaluatedAt { get; set; }
    public int TotalOrdersAutoDrafted { get; set; }
}

public class TogglePolicyRequestDto
{
    public string PolicyId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}
