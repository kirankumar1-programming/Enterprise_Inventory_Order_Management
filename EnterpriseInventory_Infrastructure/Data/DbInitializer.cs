using System;
using System.Collections.Generic;
using System.Linq;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Enums;

namespace EnterpriseInventory_Infrastructure.Data;

public static class DbInitializer
{
    public static void Initialize(EnterpriseInventoryDbContext context)
    {
        // 1. Ensure the database and schema are created
        context.Database.EnsureCreated();

        // 2. Check if already seeded
        if (context.Users.Any())
        {
            return; // DB has already been initialized
        }

        // 3. Seed Roles
        var roleAdmin = new Role { Name = AppRole.Admin, Description = "Full system administration access" };
        var roleManager = new Role { Name = AppRole.WarehouseManager, Description = "Warehouse and inventory operations" };
        var roleSales = new Role { Name = AppRole.SalesRepresentative, Description = "Order processing and inventory view" };
        var roleAuditor = new Role { Name = AppRole.Auditor, Description = "Read-only access for compliance and audits" };

        context.Roles.AddRange(roleAdmin, roleManager, roleSales, roleAuditor);
        context.SaveChanges();

        // Pre-computed BCrypt hash for "Password123!"
        const string passwordHash = "$2a$11$mz9jMBmU8XI4xCl028k7L.pBHz.r5pzyBBEUY0f7s7Eg3NWpMVIjG";

        // 4. Seed Users
        var userAdmin = new User
        {
            Username = "admin",
            Email = "admin@enterprise.com",
            PasswordHash = passwordHash,
            FullName = "Enterprise Administrator",
            RoleId = roleAdmin.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var userManager = new User
        {
            Username = "manager",
            Email = "manager@enterprise.com",
            PasswordHash = passwordHash,
            FullName = "Michael Warehouse Manager",
            RoleId = roleManager.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var userSales = new User
        {
            Username = "sales",
            Email = "sales@enterprise.com",
            PasswordHash = passwordHash,
            FullName = "Sarah Sales Representative",
            RoleId = roleSales.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var userAuditor = new User
        {
            Username = "auditor",
            Email = "auditor@enterprise.com",
            PasswordHash = passwordHash,
            FullName = "Arthur Compliance Auditor",
            RoleId = roleAuditor.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(userAdmin, userManager, userSales, userAuditor);
        context.SaveChanges();

        // 5. Seed Categories
        var catElec = new Category { Name = "Electronics & IT", Code = "CAT-ELEC", Description = "Computers, peripherals, monitors and accessories", CreatedAt = DateTime.UtcNow };
        var catFurn = new Category { Name = "Office Furniture", Code = "CAT-FURN", Description = "Ergonomic chairs, desks, storage systems", CreatedAt = DateTime.UtcNow };
        var catNet = new Category { Name = "Networking Equipment", Code = "CAT-NET", Description = "Routers, switches, rack mounts, and cabling", CreatedAt = DateTime.UtcNow };
        var catSafe = new Category { Name = "Safety & Industrial", Code = "CAT-SAFE", Description = "Warehouse safety gear, PPE, tools", CreatedAt = DateTime.UtcNow };

        context.Categories.AddRange(catElec, catFurn, catNet, catSafe);
        context.SaveChanges();

        // 6. Seed Suppliers
        var supApex = new Supplier
        {
            Name = "Apex Microelectronics Inc",
            ContactPerson = "David Chen",
            Email = "dchen@apexmicro.com",
            Phone = "+1-415-555-0199",
            Address = "100 Silicon Way",
            City = "San Jose",
            Country = "USA",
            CreatedAt = DateTime.UtcNow
        };

        var supNordic = new Supplier
        {
            Name = "Nordic Comfort Ergonomics",
            ContactPerson = "Ingrid Larson",
            Email = "ingrid@nordiccomfort.se",
            Phone = "+46-8-123-4567",
            Address = "Klarabergsviadukten 63",
            City = "Stockholm",
            Country = "Sweden",
            CreatedAt = DateTime.UtcNow
        };

        var supVanguard = new Supplier
        {
            Name = "Vanguard Network Tech",
            ContactPerson = "Elena Rostov",
            Email = "elena@vanguardnet.com",
            Phone = "+1-206-555-8844",
            Address = "404 Industrial Blvd",
            City = "Seattle",
            Country = "USA",
            CreatedAt = DateTime.UtcNow
        };

        context.Suppliers.AddRange(supApex, supNordic, supVanguard);
        context.SaveChanges();

        // 7. Seed Warehouses
        var whCentral = new Warehouse
        {
            Code = "WH-CENTRAL",
            Name = "Central Distribution Hub",
            Location = "Chicago, IL",
            Address = "1200 Logistics Parkway, Chicago, IL 60601",
            Capacity = 50000,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var whWest = new Warehouse
        {
            Code = "WH-WEST",
            Name = "West Coast Fulfillment Facility",
            Location = "Reno, NV",
            Address = "450 Desert Commerce Way, Reno, NV 89502",
            Capacity = 35000,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var whEast = new Warehouse
        {
            Code = "WH-EAST",
            Name = "East Coast Gateway Warehouse",
            Location = "Allentown, PA",
            Address = "88 Lehigh Valley Dr, Allentown, PA 18109",
            Capacity = 40000,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Warehouses.AddRange(whCentral, whWest, whEast);
        context.SaveChanges();

        // 8. Seed Products
        var p1 = new Product { SKU = "PRD-LT-001", Name = "Enterprise ProBook 15\" Laptop", Description = "Intel Core i7, 32GB RAM, 1TB NVMe SSD, Win 11 Pro", Price = 1299.99m, CostPrice = 850.00m, UnitOfMeasure = "Units", ReorderLevel = 15, CategoryId = catElec.Id, SupplierId = supApex.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
        var p2 = new Product { SKU = "PRD-MN-002", Name = "UltraWide 34\" Curved 4K Monitor", Description = "3440x1440 IPS, 144Hz, HDR400, USB-C 90W PD Docking", Price = 549.50m, CostPrice = 320.00m, UnitOfMeasure = "Units", ReorderLevel = 20, CategoryId = catElec.Id, SupplierId = supApex.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
        var p3 = new Product { SKU = "PRD-KB-003", Name = "Mechanical Tactile Wireless Keyboard", Description = "Low-latency Bluetooth & 2.4GHz wireless mechanical keyboard", Price = 89.99m, CostPrice = 45.00m, UnitOfMeasure = "Units", ReorderLevel = 25, CategoryId = catElec.Id, SupplierId = supApex.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
        var p4 = new Product { SKU = "PRD-CH-004", Name = "ErgoComfort High-Back Office Mesh Chair", Description = "Multi-tilt ergonomic office chair with breathable Korean mesh", Price = 399.00m, CostPrice = 210.00m, UnitOfMeasure = "Units", ReorderLevel = 10, CategoryId = catFurn.Id, SupplierId = supNordic.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
        var p5 = new Product { SKU = "PRD-DK-005", Name = "Electric Dual-Motor Standing Desk", Description = "140x70cm oak desktop, 4 programmable memory heights, anti-collision", Price = 589.00m, CostPrice = 310.00m, UnitOfMeasure = "Units", ReorderLevel = 8, CategoryId = catFurn.Id, SupplierId = supNordic.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
        var p6 = new Product { SKU = "PRD-SW-006", Name = "Managed 24-Port Gigabit PoE+ Switch", Description = "Layer 2/3 enterprise managed rack-mount switch, 370W budget", Price = 420.00m, CostPrice = 260.00m, UnitOfMeasure = "Units", ReorderLevel = 12, CategoryId = catNet.Id, SupplierId = supVanguard.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
        var p7 = new Product { SKU = "PRD-RT-007", Name = "Enterprise WiFi 6 Mesh Access Point", Description = "AX3000 dual-band cloud managed access point with seamless roaming", Price = 179.99m, CostPrice = 95.00m, UnitOfMeasure = "Units", ReorderLevel = 30, CategoryId = catNet.Id, SupplierId = supVanguard.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
        var p8 = new Product { SKU = "PRD-HS-008", Name = "Noise-Cancelling Wireless Headset", Description = "Active noise-cancelling with noise-suppressing dual microphone", Price = 149.99m, CostPrice = 78.00m, UnitOfMeasure = "Units", ReorderLevel = 15, CategoryId = catElec.Id, SupplierId = supApex.Id, IsActive = true, CreatedAt = DateTime.UtcNow };

        context.Products.AddRange(p1, p2, p3, p4, p5, p6, p7, p8);
        context.SaveChanges();

        // 9. Seed Inventories across facilities
        var inventories = new List<Inventory>
        {
            // Central Hub
            new() { ProductId = p1.Id, WarehouseId = whCentral.Id, Quantity = 45, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p2.Id, WarehouseId = whCentral.Id, Quantity = 12, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow }, // Low stock (reorder level: 20)
            new() { ProductId = p3.Id, WarehouseId = whCentral.Id, Quantity = 60, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p4.Id, WarehouseId = whCentral.Id, Quantity = 25, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p5.Id, WarehouseId = whCentral.Id, Quantity = 14, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p6.Id, WarehouseId = whCentral.Id, Quantity = 8, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow }, // Low stock (reorder level: 12)
            new() { ProductId = p7.Id, WarehouseId = whCentral.Id, Quantity = 35, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p8.Id, WarehouseId = whCentral.Id, Quantity = 50, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },

            // West Coast Hub
            new() { ProductId = p1.Id, WarehouseId = whWest.Id, Quantity = 20, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p2.Id, WarehouseId = whWest.Id, Quantity = 28, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p3.Id, WarehouseId = whWest.Id, Quantity = 40, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p4.Id, WarehouseId = whWest.Id, Quantity = 5, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow }, // Low stock (reorder: 10)
            new() { ProductId = p5.Id, WarehouseId = whWest.Id, Quantity = 18, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },

            // East Coast Hub
            new() { ProductId = p1.Id, WarehouseId = whEast.Id, Quantity = 30, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p6.Id, WarehouseId = whEast.Id, Quantity = 22, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p7.Id, WarehouseId = whEast.Id, Quantity = 50, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow },
            new() { ProductId = p8.Id, WarehouseId = whEast.Id, Quantity = 15, ReservedQuantity = 0, CreatedAt = DateTime.UtcNow }
        };

        context.Inventories.AddRange(inventories);
        context.SaveChanges();

        // 10. Seed Initial Stock Movements
        foreach (var inv in inventories)
        {
            context.StockMovements.Add(new StockMovement
            {
                ProductId = inv.ProductId,
                WarehouseId = inv.WarehouseId,
                MovementType = MovementType.PurchaseReceive,
                Quantity = inv.Quantity,
                BalanceAfter = inv.Quantity,
                ReferenceNumber = "INIT-STOCK-2026",
                Notes = "Initial warehouse stock onboarding balance.",
                CreatedByUserId = userAdmin.Id,
                CreatedAt = DateTime.UtcNow
            });
        }
        context.SaveChanges();

        // 11. Seed Sample Orders
        var order1 = new Order
        {
            OrderNumber = "ORD-20261101-A101",
            CustomerName = "Apex Technology Solutions",
            CustomerEmail = "procurement@apextech.com",
            CustomerPhone = "+1-312-555-0144",
            ShippingAddress = "200 Michigan Avenue, Suite 1200, Chicago, IL 60601",
            OrderDate = DateTime.UtcNow.AddDays(-2),
            Status = OrderStatus.Confirmed,
            TotalAmount = 3149.48m,
            WarehouseId = whCentral.Id,
            CreatedByUserId = userSales.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        var orderItems1 = new List<OrderItem>
        {
            new() { ProductId = p1.Id, Quantity = 2, UnitPrice = p1.Price },
            new() { ProductId = p2.Id, Quantity = 1, UnitPrice = p2.Price }
        };
        order1.Items = orderItems1;

        var order2 = new Order
        {
            OrderNumber = "ORD-20261102-B202",
            CustomerName = "Cascade Creative Studio",
            CustomerEmail = "studio@cascadecreative.com",
            CustomerPhone = "+1-775-555-0188",
            ShippingAddress = "850 Sierra Blvd, Reno, NV 89501",
            OrderDate = DateTime.UtcNow.AddDays(-1),
            Status = OrderStatus.Delivered,
            TotalAmount = 1977.00m,
            WarehouseId = whWest.Id,
            CreatedByUserId = userSales.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var orderItems2 = new List<OrderItem>
        {
            new() { ProductId = p4.Id, Quantity = 3, UnitPrice = p4.Price },
            new() { ProductId = p5.Id, Quantity = 1, UnitPrice = p5.Price },
            new() { ProductId = p3.Id, Quantity = 2, UnitPrice = p3.Price }
        };
        order2.Items = orderItems2;

        context.Orders.AddRange(order1, order2);
        context.SaveChanges();

        // 12. Seed Audit Log
        context.AuditLogs.Add(new AuditLog
        {
            EntityName = "System",
            EntityId = "DB-INIT",
            Action = "DatabaseSeeded",
            UserId = userAdmin.Id,
            UserEmail = userAdmin.Email,
            ChangesJson = "{\"status\":\"Success\",\"provider\":\"Local\",\"demoDataVersion\":\"2026.1\"}",
            Timestamp = DateTime.UtcNow
        });
        context.SaveChanges();
    }
}
