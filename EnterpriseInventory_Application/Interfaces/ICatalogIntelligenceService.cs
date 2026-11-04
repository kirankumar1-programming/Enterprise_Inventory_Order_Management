using System.Collections.Generic;
using System.Threading.Tasks;
using EnterpriseInventory_Application.DTOs;

namespace EnterpriseInventory_Application.Interfaces;

public interface ICatalogIntelligenceService
{
    Task<DuplicateCheckResponseDto> DetectDuplicatesAsync(DuplicateCheckRequestDto request);
    Task<CategorySuggestionDto?> SuggestCategoryAsync(SuggestCategoryRequestDto request);
    Task<CatalogAuditReportDto> GetCatalogAuditReportAsync();
}
