using System;
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

public class AutomaticStockUpdateTests
{
    [Fact]
    public async Task AdjustStock_IncrementsInventory_AndBroadcastsRealTimeStockUpdate()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);
        mockUser.Setup(u => u.UserEmail).Returns("admin@enterprise.com");

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var inventoryService = new InventoryService(unitOfWork, mockUser.Object, mockNotifier.Object);

        // Product 1 initial stock: 10
        var adjustDto = new StockAdjustmentDto
        {
            ProductId = 1,
            WarehouseId = 1,
            AdjustmentQuantity = 15,
            Reason = "Supplier replenishment inbound shipment"
        };

        // Act
        var result = await inventoryService.AdjustStockAsync(adjustDto);

        // Assert
        Assert.Equal(25, result.Quantity);

        var invInDb = await context.Inventories.FirstOrDefaultAsync(i => i.ProductId == 1 && i.WarehouseId == 1);
        Assert.NotNull(invInDb);
        Assert.Equal(25, invInDb.Quantity);

        // Check stock movement ledger
        var movement = await context.StockMovements
            .FirstOrDefaultAsync(sm => sm.ProductId == 1 && sm.MovementType == MovementType.StockAdjustment);
        Assert.NotNull(movement);
        Assert.Equal(15, movement.Quantity);
        Assert.Equal(25, movement.BalanceAfter);

        // Check SignalR broadcast
        mockNotifier.Verify(n => n.BroadcastStockUpdateAsync(It.Is<RealTimeStockUpdateEvent>(
            s => s.ProductId == 1 && s.NewQuantity == 25 && s.ChangeQuantity == 15)), Times.Once);
    }

    [Fact]
    public async Task AdjustStock_DecrementsStock_AndBroadcastsLowStockAlert_WhenBelowReorderLevel()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var inventoryService = new InventoryService(unitOfWork, mockUser.Object, mockNotifier.Object);

        // Product 1 has reorder level = 5, initial stock = 10
        // Decrement by -7 -> remaining stock = 3 (which is <= 5)
        var adjustDto = new StockAdjustmentDto
        {
            ProductId = 1,
            WarehouseId = 1,
            AdjustmentQuantity = -7,
            Reason = "Damaged items written off"
        };

        // Act
        var result = await inventoryService.AdjustStockAsync(adjustDto);

        // Assert
        Assert.Equal(3, result.Quantity);

        // Verify LowStock Alert was broadcast
        mockNotifier.Verify(n => n.BroadcastAlertAsync(It.Is<RealTimeAlertEvent>(
            a => a.AlertType == "LowStock" && a.ProductId == 1)), Times.Once);
    }

    [Fact]
    public async Task AdjustStock_ThrowsInsufficientStockException_WhenNegativeAdjustmentExceedsStock()
    {
        // Arrange
        var context = TestDbContextFactory.CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var unitOfWork = new UnitOfWork(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.UserId).Returns(1);

        var mockNotifier = new Mock<IRealTimeNotificationService>();
        var inventoryService = new InventoryService(unitOfWork, mockUser.Object, mockNotifier.Object);

        // Product 2 has 3 units. Attempt to deduct 50 units.
        var adjustDto = new StockAdjustmentDto
        {
            ProductId = 2,
            WarehouseId = 1,
            AdjustmentQuantity = -50,
            Reason = "Large shrink"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InsufficientStockException>(() => inventoryService.AdjustStockAsync(adjustDto));
    }
}
