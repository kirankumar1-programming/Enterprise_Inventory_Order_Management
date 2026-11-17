using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory_Application.Services;
using EnterpriseInventory.Core.Enums;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory_Infrastructure.Repositories;

namespace EnterpriseInventory_Tests;

public class OrderCancellationTests
{
    [Fact]
    public async Task CancelOrder_RestoresStock_AndCreatesStockMovementAuditEntry()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);
        mockUser.Setup(u => u.UserEmail).Returns("admin@enterprise.com");

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var orderService = new OrderService(unitOfWork, mockUser.Object, mockNotifier.Object);

        // Product 1 initial stock: 10
        // Place order for 4 units -> Stock becomes 6
        var createdOrder = await orderService.CreateOrderAsync(new CreateOrderDto
        {
            CustomerName = "Target Buyer",
            CustomerEmail = "buyer@target.com",
            ShippingAddress = "200 Market Street",
            WarehouseId = 1,
            Items = new List<OrderItemRequestDto>
            {
                new() { ProductId = 1, Quantity = 4 }
            }
        });

        var invAfterOrder = await context.Inventories.FirstOrDefaultAsync(i => i.ProductId == 1 && i.WarehouseId == 1);
        Assert.NotNull(invAfterOrder);
        Assert.Equal(6, invAfterOrder.Quantity);

        // Act: Cancel order
        var cancelledOrder = await orderService.CancelOrderAsync(createdOrder.Id, "Customer requested cancellation");

        // Assert
        Assert.Equal(OrderStatus.Cancelled, cancelledOrder.Status);

        // Stock restored from 6 back to 10
        var invAfterCancel = await context.Inventories.FirstOrDefaultAsync(i => i.ProductId == 1 && i.WarehouseId == 1);
        Assert.NotNull(invAfterCancel);
        Assert.Equal(10, invAfterCancel.Quantity);

        // Verify StockMovement return record
        var returnMovement = await context.StockMovements
            .FirstOrDefaultAsync(sm => sm.ReferenceNumber == createdOrder.OrderNumber && sm.MovementType == MovementType.OrderCancellationReturn);
        Assert.NotNull(returnMovement);
        Assert.Equal(4, returnMovement.Quantity);
        Assert.Equal(10, returnMovement.BalanceAfter);

        // Verify AuditLog record
        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == createdOrder.OrderNumber && a.Action == "CancelOrder");
        Assert.NotNull(audit);

        // Verify real-time events broadcast
        mockNotifier.Verify(n => n.BroadcastStockUpdateAsync(It.Is<RealTimeStockUpdateEvent>(
            s => s.ProductId == 1 && s.ChangeQuantity == 4 && s.NewQuantity == 10)), Times.Once);
        mockNotifier.Verify(n => n.BroadcastOrderEventAsync(It.Is<RealTimeOrderEvent>(
            o => o.OrderNumber == createdOrder.OrderNumber && o.Action == "Cancelled")), Times.Once);
    }

    [Fact]
    public async Task CancelOrder_ThrowsBusinessRuleValidationException_WhenAlreadyCancelled()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var orderService = new OrderService(unitOfWork, mockUser.Object, mockNotifier.Object);

        var created = await orderService.CreateOrderAsync(new CreateOrderDto
        {
            CustomerName = "Double Cancel Buyer",
            CustomerEmail = "cancel@twice.com",
            ShippingAddress = "333 Street",
            WarehouseId = 1,
            Items = new List<OrderItemRequestDto>
            {
                new() { ProductId = 1, Quantity = 1 }
            }
        });

        // First cancellation succeeds
        await orderService.CancelOrderAsync(created.Id, "First cancel");

        // Act & Assert: Second cancellation must fail
        await Assert.ThrowsAsync<BusinessRuleValidationException>(() => orderService.CancelOrderAsync(created.Id, "Second cancel"));
    }

    [Fact]
    public async Task CancelOrder_ThrowsBusinessRuleValidationException_WhenOrderIsShippedOrDelivered()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var orderService = new OrderService(unitOfWork, mockUser.Object, mockNotifier.Object);

        var created = await orderService.CreateOrderAsync(new CreateOrderDto
        {
            CustomerName = "Shipped Order Buyer",
            CustomerEmail = "shipped@order.com",
            ShippingAddress = "444 Highway",
            WarehouseId = 1,
            Items = new List<OrderItemRequestDto>
            {
                new() { ProductId = 1, Quantity = 1 }
            }
        });

        // Advance to Shipped
        await orderService.UpdateOrderStatusAsync(created.Id, new UpdateOrderStatusDto
        {
            Status = OrderStatus.Shipped,
            Note = "Package handed to courier"
        });

        // Act & Assert: Attempting to cancel shipped order must fail
        var ex = await Assert.ThrowsAsync<BusinessRuleValidationException>(() => orderService.CancelOrderAsync(created.Id, "Cancel shipped order"));
        Assert.Contains("Shipped", ex.Message);
    }
}
