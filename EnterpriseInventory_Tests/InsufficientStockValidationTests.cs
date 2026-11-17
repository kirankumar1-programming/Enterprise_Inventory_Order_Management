using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory_Application.Services;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory_Infrastructure.Repositories;

namespace EnterpriseInventory_Tests;

public class InsufficientStockValidationTests
{
    [Fact]
    public async Task CreateOrder_ThrowsInsufficientStockException_WhenRequestedExceedsAvailable()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);
        mockUser.Setup(u => u.UserEmail).Returns("admin@enterprise.com");

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var orderService = new OrderService(unitOfWork, mockUser.Object, mockNotifier.Object);

        // Product 2 only has 3 units available in Warehouse 1
        var orderDto = new CreateOrderDto
        {
            CustomerName = "Acme Corp",
            CustomerEmail = "procurement@acme.com",
            ShippingAddress = "123 Business Way",
            WarehouseId = 1,
            Items = new List<OrderItemRequestDto>
            {
                new() { ProductId = 2, Quantity = 10 } // Requesting 10 when only 3 available
            }
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InsufficientStockException>(() => orderService.CreateOrderAsync(orderDto));

        Assert.Equal(2, ex.ProductId);
        Assert.Equal(3, ex.AvailableQuantity);
        Assert.Equal(10, ex.RequestedQuantity);

        // Verify database state: inventory quantity must remain strictly unchanged (3 units)
        var inv = await context.Inventories.FirstOrDefaultAsync(i => i.ProductId == 2 && i.WarehouseId == 1);
        Assert.NotNull(inv);
        Assert.Equal(3, inv.Quantity);

        // Verify no order was created
        var ordersCount = await context.Orders.CountAsync();
        Assert.Equal(0, ordersCount);

        // Verify alert was broadcast for real-time notification
        mockNotifier.Verify(n => n.BroadcastAlertAsync(It.Is<RealTimeAlertEvent>(
            a => a.AlertType == "InsufficientStockAttempt" && a.ProductId == 2)), Times.Once);
    }

    [Fact]
    public async Task CreateOrder_ThrowsBusinessRuleValidationException_WhenQuantityIsZeroOrNegative()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var orderService = new OrderService(unitOfWork, mockUser.Object, mockNotifier.Object);

        var orderDto = new CreateOrderDto
        {
            CustomerName = "Bad Qty Buyer",
            CustomerEmail = "badqty@buyer.com",
            ShippingAddress = "789 Lane",
            WarehouseId = 1,
            Items = new List<OrderItemRequestDto>
            {
                new() { ProductId = 1, Quantity = 0 }
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<BusinessRuleValidationException>(() => orderService.CreateOrderAsync(orderDto));
    }

    [Fact]
    public async Task CreateOrder_RollsBackEntireTransaction_WhenAnySingleItemHasInsufficientStock()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var orderService = new OrderService(unitOfWork, mockUser.Object, mockNotifier.Object);

        // Product 1 has 10 units (request 2 -> valid)
        // Product 2 has 3 units (request 50 -> invalid!)
        var orderDto = new CreateOrderDto
        {
            CustomerName = "Multi-Item Order",
            CustomerEmail = "multi@enterprise.com",
            ShippingAddress = "456 Corporate Dr",
            WarehouseId = 1,
            Items = new List<OrderItemRequestDto>
            {
                new() { ProductId = 1, Quantity = 2 },
                new() { ProductId = 2, Quantity = 50 }
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<InsufficientStockException>(() => orderService.CreateOrderAsync(orderDto));

        // Verify Product 1 was NOT deducted (still 10)
        var inv1 = await context.Inventories.FirstOrDefaultAsync(i => i.ProductId == 1 && i.WarehouseId == 1);
        Assert.NotNull(inv1);
        Assert.Equal(10, inv1.Quantity);

        // Verify Product 2 was NOT deducted (still 3)
        var inv2 = await context.Inventories.FirstOrDefaultAsync(i => i.ProductId == 2 && i.WarehouseId == 1);
        Assert.NotNull(inv2);
        Assert.Equal(3, inv2.Quantity);
    }
}
