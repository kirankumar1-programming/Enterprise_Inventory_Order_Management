using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;

namespace EnterpriseInventoryApi.Controllers;

[Route("api/products/intelligence")]
public class CatalogIntelligenceController : BaseApiController
{
    private readonly ICatalogIntelligenceService _catalogIntelligenceService;

    public CatalogIntelligenceController(ICatalogIntelligenceService catalogIntelligenceService)
    {
        _catalogIntelligenceService = catalogIntelligenceService;
    }

    [HttpPost("detect-duplicates")]
    [ProducesResponseType(typeof(DuplicateCheckResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DetectDuplicates([FromBody] DuplicateCheckRequestDto request)
    {
        var result = await _catalogIntelligenceService.DetectDuplicatesAsync(request);
        return Ok(result);
    }

    [HttpPost("suggest-category")]
    [ProducesResponseType(typeof(CategorySuggestionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SuggestCategory([FromBody] SuggestCategoryRequestDto request)
    {
        var suggestion = await _catalogIntelligenceService.SuggestCategoryAsync(request);
        if (suggestion == null)
        {
            return NotFound(new { message = "No category recommendation available." });
        }
        return Ok(suggestion);
    }

    [HttpGet("audit")]
    [ProducesResponseType(typeof(CatalogAuditReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCatalogAudit()
    {
        var report = await _catalogIntelligenceService.GetCatalogAuditReportAsync();
        return Ok(report);
    }
}
