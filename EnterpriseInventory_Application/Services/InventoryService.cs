using Microsoft.EntityFrameworkCore;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Enums;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory.Core.Interfaces;

namespace EnterpriseInventory_Application.Services;

public interface IInventoryService
{
    Task<IEnumerable<InventoryDto>> GetInventoryByWarehouseAsync(int warehouseId);
    Task<IEnumerable<InventoryDto>> GetInventoryByProductAsync(int productId);
    Task<PagedResult<InventoryDto>> GetAllInventoriesAsync(int? warehouseId, int? productId, bool? lowStockOnly, PaginationParams pagination);
    Task<IEnumerable<LowStockAlertDto>> GetLowStockAlertsAsync();
    Task<InventoryDto> AdjustStockAsync(StockAdjustmentDto dto);
    Task<bool> TransferStockAsync(StockTransferDto dto);
    Task<PagedResult<StockMovementDto>> GetStockMovementsAsync(int? productId, int? warehouseId, PaginationParams pagination);
}

public class InventoryService : IInventoryService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public InventoryService(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<IEnumerable<InventoryDto>> GetInventoryByWarehouseAsync(int warehouseId)
    {
        return await _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .Where(i => i.WarehouseId == warehouseId)
            .Select(i => MapToDto(i))
            .ToListAsync();
    }

    public async Task<IEnumerable<InventoryDto>> GetInventoryByProductAsync(int productId)
    {
        return await _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .Where(i => i.ProductId == productId)
            .Select(i => MapToDto(i))
            .ToListAsync();
    }

    public async Task<PagedResult<InventoryDto>> GetAllInventoriesAsync(int? warehouseId, int? productId, bool? lowStockOnly, PaginationParams pagination)
    {
        var query = _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .AsNoTracking();

        if (warehouseId.HasValue)
        {
            query = query.Where(i => i.WarehouseId == warehouseId.Value);
        }

        if (productId.HasValue)
        {
            query = query.Where(i => i.ProductId == productId.Value);
        }

        if (lowStockOnly == true)
        {
            query = query.Where(i => (i.Quantity - i.ReservedQuantity) <= i.Product.ReorderLevel);
        }

        if (!string.IsNullOrWhiteSpace(pagination.SearchTerm))
        {
            var search = pagination.SearchTerm.Trim().ToLower();
            query = query.Where(i => i.Product.Name.ToLower().Contains(search) || 
                                     i.Product.SKU.ToLower().Contains(search) ||
                                     i.Warehouse.Name.ToLower().Contains(search));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(i => i.Product.Name)
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(i => MapToDto(i))
            .ToListAsync();

        return new PagedResult<InventoryDto>(items, total, pagination.PageNumber, pagination.PageSize);
    }

    public async Task<IEnumerable<LowStockAlertDto>> GetLowStockAlertsAsync()
    {
        return await _unitOfWork.Inventories.Query()
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .Where(i => (i.Quantity - i.ReservedQuantity) <= i.Product.ReorderLevel && i.Product.IsActive)
            .OrderBy(i => (i.Quantity - i.ReservedQuantity))
            .Select(i => new LowStockAlertDto
            {
                ProductId = i.ProductId,
                ProductSKU = i.Product.SKU,
                ProductName = i.Product.Name,
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse.Name,
                CurrentStock = i.Quantity,
                AvailableStock = Math.Max(0, i.Quantity - i.ReservedQuantity),
                ReorderLevel = i.Product.ReorderLevel,
                Shortage = i.Product.ReorderLevel - Math.Max(0, i.Quantity - i.ReservedQuantity)
            })
            .ToListAsync();
    }

    public async Task<InventoryDto> AdjustStockAsync(StockAdjustmentDto dto)
    {
        if (dto.AdjustmentQuantity == 0)
        {
            throw new BusinessRuleValidationException("Adjustment quantity cannot be zero.");
        }

        return await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var inventory = await _unitOfWork.Inventories.Query()
                .Include(i => i.Product)
                .Include(i => i.Warehouse)
                .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.WarehouseId == dto.WarehouseId);

            if (inventory == null)
            {
                // Create new inventory record if it doesn't exist yet
                if (dto.AdjustmentQuantity < 0)
                {
                    throw new InsufficientStockException(dto.ProductId, "Product", 0, Math.Abs(dto.AdjustmentQuantity));
                }

                inventory = new Inventory
                {
                    ProductId = dto.ProductId,
                    WarehouseId = dto.WarehouseId,
                    Quantity = dto.AdjustmentQuantity,
                    ReservedQuantity = 0
                };
                await _unitOfWork.Inventories.AddAsync(inventory);
                await _unitOfWork.SaveChangesAsync();
            }
            else
            {
                if (dto.AdjustmentQuantity < 0 && (inventory.Quantity + dto.AdjustmentQuantity) < inventory.ReservedQuantity)
                {
                    throw new InsufficientStockException(dto.ProductId, inventory.Product.Name, inventory.AvailableQuantity, Math.Abs(dto.AdjustmentQuantity));
                }

                inventory.Quantity += dto.AdjustmentQuantity;
                inventory.UpdatedAt = DateTime.UtcNow;
                _unitOfWork.Inventories.Update(inventory);
            }

            // Record Movement
            var movement = new StockMovement
            {
                ProductId = dto.ProductId,
                WarehouseId = dto.WarehouseId,
                MovementType = MovementType.StockAdjustment,
                Quantity = dto.AdjustmentQuantity,
                BalanceAfter = inventory.Quantity,
                ReferenceNumber = $"ADJ-{DateTime.UtcNow:yyyyMMddHHmmss}",
                Notes = dto.Reason,
                CreatedByUserId = _currentUserService.UserId
            };
            await _unitOfWork.StockMovements.AddAsync(movement);

            // Audit
            await _unitOfWork.AuditLogs.AddAsync(new AuditLog
            {
                EntityName = "Inventory",
                EntityId = $"{dto.ProductId}-{dto.WarehouseId}",
                Action = "StockAdjustment",
                UserId = _currentUserService.UserId,
                UserEmail = _currentUserService.UserEmail,
                ChangesJson = $"{{\"adjustment\":{dto.AdjustmentQuantity},\"newQuantity\":{inventory.Quantity},\"reason\":\"{dto.Reason}\"}}",
                Timestamp = DateTime.UtcNow
            });

            await _unitOfWork.SaveChangesAsync();
            return MapToDto(inventory);
        });
    }

    public async Task<bool> TransferStockAsync(StockTransferDto dto)
    {
        if (dto.SourceWarehouseId == dto.DestinationWarehouseId)
        {
            throw new BusinessRuleValidationException("Source and destination warehouses cannot be the same.");
        }
        if (dto.Quantity <= 0)
        {
            throw new BusinessRuleValidationException("Transfer quantity must be greater than zero.");
        }

        return await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            // Fetch source inventory with concurrency row lock
            var sourceInventory = await _unitOfWork.Inventories.Query()
                .Include(i => i.Product)
                .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.WarehouseId == dto.SourceWarehouseId);

            if (sourceInventory == null || sourceInventory.AvailableQuantity < dto.Quantity)
            {
                int avail = sourceInventory?.AvailableQuantity ?? 0;
                string pName = sourceInventory?.Product?.Name ?? $"Product #{dto.ProductId}";
                throw new InsufficientStockException(dto.ProductId, pName, avail, dto.Quantity);
            }

            // Deduct from source
            sourceInventory.Quantity -= dto.Quantity;
            sourceInventory.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Inventories.Update(sourceInventory);

            // Fetch or create destination inventory
            var destInventory = await _unitOfWork.Inventories.Query()
                .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.WarehouseId == dto.DestinationWarehouseId);

            if (destInventory == null)
            {
                destInventory = new Inventory
                {
                    ProductId = dto.ProductId,
                    WarehouseId = dto.DestinationWarehouseId,
                    Quantity = dto.Quantity,
                    ReservedQuantity = 0
                };
                await _unitOfWork.Inventories.AddAsync(destInventory);
            }
            else
            {
                destInventory.Quantity += dto.Quantity;
                destInventory.UpdatedAt = DateTime.UtcNow;
                _unitOfWork.Inventories.Update(destInventory);
            }

            string refNum = $"TRF-{DateTime.UtcNow:yyyyMMddHHmmss}";

            // Record Transfer Out
            await _unitOfWork.StockMovements.AddAsync(new StockMovement
            {
                ProductId = dto.ProductId,
                WarehouseId = dto.SourceWarehouseId,
                MovementType = MovementType.TransferOut,
                Quantity = -dto.Quantity,
                BalanceAfter = sourceInventory.Quantity,
                ReferenceNumber = refNum,
                Notes = $"Transfer to warehouse #{dto.DestinationWarehouseId}. {dto.Notes}",
                CreatedByUserId = _currentUserService.UserId
            });

            // Record Transfer In
            await _unitOfWork.StockMovements.AddAsync(new StockMovement
            {
                ProductId = dto.ProductId,
                WarehouseId = dto.DestinationWarehouseId,
                MovementType = MovementType.TransferIn,
                Quantity = dto.Quantity,
                BalanceAfter = destInventory.Quantity,
                ReferenceNumber = refNum,
                Notes = $"Transfer from warehouse #{dto.SourceWarehouseId}. {dto.Notes}",
                CreatedByUserId = _currentUserService.UserId
            });

            // Audit
            await _unitOfWork.AuditLogs.AddAsync(new AuditLog
            {
                EntityName = "InventoryTransfer",
                EntityId = refNum,
                Action = "StockTransfer",
                UserId = _currentUserService.UserId,
                UserEmail = _currentUserService.UserEmail,
                ChangesJson = $"{{\"productId\":{dto.ProductId},\"fromWh\":{dto.SourceWarehouseId},\"toWh\":{dto.DestinationWarehouseId},\"quantity\":{dto.Quantity}}}",
                Timestamp = DateTime.UtcNow
            });

            await _unitOfWork.SaveChangesAsync();
            return true;
        });
    }

    public async Task<PagedResult<StockMovementDto>> GetStockMovementsAsync(int? productId, int? warehouseId, PaginationParams pagination)
    {
        var query = _unitOfWork.StockMovements.Query()
            .Include(sm => sm.Product)
            .Include(sm => sm.Warehouse)
            .Include(sm => sm.CreatedByUser)
            .AsNoTracking();

        if (productId.HasValue)
        {
            query = query.Where(sm => sm.ProductId == productId.Value);
        }

        if (warehouseId.HasValue)
        {
            query = query.Where(sm => sm.WarehouseId == warehouseId.Value);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(sm => sm.CreatedAt)
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(sm => new StockMovementDto
            {
                Id = sm.Id,
                ProductId = sm.ProductId,
                ProductName = sm.Product.Name,
                ProductSKU = sm.Product.SKU,
                WarehouseId = sm.WarehouseId,
                WarehouseName = sm.Warehouse.Name,
                MovementType = sm.MovementType.ToString(),
                Quantity = sm.Quantity,
                BalanceAfter = sm.BalanceAfter,
                ReferenceNumber = sm.ReferenceNumber,
                Notes = sm.Notes,
                CreatedByUserName = sm.CreatedByUser != null ? sm.CreatedByUser.FullName : "System",
                CreatedAt = sm.CreatedAt
            })
            .ToListAsync();

        return new PagedResult<StockMovementDto>(items, total, pagination.PageNumber, pagination.PageSize);
    }

    private static InventoryDto MapToDto(Inventory i)
    {
        return new InventoryDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductSKU = i.Product?.SKU ?? string.Empty,
            ProductName = i.Product?.Name ?? string.Empty,
            WarehouseId = i.WarehouseId,
            WarehouseCode = i.Warehouse?.Code ?? string.Empty,
            WarehouseName = i.Warehouse?.Name ?? string.Empty,
            Quantity = i.Quantity,
            ReservedQuantity = i.ReservedQuantity,
            ReorderLevel = i.Product?.ReorderLevel ?? 0,
            UpdatedAt = i.UpdatedAt
        };
    }
}

