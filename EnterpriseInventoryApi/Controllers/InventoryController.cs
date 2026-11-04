using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Services;
using EnterpriseInventory.Core.Enums;

namespace EnterpriseInventoryApi.Controllers;

[Authorize]
public class InventoryController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<InventoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllInventories(
        [FromQuery] int? warehouseId,
        [FromQuery] int? productId,
        [FromQuery] bool? lowStockOnly,
        [FromQuery] PaginationParams pagination)
    {
        var result = await _inventoryService.GetAllInventoriesAsync(warehouseId, productId, lowStockOnly, pagination);
        return Ok(result);
    }

    [HttpGet("warehouse/{warehouseId}")]
    [ProducesResponseType(typeof(IEnumerable<InventoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByWarehouse(int warehouseId)
    {
        var result = await _inventoryService.GetInventoryByWarehouseAsync(warehouseId);
        return Ok(result);
    }

    [HttpGet("product/{productId}")]
    [ProducesResponseType(typeof(IEnumerable<InventoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByProduct(int productId)
    {
        var result = await _inventoryService.GetInventoryByProductAsync(productId);
        return Ok(result);
    }

    [HttpGet("low-stock-alerts")]
    [ProducesResponseType(typeof(IEnumerable<LowStockAlertDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLowStockAlerts()
    {
        var result = await _inventoryService.GetLowStockAlertsAsync();
        return Ok(result);
    }

    [HttpPost("adjust")]
    [Authorize(Roles = $"{AppRole.Admin},{AppRole.WarehouseManager}")]
    [ProducesResponseType(typeof(InventoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AdjustStock([FromBody] StockAdjustmentDto dto)
    {
        var result = await _inventoryService.AdjustStockAsync(dto);
        return Ok(result);
    }

    [HttpPost("transfer")]
    [Authorize(Roles = $"{AppRole.Admin},{AppRole.WarehouseManager}")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> TransferStock([FromBody] StockTransferDto dto)
    {
        var result = await _inventoryService.TransferStockAsync(dto);
        return Ok(new { success = result, message = "Stock transferred successfully." });
    }

    [HttpGet("movements")]
    [ProducesResponseType(typeof(PagedResult<StockMovementDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStockMovements(
        [FromQuery] int? productId,
        [FromQuery] int? warehouseId,
        [FromQuery] PaginationParams pagination)
    {
        var result = await _inventoryService.GetStockMovementsAsync(productId, warehouseId, pagination);
        return Ok(result);
    }
}

