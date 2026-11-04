using System;
using System.Collections.Generic;

namespace EnterpriseInventory_Application.DTOs;

public class DocumentIngestRequestDto
{
    public string? SampleId { get; set; }
    public string? FileName { get; set; }
    public string? Base64Content { get; set; }
    public int? PreferredWarehouseId { get; set; }
}

public class ExtractedLineItemDto
{
    public int Id { get; set; }
    public string RawDescription { get; set; } = string.Empty;
    public string? ExtractedSku { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal => Quantity * UnitPrice;
    
    public int? MatchedProductId { get; set; }
    public string? MatchedProductName { get; set; }
    public string? MatchedProductSku { get; set; }
    public double MatchConfidence { get; set; }
    public string MatchReason { get; set; } = string.Empty;
    
    public int WarehouseAvailableStock { get; set; }
    public bool IsStockSufficient => WarehouseAvailableStock >= Quantity;
}

public class ExtractedOrderDocumentDto
{
    public string DocumentType { get; set; } = "Purchase Order";
    public string DocumentReferenceNumber { get; set; } = string.Empty;
    public DateTime DocumentDate { get; set; } = DateTime.UtcNow;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string ShippingAddress { get; set; } = string.Empty;
    public int SuggestedWarehouseId { get; set; }
    public string SuggestedWarehouseName { get; set; } = string.Empty;
    
    public List<ExtractedLineItemDto> Items { get; set; } = new();
    public decimal SubTotal { get; set; }
    public decimal Tax { get; set; }
    public decimal TotalAmount { get; set; }
    public double OverallConfidence { get; set; }
    public string ExtractionNotes { get; set; } = string.Empty;
}

public class SampleDocumentOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public decimal EstimatedTotal { get; set; }
}

public class CopilotQueryRequestDto
{
    public string Query { get; set; } = string.Empty;
    public string? CurrentPage { get; set; }
    public int? WarehouseId { get; set; }
}

public class CopilotActionDto
{
    public string Label { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public Dictionary<string, string>? QueryParams { get; set; }
    public string Icon { get; set; } = "🔍";
}

public class CopilotQueryResponseDto
{
    public string AnswerMarkdown { get; set; } = string.Empty;
    public string Intent { get; set; } = "General";
    public object? DataPayload { get; set; }
    public List<CopilotActionDto> SuggestedActions { get; set; } = new();
    public List<string> FollowUpQuestions { get; set; } = new();
}
