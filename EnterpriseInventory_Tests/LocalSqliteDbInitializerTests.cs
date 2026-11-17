using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using EnterpriseInventory_Infrastructure.Data;

namespace EnterpriseInventory_Tests;

public class LocalSqliteDbInitializerTests
{
    [Fact]
    public async Task DbInitializer_CreatesAndSeedsLocalSqliteDatabase_Successfully()
    {
        string testDbPath = Path.Combine(Path.GetTempPath(), $"TestLocalInventory_{Guid.NewGuid():N}.db");
        try
        {
            var options = new DbContextOptionsBuilder<EnterpriseInventoryDbContext>()
                .UseSqlite($"Data Source={testDbPath}")
                .Options;

            using (var context = new EnterpriseInventoryDbContext(options))
            {
                // Act: Initialize schema and seed demo data
                DbInitializer.Initialize(context);

                // Assert: File exists
                Assert.True(File.Exists(testDbPath), "SQLite database file was not created.");

                // Assert: Roles seeded
                int rolesCount = await context.Roles.CountAsync();
                Assert.Equal(4, rolesCount);

                // Assert: Users seeded
                int usersCount = await context.Users.CountAsync();
                Assert.Equal(4, usersCount);

                // Assert: Warehouses seeded
                int warehouseCount = await context.Warehouses.CountAsync();
                Assert.Equal(3, warehouseCount);

                // Assert: Categories & Products seeded
                int productCount = await context.Products.CountAsync();
                Assert.Equal(8, productCount);

                // Assert: Inventories seeded across facilities
                int inventoryCount = await context.Inventories.CountAsync();
                Assert.True(inventoryCount >= 17, $"Expected at least 17 inventory records across warehouses, got {inventoryCount}");

                // Assert: Initial stock movements recorded
                int movementsCount = await context.StockMovements.CountAsync();
                Assert.True(movementsCount >= 17);

                // Assert: Sample orders seeded
                int ordersCount = await context.Orders.CountAsync();
                Assert.Equal(2, ordersCount);
            }
        }
        finally
        {
            if (File.Exists(testDbPath))
            {
                try { File.Delete(testDbPath); } catch { /* ignore */ }
            }
        }
    }

    [Fact]
    public void GeneratePreseededLocalDatabaseFile()
    {
        string apiDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "EnterpriseInventoryApi"));
        string targetDbPath = Path.Combine(apiDir, "EnterpriseInventory.db");

        var options = new DbContextOptionsBuilder<EnterpriseInventoryDbContext>()
            .UseSqlite($"Data Source={targetDbPath}")
            .Options;

        using var context = new EnterpriseInventoryDbContext(options);
        DbInitializer.Initialize(context);

        Assert.True(File.Exists(targetDbPath));
    }
}
