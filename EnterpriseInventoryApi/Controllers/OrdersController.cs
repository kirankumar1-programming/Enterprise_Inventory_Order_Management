using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory_Application.Services;
using EnterpriseInventory.Core.Enums;

namespace EnterpriseInventoryApi.Controllers;

[Authorize]
public class OrdersController : BaseApiController
{
    private readonly IOrderService _orderService;
    private readonly IDocumentIntelligenceService _docService;

    public OrdersController(IOrderService orderService, IDocumentIntelligenceService docService)
    {
        _orderService = orderService;
        _docService = docService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<OrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders([FromQuery] OrderFilterParams filter)
    {
        var result = await _orderService.GetOrdersAsync(filter);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrderById(int id)
    {
        var order = await _orderService.GetOrderByIdAsync(id);
        return Ok(order);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRole.Admin},{AppRole.SalesRepresentative},{AppRole.WarehouseManager}")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        var order = await _orderService.CreateOrderAsync(dto);
        return CreatedAtAction(nameof(GetOrderById), new { id = order.Id }, order);
    }

    [HttpPost("ingest-document")]
    [Authorize(Roles = $"{AppRole.Admin},{AppRole.SalesRepresentative},{AppRole.WarehouseManager}")]
    [ProducesResponseType(typeof(ExtractedOrderDocumentDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> IngestDocument([FromForm] IFormFile? file, [FromForm] string? sampleId, [FromForm] int? warehouseId)
    {
        if (!string.IsNullOrEmpty(sampleId))
        {
            var sample = await _docService.IngestSampleDocumentAsync(sampleId, warehouseId);
            return Ok(sample);
        }

        if (file == null || file.Length == 0)
        {
            var fallback = await _docService.IngestSampleDocumentAsync("sample-po-dell", warehouseId);
            return Ok(fallback);
        }

        using var stream = file.OpenReadStream();
        var result = await _docService.IngestDocumentAsync(stream, file.FileName, file.ContentType, warehouseId);
        return Ok(result);
    }

    [HttpGet("ingest-document/samples")]
    public IActionResult GetDocumentSamples()
    {
        return Ok(_docService.GetSampleDocuments());
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = $"{AppRole.Admin},{AppRole.WarehouseManager},{AppRole.SalesRepresentative}")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var updated = await _orderService.UpdateOrderStatusAsync(id, dto);
        return Ok(updated);
    }

    [HttpPost("{id}/cancel")]
    [Authorize(Roles = $"{AppRole.Admin},{AppRole.SalesRepresentative},{AppRole.WarehouseManager}")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelOrder(int id, [FromBody] CancelOrderRequest? request)
    {
        var cancelled = await _orderService.CancelOrderAsync(id, request?.Reason);
        return Ok(cancelled);
    }
}

public class CancelOrderRequest
{
    public string? Reason { get; set; }
}

