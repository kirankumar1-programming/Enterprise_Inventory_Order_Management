using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory.Core.Enums;

namespace EnterpriseInventoryApi.Controllers;

[Authorize]
[Route("api/audit/anomalies")]
public class AnomalyController : BaseApiController
{
    private readonly IAnomalyDetectionService _anomalyService;

    public AnomalyController(IAnomalyDetectionService anomalyService)
    {
        _anomalyService = anomalyService;
    }

    [HttpGet("radar")]
    [ProducesResponseType(typeof(AnomalyRadarReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRadarReport()
    {
        var report = await _anomalyService.GetAnomalyRadarReportAsync();
        return Ok(report);
    }

    [HttpPost("resolve")]
    [Authorize(Roles = $"{AppRole.Admin},{AppRole.Auditor},{AppRole.WarehouseManager}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResolveAnomaly([FromBody] ResolveAnomalyRequestDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.AnomalyId))
        {
            return BadRequest(new { message = "AnomalyId is required." });
        }

        var success = await _anomalyService.ResolveAnomalyAsync(request);
        if (!success)
        {
            return NotFound(new { message = $"Anomaly with ID '{request.AnomalyId}' was not found or already resolved." });
        }

        return Ok(new { success = true, message = $"Anomaly {request.AnomalyId} marked as resolved." });
    }
}
