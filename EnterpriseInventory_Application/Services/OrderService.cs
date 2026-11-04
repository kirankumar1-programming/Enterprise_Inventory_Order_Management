using Microsoft.EntityFrameworkCore;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Enums;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory.Core.Interfaces;

namespace EnterpriseInventory_Application.Services;

public interface IOrderService
{
    Task<PagedResult<OrderDto>> GetOrdersAsync(OrderFilterParams filter);
    Task<OrderDto> GetOrderByIdAsync(int id);
    Task<OrderDto> CreateOrderAsync(CreateOrderDto dto);
    Task<OrderDto> UpdateOrderStatusAsync(int id, UpdateOrderStatusDto dto);
    Task<OrderDto> CancelOrderAsync(int id, string? reason);
}

public class OrderService : IOrderService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public OrderService(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<PagedResult<OrderDto>> GetOrdersAsync(OrderFilterParams filter)
    {
        var query = _unitOfWork.Orders.Query()
            .Include(o => o.Warehouse)
            .Include(o => o.CreatedByUser)
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .AsNoTracking();

        if (filter.Status.HasValue)
        {
            query = query.Where(o => o.Status == filter.Status.Value);
        }

        if (filter.WarehouseId.HasValue)
        {
            query = query.Where(o => o.WarehouseId == filter.WarehouseId.Value);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(o => o.OrderDate >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(o => o.OrderDate <= filter.EndDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var search = filter.SearchTerm.Trim().ToLower();
            query = query.Where(o => o.OrderNumber.ToLower().Contains(search) || 
                                     o.CustomerName.ToLower().Contains(search) || 
                                     o.CustomerEmail.ToLower().Contains(search));
        }

        var total = await query.CountAsync();
        var orders = await query
            .OrderByDescending(o => o.OrderDate)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(o => MapToDto(o))
            .ToListAsync();

        return new PagedResult<OrderDto>(orders, total, filter.PageNumber, filter.PageSize);
    }

    public async Task<OrderDto> GetOrderByIdAsync(int id)
    {
        var order = await _unitOfWork.Orders.Query()
            .Include(o => o.Warehouse)
            .Include(o => o.CreatedByUser)
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
        {
            throw new NotFoundException("Order", id);
        }

        return MapToDto(order);
    }

    /// <summary>
    /// Creates an order with ACID Transaction, stock availability validation,
    /// atomic stock deduction, and optimistic concurrency protection against overselling.
    /// </summary>
    public async Task<OrderDto> CreateOrderAsync(CreateOrderDto dto)
    {
        if (dto.Items == null || !dto.Items.Any())
        {
            throw new BusinessRuleValidationException("Order must contain at least one item.");
        }

        var warehouse = await _unitOfWork.Warehouses.GetByIdAsync(dto.WarehouseId);
        if (warehouse == null || !warehouse.IsActive)
        {
            throw new NotFoundException("Warehouse", dto.WarehouseId);
        }

        // Execute in ACID database transaction
        return await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            // Pre-load all products and their warehouse inventory
            var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _unitOfWork.Products.Query()
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            var inventories = await _unitOfWork.Inventories.Query()
                .Where(i => i.WarehouseId == dto.WarehouseId && productIds.Contains(i.ProductId))
                .ToDictionaryAsync(i => i.ProductId);

            // Step 1: Validate stock availability for all items before any changes
            foreach (var item in dto.Items)
            {
                if (item.Quantity <= 0)
                {
                    throw new BusinessRuleValidationException("Item quantity must be greater than zero.");
                }

                if (!products.TryGetValue(item.ProductId, out var product))
                {
                    throw new NotFoundException("Product", item.ProductId);
                }

                if (!inventories.TryGetValue(item.ProductId, out var inventory) || inventory.AvailableQuantity < item.Quantity)
                {
                    int available = inventory?.AvailableQuantity ?? 0;
                    throw new InsufficientStockException(item.ProductId, product.Name, available, item.Quantity);
                }
            }

            // Step 2: Create Order entity
            string orderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            var order = new Order
            {
                OrderNumber = orderNumber,
                CustomerName = dto.CustomerName.Trim(),
                CustomerEmail = dto.CustomerEmail.Trim(),
                CustomerPhone = dto.CustomerPhone?.Trim(),
                ShippingAddress = dto.ShippingAddress.Trim(),
                OrderDate = DateTime.UtcNow,
                Status = OrderStatus.Confirmed, // Order confirmed immediately upon successful stock reservation
                WarehouseId = dto.WarehouseId,
                CreatedByUserId = _currentUserService.UserId,
                CreatedAt = DateTime.UtcNow
            };

            decimal totalAmount = 0;
            var orderItems = new List<OrderItem>();

            // Step 3: Deduct stock atomically and record stock movements
            foreach (var item in dto.Items)
            {
                var product = products[item.ProductId];
                var inventory = inventories[item.ProductId];

                // Deduct inventory
                inventory.Quantity -= item.Quantity;
                inventory.UpdatedAt = DateTime.UtcNow;
                _unitOfWork.Inventories.Update(inventory);

                // Calculate amounts
                decimal subTotal = item.Quantity * product.Price;
                totalAmount += subTotal;

                orderItems.Add(new OrderItem
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = product.Price
                });

                // Record stock movement ledger entry
                await _unitOfWork.StockMovements.AddAsync(new StockMovement
                {
                    ProductId = item.ProductId,
                    WarehouseId = dto.WarehouseId,
                    MovementType = MovementType.OrderFulfillment,
                    Quantity = -item.Quantity,
                    BalanceAfter = inventory.Quantity,
                    ReferenceNumber = orderNumber,
                    Notes = $"Stock deducted for order {orderNumber}.",
                    CreatedByUserId = _currentUserService.UserId
                });
            }

            order.TotalAmount = totalAmount;
            order.Items = orderItems;

            await _unitOfWork.Orders.AddAsync(order);

            // Step 4: Write Audit Log
            await _unitOfWork.AuditLogs.AddAsync(new AuditLog
            {
                EntityName = "Order",
                EntityId = orderNumber,
                Action = "CreateOrderWithStockAllocation",
                UserId = _currentUserService.UserId,
                UserEmail = _currentUserService.UserEmail,
                ChangesJson = $"{{\"orderNumber\":\"{orderNumber}\",\"totalAmount\":{totalAmount},\"itemCount\":{dto.Items.Count}}}",
                Timestamp = DateTime.UtcNow
            });

            try
            {
                await _unitOfWork.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Concurrency conflict occurred: Another concurrent request modified the inventory row
                throw new ConcurrencyConflictException("A concurrent order was placed for this stock. Please refresh and check current stock availability.");
            }

            return await GetOrderByIdAsync(order.Id);
        });
    }

    /// <summary>
    /// Cancels an order and restores deducted stock to the warehouse inventory.
    /// </summary>
    public async Task<OrderDto> CancelOrderAsync(int id, string? reason)
    {
        return await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var order = await _unitOfWork.Orders.Query()
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                throw new NotFoundException("Order", id);
            }

            if (order.Status == OrderStatus.Cancelled)
            {
                throw new BusinessRuleValidationException("Order is already cancelled.");
            }

            if (order.Status == OrderStatus.Shipped || order.Status == OrderStatus.Delivered)
            {
                throw new BusinessRuleValidationException($"Cannot cancel order in '{order.Status}' status. Only Pending or Confirmed orders can be cancelled.");
            }

            bool wasConfirmed = order.Status == OrderStatus.Confirmed;

            // If the order was confirmed, stock was deducted and must now be restored
            if (wasConfirmed)
            {
                foreach (var item in order.Items)
                {
                    var inventory = await _unitOfWork.Inventories.Query()
                        .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && i.WarehouseId == order.WarehouseId);

                    if (inventory == null)
                    {
                        inventory = new Inventory
                        {
                            ProductId = item.ProductId,
                            WarehouseId = order.WarehouseId,
                            Quantity = item.Quantity,
                            ReservedQuantity = 0
                        };
                        await _unitOfWork.Inventories.AddAsync(inventory);
                    }
                    else
                    {
                        inventory.Quantity += item.Quantity;
                        inventory.UpdatedAt = DateTime.UtcNow;
                        _unitOfWork.Inventories.Update(inventory);
                    }

                    // Record return stock movement
                    await _unitOfWork.StockMovements.AddAsync(new StockMovement
                    {
                        ProductId = item.ProductId,
                        WarehouseId = order.WarehouseId,
                        MovementType = MovementType.OrderCancellationReturn,
                        Quantity = item.Quantity,
                        BalanceAfter = inventory.Quantity,
                        ReferenceNumber = order.OrderNumber,
                        Notes = $"Stock restored from cancelled order. Reason: {reason ?? "Customer cancellation"}",
                        CreatedByUserId = _currentUserService.UserId
                    });
                }
            }

            order.Status = OrderStatus.Cancelled;
            order.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Orders.Update(order);

            // Audit Log
            await _unitOfWork.AuditLogs.AddAsync(new AuditLog
            {
                EntityName = "Order",
                EntityId = order.OrderNumber,
                Action = "CancelOrder",
                UserId = _currentUserService.UserId,
                UserEmail = _currentUserService.UserEmail,
                ChangesJson = $"{{\"orderNumber\":\"{order.OrderNumber}\",\"status\":\"Cancelled\",\"stockRestored\":{wasConfirmed.ToString().ToLower()},\"reason\":\"{reason}\"}}",
                Timestamp = DateTime.UtcNow
            });

            await _unitOfWork.SaveChangesAsync();
            return await GetOrderByIdAsync(order.Id);
        });
    }

    public async Task<OrderDto> UpdateOrderStatusAsync(int id, UpdateOrderStatusDto dto)
    {
        var order = await _unitOfWork.Orders.GetByIdAsync(id);
        if (order == null)
        {
            throw new NotFoundException("Order", id);
        }

        if (dto.Status == OrderStatus.Cancelled)
        {
            return await CancelOrderAsync(id, dto.Note);
        }

        order.Status = dto.Status;
        order.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Orders.Update(order);

        await _unitOfWork.AuditLogs.AddAsync(new AuditLog
        {
            EntityName = "Order",
            EntityId = order.OrderNumber,
            Action = "UpdateOrderStatus",
            UserId = _currentUserService.UserId,
            UserEmail = _currentUserService.UserEmail,
            ChangesJson = $"{{\"newStatus\":\"{dto.Status}\",\"note\":\"{dto.Note}\"}}",
            Timestamp = DateTime.UtcNow
        });

        await _unitOfWork.SaveChangesAsync();
        return await GetOrderByIdAsync(order.Id);
    }

    private static OrderDto MapToDto(Order o)
    {
        return new OrderDto
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            CustomerName = o.CustomerName,
            CustomerEmail = o.CustomerEmail,
            CustomerPhone = o.CustomerPhone,
            ShippingAddress = o.ShippingAddress,
            OrderDate = o.OrderDate,
            Status = o.Status,
            TotalAmount = o.TotalAmount,
            WarehouseId = o.WarehouseId,
            WarehouseName = o.Warehouse?.Name ?? string.Empty,
            CreatedByUserName = o.CreatedByUser?.FullName,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt,
            Items = o.Items.Select(i => new OrderItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductSKU = i.Product?.SKU ?? string.Empty,
                ProductName = i.Product?.Name ?? string.Empty,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                SubTotal = i.SubTotal
            }).ToList()
        };
    }
}

