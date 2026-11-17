using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Enums;
using EnterpriseInventory_Infrastructure.Data;

namespace EnterpriseInventory_Tests;

public static class TestDbContextFactory
{
    public static DbContextOptions<EnterpriseInventoryDbContext> CreateOptions(string dbName)
    {
        return new DbContextOptionsBuilder<EnterpriseInventoryDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    public static EnterpriseInventoryDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = CreateOptions(dbName);
        var context = new EnterpriseInventoryDbContext(options);
        SeedInitialData(context);
        return context;
    }

    private static void SeedInitialData(EnterpriseInventoryDbContext context)
    {
        var role = new Role { Id = 1, Name = AppRole.Admin, Description = "Administrator" };
        var user = new User
        {
            Id = 1,
            Username = "admin",
            Email = "admin@enterprise.com",
            PasswordHash = "hash",
            FullName = "System Admin",
            RoleId = 1,
            Role = role,
            IsActive = true
        };

        var warehouse1 = new Warehouse
        {
            Id = 1,
            Code = "WH-CENTRAL",
            Name = "Central Logistics Hub",
            Location = "Dallas, TX",
            Address = "1200 Logistics Blvd",
            Capacity = 10000,
            IsActive = true
        };

        var warehouse2 = new Warehouse
        {
            Id = 2,
            Code = "WH-WEST",
            Name = "Pacific Distribution Center",
            Location = "Reno, NV",
            Address = "400 Sierra Way",
            Capacity = 8000,
            IsActive = true
        };

        var category = new Category
        {
            Id = 1,
            Name = "Electronics",
            Code = "ELEC",
            Description = "Electronic equipment"
        };

        var product1 = new Product
        {
            Id = 1,
            SKU = "ELEC-LAPTOP-01",
            Name = "Enterprise Pro Laptop 15\"",
            Price = 1299.99m,
            CostPrice = 900.00m,
            UnitOfMeasure = "Unit",
            ReorderLevel = 5,
            CategoryId = 1,
            Category = category,
            IsActive = true
        };

        var product2 = new Product
        {
            Id = 2,
            SKU = "ELEC-MONITOR-4K",
            Name = "UltraHD 27\" IPS Monitor",
            Price = 399.99m,
            CostPrice = 250.00m,
            UnitOfMeasure = "Unit",
            ReorderLevel = 10,
            CategoryId = 1,
            Category = category,
            IsActive = true
        };

        var product3 = new Product
        {
            Id = 3,
            SKU = "ELEC-MOUSE-WL",
            Name = "Ergonomic Wireless Mouse",
            Price = 49.99m,
            CostPrice = 20.00m,
            UnitOfMeasure = "Unit",
            ReorderLevel = 15,
            CategoryId = 1,
            Category = category,
            IsActive = true
        };

        var inv1 = new Inventory
        {
            Id = 1,
            ProductId = 1,
            WarehouseId = 1,
            Quantity = 10,
            ReservedQuantity = 0,
            Product = product1,
            Warehouse = warehouse1
        };

        var inv2 = new Inventory
        {
            Id = 2,
            ProductId = 2,
            WarehouseId = 1,
            Quantity = 3, // Low stock, reorder level is 10
            ReservedQuantity = 0,
            Product = product2,
            Warehouse = warehouse1
        };

        var inv3 = new Inventory
        {
            Id = 3,
            ProductId = 3,
            WarehouseId = 1,
            Quantity = 25,
            ReservedQuantity = 0,
            Product = product3,
            Warehouse = warehouse1
        };

        context.Roles.Add(role);
        context.Users.Add(user);
        context.Warehouses.AddRange(warehouse1, warehouse2);
        context.Categories.Add(category);
        context.Products.AddRange(product1, product2, product3);
        context.Inventories.AddRange(inv1, inv2, inv3);

        context.SaveChanges();
    }
}
