using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;

namespace EnterpriseInventoryApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AiController : BaseApiController
{
    private readonly IDocumentIntelligenceService _docService;
    private readonly IAiCopilotService _copilotService;

    public AiController(IDocumentIntelligenceService docService, IAiCopilotService copilotService)
    {
        _docService = docService;
        _copilotService = copilotService;
    }

    [HttpGet("document-samples")]
    [ProducesResponseType(typeof(IEnumerable<SampleDocumentOptionDto>), StatusCodes.Status200OK)]
    public IActionResult GetDocumentSamples()
    {
        var samples = _docService.GetSampleDocuments();
        return Ok(samples);
    }

    [HttpPost("ingest-document")]
    [ProducesResponseType(typeof(ExtractedOrderDocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> IngestDocument([FromForm] IFormFile? file, [FromForm] string? sampleId, [FromForm] int? warehouseId)
    {
        if (!string.IsNullOrEmpty(sampleId))
        {
            var sampleResult = await _docService.IngestSampleDocumentAsync(sampleId, warehouseId);
            return Ok(sampleResult);
        }

        if (file == null || file.Length == 0)
        {
            // Default to first sample if no file is provided
            var fallbackResult = await _docService.IngestSampleDocumentAsync("sample-po-dell", warehouseId);
            return Ok(fallbackResult);
        }

        using var stream = file.OpenReadStream();
        var result = await _docService.IngestDocumentAsync(stream, file.FileName, file.ContentType, warehouseId);
        return Ok(result);
    }

    [HttpPost("copilot/query")]
    [ProducesResponseType(typeof(CopilotQueryResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> QueryCopilot([FromBody] CopilotQueryRequestDto request)
    {
        var result = await _copilotService.ProcessQueryAsync(request);
        return Ok(result);
    }
}
