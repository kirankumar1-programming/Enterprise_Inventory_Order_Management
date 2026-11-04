using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory.Core.Enums;

namespace EnterpriseInventoryApi.Controllers;

[Authorize]
[Route("api/suppliers/intelligence")]
public class SupplierIntelligenceController : BaseApiController
{
    private readonly ISupplierIntelligenceService _supplierIntelligenceService;

    public SupplierIntelligenceController(ISupplierIntelligenceService supplierIntelligenceService)
    {
        _supplierIntelligenceService = supplierIntelligenceService;
    }

    [HttpGet("scorecards")]
    [ProducesResponseType(typeof(SupplierIntelligenceReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScorecards()
    {
        var report = await _supplierIntelligenceService.GetSupplierIntelligenceReportAsync();
        return Ok(report);
    }

    [HttpGet("autonomous-policies")]
    [ProducesResponseType(typeof(IEnumerable<AutonomousReorderPolicyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAutonomousPolicies()
    {
        var policies = await _supplierIntelligenceService.GetAutonomousPoliciesAsync();
        return Ok(policies);
    }

    [HttpPost("toggle-policy")]
    [Authorize(Roles = $"{AppRole.Admin},{AppRole.WarehouseManager}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TogglePolicy([FromBody] TogglePolicyRequestDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.PolicyId))
        {
            return BadRequest(new { message = "PolicyId is required." });
        }

        var success = await _supplierIntelligenceService.TogglePolicyAsync(request);
        if (!success)
        {
            return NotFound(new { message = $"Autonomous policy '{request.PolicyId}' not found." });
        }

        return Ok(new { success = true, enabled = request.Enabled });
    }
}
