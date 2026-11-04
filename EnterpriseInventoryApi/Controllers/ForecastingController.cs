using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;

namespace EnterpriseInventoryApi.Controllers;

[Route("api/inventory/forecasting")]
public class ForecastingController : BaseApiController
{
    private readonly IForecastingService _forecastingService;

    public ForecastingController(IForecastingService forecastingService)
    {
        _forecastingService = forecastingService;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(ProductForecastSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary([FromQuery] int? warehouseId)
    {
        var summary = await _forecastingService.GetForecastSummaryAsync(warehouseId);
        return Ok(summary);
    }

    [HttpGet("recommendations")]
    [ProducesResponseType(typeof(IEnumerable<RestockRecommendationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecommendations([FromQuery] int? warehouseId)
    {
        var recs = await _forecastingService.GetRestockRecommendationsAsync(warehouseId);
        return Ok(recs);
    }

    [HttpGet("overstock")]
    [ProducesResponseType(typeof(IEnumerable<OverstockAlertDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverstockAlerts([FromQuery] int? warehouseId)
    {
        var alerts = await _forecastingService.GetOverstockAlertsAsync(warehouseId);
        return Ok(alerts);
    }

    [HttpGet("product/{productId}")]
    [ProducesResponseType(typeof(RestockRecommendationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProductRunway(int productId, [FromQuery] int? warehouseId)
    {
        var runway = await _forecastingService.GetProductRunwayAsync(productId, warehouseId);
        if (runway == null)
        {
            return NotFound(new { message = $"No dynamic forecast found for product ID {productId}." });
        }
        return Ok(runway);
    }

    [HttpPost("generate-po-draft")]
    [ProducesResponseType(typeof(RestockPoDraftDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GeneratePoDraft([FromBody] GeneratePoDraftRequestDto request)
    {
        var draft = await _forecastingService.GenerateRestockPoDraftAsync(request);
        return Ok(draft);
    }
}
