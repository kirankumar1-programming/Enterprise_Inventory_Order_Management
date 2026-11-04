using System;
using System.Collections.Generic;

namespace EnterpriseInventory_Application.DTOs;

public class DuplicateCheckRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string? Description { get; set; }
    public int? CurrentProductId { get; set; } // If editing an existing product
}

public class DuplicateProductMatchDto
{
    public int ProductId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public double SimilarityScore { get; set; } // 0.0 to 1.0 (e.g. 0.85 = 85% match)
    public string MatchReason { get; set; } = string.Empty;
}

public class DuplicateCheckResponseDto
{
    public bool HasLikelyDuplicates { get; set; }
    public IEnumerable<DuplicateProductMatchDto> Matches { get; set; } = new List<DuplicateProductMatchDto>();
}

public class SuggestCategoryRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CategorySuggestionDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public double ConfidenceScore { get; set; } // 0.0 to 1.0
    public string Explanation { get; set; } = string.Empty;
}

public class CatalogDuplicatePairDto
{
    public int ProductAId { get; set; }
    public string ProductASku { get; set; } = string.Empty;
    public string ProductAName { get; set; } = string.Empty;
    public string ProductACategory { get; set; } = string.Empty;
    public decimal ProductAPrice { get; set; }

    public int ProductBId { get; set; }
    public string ProductBSku { get; set; } = string.Empty;
    public string ProductBName { get; set; } = string.Empty;
    public string ProductBCategory { get; set; } = string.Empty;
    public decimal ProductBPrice { get; set; }

    public double SimilarityScore { get; set; }
    public string SimilarityReason { get; set; } = string.Empty;
}

public class CategoryMisclassificationAlertDto
{
    public int ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string CurrentCategory { get; set; } = string.Empty;
    public string SuggestedCategory { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class CatalogAuditReportDto
{
    public int TotalProductsScanned { get; set; }
    public int PotentialDuplicatePairsCount { get; set; }
    public int CategoryAnomaliesCount { get; set; }
    public int CatalogQualityScore { get; set; } // 0 - 100%
    public DateTime ScanTimestamp { get; set; }
    public List<CatalogDuplicatePairDto> DuplicatePairs { get; set; } = new();
    public List<CategoryMisclassificationAlertDto> MisclassificationAlerts { get; set; } = new();
}
