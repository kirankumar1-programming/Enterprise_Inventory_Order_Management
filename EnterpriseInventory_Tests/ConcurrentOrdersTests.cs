using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory_Application.Services;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory_Infrastructure.Data;
using EnterpriseInventory_Infrastructure.Repositories;

namespace EnterpriseInventory_Tests;

public class ConcurrentOrdersTests
{
    [Fact]
    public async Task ConcurrentOrders_PreventOverselling_UnderRaceConditions()
    {
        // Arrange
        string dbName = Guid.NewGuid().ToString();
        var seedContext = TestDbContextFactory.CreateInMemoryDbContext(dbName);

        // Product 2 has exactly 4 units in initial stock
        var inv = await seedContext.Inventories.FirstOrDefaultAsync(i => i.ProductId == 2 && i.WarehouseId == 1);
        Assert.NotNull(inv);
        inv.Quantity = 4;
        inv.ReservedQuantity = 0;
        await seedContext.SaveChangesAsync();

        int initialStock = 4;
        int concurrentBuyers = 6;
        int quantityPerOrder = 2;
        // Total demand = 6 buyers * 2 units = 12 units.
        // Available = 4 units.
        // At most 2 buyers (2 * 2 = 4 units) can succeed! Remaining 4 buyers MUST fail.

        var successfulOrders = new ConcurrentBag<OrderDto>();
        var rejectedErrors = new ConcurrentBag<string>();

        var mockNotifier = new Mock<IRealTimeNotificationService>();

        // Act: Execute concurrent order placement tasks in parallel
        var tasks = Enumerable.Range(1, concurrentBuyers).Select(async buyerId =>
        {
            // Each concurrent buyer operates on an independent DbContext / UnitOfWork
            var options = TestDbContextFactory.CreateOptions(dbName);

            using var threadContext = new EnterpriseInventoryDbContext(options);
            var threadUnitOfWork = new UnitOfWork(threadContext);

            var mockUser = new Mock<ICurrentUserService>();
            mockUser.Setup(u => u.UserId).Returns(1);

            var threadOrderService = new OrderService(threadUnitOfWork, mockUser.Object, mockNotifier.Object);

            var orderDto = new CreateOrderDto
            {
                CustomerName = $"Concurrent Buyer {buyerId}",
                CustomerEmail = $"buyer{buyerId}@race.com",
                ShippingAddress = $"Lane {buyerId}",
                WarehouseId = 1,
                Items = new List<OrderItemRequestDto>
                {
                    new() { ProductId = 2, Quantity = quantityPerOrder }
                }
            };

            try
            {
                var result = await threadOrderService.CreateOrderAsync(orderDto);
                successfulOrders.Add(result);
            }
            catch (InsufficientStockException isEx)
            {
                rejectedErrors.Add($"InsufficientStock: {isEx.Message}");
            }
            catch (ConcurrencyConflictException ccEx)
            {
                rejectedErrors.Add($"ConcurrencyConflict: {ccEx.Message}");
            }
        });

        await Task.WhenAll(tasks);

        // Assert:
        // 1. Successful orders count cannot exceed 2
        Assert.True(successfulOrders.Count <= 2, $"Expected at most 2 successful orders, but got {successfulOrders.Count}");

        // 2. Total quantity deducted = successfulOrders.Count * 2
        int totalDeducted = successfulOrders.Count * quantityPerOrder;

        // 3. Verify final database inventory
        using var verifyContext = new EnterpriseInventoryDbContext(TestDbContextFactory.CreateOptions(dbName));
        var finalInv = await verifyContext.Inventories.FirstOrDefaultAsync(i => i.ProductId == 2 && i.WarehouseId == 1);
        Assert.NotNull(finalInv);

        // Stock must NEVER be negative (ZERO overselling!)
        Assert.True(finalInv.Quantity >= 0, $"Inventory dropped below zero to {finalInv.Quantity}!");
        Assert.Equal(initialStock - totalDeducted, finalInv.Quantity);

        // 4. At least 4 orders must have been rejected
        Assert.True(rejectedErrors.Count >= (concurrentBuyers - 2));
    }
}
