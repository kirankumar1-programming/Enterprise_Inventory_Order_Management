-- ====================================================================
-- Database Backup Script for EnterpriseInventoryDb
-- Generated at: 2026-10-30 13:53:50
-- Compatible with SQL Server 2017+ / Azure SQL / LocalDB
-- ====================================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'EnterpriseInventoryDb')
BEGIN
    CREATE DATABASE [EnterpriseInventoryDb];
END
GO

USE [EnterpriseInventoryDb];
GO

-- 1. Drop constraints if re-running
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
               N' DROP CONSTRAINT ' + QUOTENAME(name) + ';' + CHAR(13) + CHAR(10)
FROM sys.foreign_keys;
EXEC sp_executesql @sql;
GO

-- 2. Drop existing tables if re-running
DECLARE @sqlDrop NVARCHAR(MAX) = N'';
SELECT @sqlDrop += N'DROP TABLE IF EXISTS ' + QUOTENAME(TABLE_SCHEMA) + '.' + QUOTENAME(TABLE_NAME) + ';' + CHAR(13) + CHAR(10)
FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
EXEC sp_executesql @sqlDrop;
GO

-- Table: [dbo].[Roles]
CREATE TABLE [dbo].[Roles] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(50) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[Categories]
CREATE TABLE [dbo].[Categories] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Code] NVARCHAR(20) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_Categories] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[Suppliers]
CREATE TABLE [dbo].[Suppliers] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(150) NOT NULL,
    [ContactPerson] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(150) NOT NULL,
    [Phone] NVARCHAR(50) NOT NULL,
    [Address] NVARCHAR(MAX) NOT NULL,
    [City] NVARCHAR(MAX) NOT NULL,
    [Country] NVARCHAR(MAX) NOT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_Suppliers] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[Warehouses]
CREATE TABLE [dbo].[Warehouses] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Code] NVARCHAR(20) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Location] NVARCHAR(MAX) NOT NULL,
    [Address] NVARCHAR(MAX) NOT NULL,
    [Capacity] INT NOT NULL,
    [IsActive] BIT NOT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_Warehouses] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[Users]
CREATE TABLE [dbo].[Users] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Username] NVARCHAR(50) NOT NULL,
    [Email] NVARCHAR(150) NOT NULL,
    [PasswordHash] NVARCHAR(255) NOT NULL,
    [FullName] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL,
    [RoleId] INT NOT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[Products]
CREATE TABLE [dbo].[Products] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [SKU] NVARCHAR(50) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Price] DECIMAL(18, 2) NOT NULL,
    [CostPrice] DECIMAL(18, 2) NOT NULL,
    [UnitOfMeasure] NVARCHAR(MAX) NOT NULL,
    [ReorderLevel] INT NOT NULL,
    [IsActive] BIT NOT NULL,
    [CategoryId] INT NOT NULL,
    [SupplierId] INT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_Products] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[Inventories]
CREATE TABLE [dbo].[Inventories] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [ProductId] INT NOT NULL,
    [WarehouseId] INT NOT NULL,
    [Quantity] INT NOT NULL,
    [ReservedQuantity] INT NOT NULL,
    [RowVersion] ROWVERSION NOT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_Inventories] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[Orders]
CREATE TABLE [dbo].[Orders] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [OrderNumber] NVARCHAR(50) NOT NULL,
    [CustomerName] NVARCHAR(100) NOT NULL,
    [CustomerEmail] NVARCHAR(150) NOT NULL,
    [CustomerPhone] NVARCHAR(MAX) NULL,
    [ShippingAddress] NVARCHAR(MAX) NOT NULL,
    [OrderDate] DATETIME2(7) NOT NULL,
    [Status] INT NOT NULL,
    [TotalAmount] DECIMAL(18, 2) NOT NULL,
    [WarehouseId] INT NOT NULL,
    [CreatedByUserId] INT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_Orders] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[OrderItems]
CREATE TABLE [dbo].[OrderItems] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [OrderId] INT NOT NULL,
    [ProductId] INT NOT NULL,
    [Quantity] INT NOT NULL,
    [UnitPrice] DECIMAL(18, 2) NOT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_OrderItems] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[StockMovements]
CREATE TABLE [dbo].[StockMovements] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [ProductId] INT NOT NULL,
    [WarehouseId] INT NOT NULL,
    [MovementType] INT NOT NULL,
    [Quantity] INT NOT NULL,
    [BalanceAfter] INT NOT NULL,
    [ReferenceNumber] NVARCHAR(100) NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [CreatedByUserId] INT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL,
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_StockMovements] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Table: [dbo].[AuditLogs]
CREATE TABLE [dbo].[AuditLogs] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [EntityName] NVARCHAR(100) NOT NULL,
    [EntityId] NVARCHAR(100) NOT NULL,
    [Action] NVARCHAR(50) NOT NULL,
    [UserId] INT NULL,
    [UserEmail] NVARCHAR(150) NULL,
    [ChangesJson] NVARCHAR(MAX) NULL,
    [Timestamp] DATETIME2(7) NOT NULL,
    [IpAddress] NVARCHAR(50) NULL,
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY CLUSTERED ([Id])
);
GO

-- Foreign Keys
ALTER TABLE [dbo].[Inventories] WITH CHECK ADD CONSTRAINT [FK_Inventories_Products_ProductId] FOREIGN KEY([ProductId]) REFERENCES [dbo].[Products] ([Id]);
GO
ALTER TABLE [dbo].[Inventories] WITH CHECK ADD CONSTRAINT [FK_Inventories_Warehouses_WarehouseId] FOREIGN KEY([WarehouseId]) REFERENCES [dbo].[Warehouses] ([Id]);
GO
ALTER TABLE [dbo].[OrderItems] WITH CHECK ADD CONSTRAINT [FK_OrderItems_Orders_OrderId] FOREIGN KEY([OrderId]) REFERENCES [dbo].[Orders] ([Id]);
GO
ALTER TABLE [dbo].[OrderItems] WITH CHECK ADD CONSTRAINT [FK_OrderItems_Products_ProductId] FOREIGN KEY([ProductId]) REFERENCES [dbo].[Products] ([Id]);
GO
ALTER TABLE [dbo].[Orders] WITH CHECK ADD CONSTRAINT [FK_Orders_Warehouses_WarehouseId] FOREIGN KEY([WarehouseId]) REFERENCES [dbo].[Warehouses] ([Id]);
GO
ALTER TABLE [dbo].[Orders] WITH CHECK ADD CONSTRAINT [FK_Orders_Users_CreatedByUserId] FOREIGN KEY([CreatedByUserId]) REFERENCES [dbo].[Users] ([Id]);
GO
ALTER TABLE [dbo].[Products] WITH CHECK ADD CONSTRAINT [FK_Products_Categories_CategoryId] FOREIGN KEY([CategoryId]) REFERENCES [dbo].[Categories] ([Id]);
GO
ALTER TABLE [dbo].[Products] WITH CHECK ADD CONSTRAINT [FK_Products_Suppliers_SupplierId] FOREIGN KEY([SupplierId]) REFERENCES [dbo].[Suppliers] ([Id]);
GO
ALTER TABLE [dbo].[StockMovements] WITH CHECK ADD CONSTRAINT [FK_StockMovements_Products_ProductId] FOREIGN KEY([ProductId]) REFERENCES [dbo].[Products] ([Id]);
GO
ALTER TABLE [dbo].[StockMovements] WITH CHECK ADD CONSTRAINT [FK_StockMovements_Warehouses_WarehouseId] FOREIGN KEY([WarehouseId]) REFERENCES [dbo].[Warehouses] ([Id]);
GO
ALTER TABLE [dbo].[StockMovements] WITH CHECK ADD CONSTRAINT [FK_StockMovements_Users_CreatedByUserId] FOREIGN KEY([CreatedByUserId]) REFERENCES [dbo].[Users] ([Id]);
GO
ALTER TABLE [dbo].[Users] WITH CHECK ADD CONSTRAINT [FK_Users_Roles_RoleId] FOREIGN KEY([RoleId]) REFERENCES [dbo].[Roles] ([Id]);
GO

-- ====================================================================
-- DATA SEEDING / RESTORE
-- ====================================================================

-- Data for [dbo].[Roles] (4 rows)
SET IDENTITY_INSERT [dbo].[Roles] ON;
INSERT INTO [dbo].[Roles] ([Id], [Name], [Description]) VALUES (1, N'Admin', N'Full system administration access');
INSERT INTO [dbo].[Roles] ([Id], [Name], [Description]) VALUES (2, N'WarehouseManager', N'Warehouse and inventory operations');
INSERT INTO [dbo].[Roles] ([Id], [Name], [Description]) VALUES (3, N'SalesRepresentative', N'Order processing and inventory view');
INSERT INTO [dbo].[Roles] ([Id], [Name], [Description]) VALUES (4, N'Auditor', N'Read-only access for compliance and audits');
SET IDENTITY_INSERT [dbo].[Roles] OFF;
GO

-- Data for [dbo].[Categories] (4 rows)
SET IDENTITY_INSERT [dbo].[Categories] ON;
INSERT INTO [dbo].[Categories] ([Id], [Name], [Code], [Description], [CreatedAt], [UpdatedAt]) VALUES (1, N'Electronics & IT', N'CAT-ELEC', N'Computers, peripherals, monitors and accessories', '2026-10-16 06:11:39.3495962', NULL);
INSERT INTO [dbo].[Categories] ([Id], [Name], [Code], [Description], [CreatedAt], [UpdatedAt]) VALUES (2, N'Office Furniture', N'CAT-FURN', N'Ergonomic chairs, desks, storage systems', '2026-10-16 06:11:39.3497767', NULL);
INSERT INTO [dbo].[Categories] ([Id], [Name], [Code], [Description], [CreatedAt], [UpdatedAt]) VALUES (3, N'Networking Equipment', N'CAT-NET', N'Routers, switches, rack mounts, and cabling', '2026-10-16 06:11:39.3497771', NULL);
INSERT INTO [dbo].[Categories] ([Id], [Name], [Code], [Description], [CreatedAt], [UpdatedAt]) VALUES (4, N'Safety & Industrial', N'CAT-SAFE', N'Warehouse safety gear, PPE, tools', '2026-10-16 06:11:39.3497867', NULL);
SET IDENTITY_INSERT [dbo].[Categories] OFF;
GO

-- Data for [dbo].[Suppliers] (3 rows)
SET IDENTITY_INSERT [dbo].[Suppliers] ON;
INSERT INTO [dbo].[Suppliers] ([Id], [Name], [ContactPerson], [Email], [Phone], [Address], [City], [Country], [CreatedAt], [UpdatedAt]) VALUES (1, N'Apex Microelectronics Inc', N'David Chen', N'dchen@apexmicro.com', N'+1-415-555-0199', N'100 Silicon Way', N'San Jose', N'USA', '2026-10-16 06:11:39.3938435', '2026-10-29 06:40:26.4149542');
INSERT INTO [dbo].[Suppliers] ([Id], [Name], [ContactPerson], [Email], [Phone], [Address], [City], [Country], [CreatedAt], [UpdatedAt]) VALUES (2, N'Nordic Comfort Ergonomics', N'Ingrid Larson', N'ingrid@nordiccomfort.se', N'+46-8-123-4567', N'Klarabergsviadukten 63', N'Stockholm', N'Sweden', '2026-10-16 06:11:39.3940324', NULL);
INSERT INTO [dbo].[Suppliers] ([Id], [Name], [ContactPerson], [Email], [Phone], [Address], [City], [Country], [CreatedAt], [UpdatedAt]) VALUES (3, N'Vanguard Network Tech', N'Elena Rostov', N'elena@vanguardnet.com', N'+1-206-555-8844', N'404 Industrial Blvd', N'Seattle', N'USA', '2026-10-16 06:11:39.3940327', NULL);
SET IDENTITY_INSERT [dbo].[Suppliers] OFF;
GO

-- Data for [dbo].[Warehouses] (3 rows)
SET IDENTITY_INSERT [dbo].[Warehouses] ON;
INSERT INTO [dbo].[Warehouses] ([Id], [Code], [Name], [Location], [Address], [Capacity], [IsActive], [CreatedAt], [UpdatedAt]) VALUES (1, N'WH-CENTRAL', N'Central Distribution Hub', N'Chicago, IL', N'1200 Logistics Parkway, Chicago, IL 60601', 50000, 1, '2026-10-16 06:11:39.4431865', NULL);
INSERT INTO [dbo].[Warehouses] ([Id], [Code], [Name], [Location], [Address], [Capacity], [IsActive], [CreatedAt], [UpdatedAt]) VALUES (2, N'WH-WEST', N'West Coast Fulfillment Facility', N'Reno, NV', N'450 Desert Commerce Way, Reno, NV 89502', 35000, 1, '2026-10-16 06:11:39.4433151', NULL);
INSERT INTO [dbo].[Warehouses] ([Id], [Code], [Name], [Location], [Address], [Capacity], [IsActive], [CreatedAt], [UpdatedAt]) VALUES (3, N'WH-EAST', N'East Coast Gateway Warehouse', N'Allentown, PA', N'88 Lehigh Valley Dr, Allentown, PA 18109', 40000, 1, '2026-10-16 06:11:39.4433154', NULL);
SET IDENTITY_INSERT [dbo].[Warehouses] OFF;
GO

-- Data for [dbo].[Users] (4 rows)
SET IDENTITY_INSERT [dbo].[Users] ON;
INSERT INTO [dbo].[Users] ([Id], [Username], [Email], [PasswordHash], [FullName], [IsActive], [RoleId], [CreatedAt], [UpdatedAt]) VALUES (1, N'admin', N'admin@enterprise.com', N'$2a$11$mz9jMBmU8XI4xCl028k7L.pBHz.r5pzyBBEUY0f7s7Eg3NWpMVIjG', N'Enterprise Administrator', 1, 1, '2026-10-16 06:11:39.2303000', NULL);
INSERT INTO [dbo].[Users] ([Id], [Username], [Email], [PasswordHash], [FullName], [IsActive], [RoleId], [CreatedAt], [UpdatedAt]) VALUES (2, N'manager', N'manager@enterprise.com', N'$2a$11$mz9jMBmU8XI4xCl028k7L.pBHz.r5pzyBBEUY0f7s7Eg3NWpMVIjG', N'Michael Warehouse Manager', 1, 2, '2026-10-16 06:11:39.2308796', NULL);
INSERT INTO [dbo].[Users] ([Id], [Username], [Email], [PasswordHash], [FullName], [IsActive], [RoleId], [CreatedAt], [UpdatedAt]) VALUES (3, N'sales', N'sales@enterprise.com', N'$2a$11$mz9jMBmU8XI4xCl028k7L.pBHz.r5pzyBBEUY0f7s7Eg3NWpMVIjG', N'Sarah Sales Representative', 1, 3, '2026-10-16 06:11:39.2308804', NULL);
INSERT INTO [dbo].[Users] ([Id], [Username], [Email], [PasswordHash], [FullName], [IsActive], [RoleId], [CreatedAt], [UpdatedAt]) VALUES (4, N'auditor', N'auditor@enterprise.com', N'$2a$11$mz9jMBmU8XI4xCl028k7L.pBHz.r5pzyBBEUY0f7s7Eg3NWpMVIjG', N'Arthur Compliance Auditor', 1, 4, '2026-10-16 06:11:39.2308805', NULL);
SET IDENTITY_INSERT [dbo].[Users] OFF;
GO

-- Data for [dbo].[Products] (9 rows)
SET IDENTITY_INSERT [dbo].[Products] ON;
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (1, N'PRD-LT-001', N'Enterprise ProBook 15" Laptop', N'Intel Core i7, 32GB RAM, 1TB NVMe SSD, Win 11 Pro', 1299.99, 850.00, N'Units', 15, 1, 1, 1, '2026-10-16 06:11:39.5910429', NULL);
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (2, N'PRD-MN-002', N'UltraWide 34" Curved 4K Monitor', N'3440x1440 IPS, 144Hz, HDR400, USB-C 90W PD Docking', 549.50, 320.00, N'Units', 20, 1, 1, 1, '2026-10-16 06:11:39.5917749', NULL);
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (3, N'PRD-KB-003', N'Mechanical Tactile Wireless Keyboard', N'Low-latency Bluetooth & 2.4GHz wireless mechanical keyboard', 89.99, 45.00, N'Units', 25, 1, 1, 1, '2026-10-16 06:11:39.5917759', NULL);
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (4, N'PRD-CH-004', N'ErgoComfort High-Back Office Mesh Chair', N'Multi-tilt ergonomic office chair with breathable Korean mesh', 399.00, 210.00, N'Units', 10, 1, 2, 2, '2026-10-16 06:11:39.5917762', '2026-10-28 10:42:42.9862731');
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (5, N'PRD-DK-005', N'Electric Dual-Motor Standing Desk', N'140x70cm oak desktop, 4 programmable memory heights, anti-collision', 589.00, 310.00, N'Units', 8, 1, 2, 2, '2026-10-16 06:11:39.5917765', NULL);
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (6, N'PRD-SW-006', N'Managed 24-Port Gigabit PoE+ Switch', N'Layer 2/3 enterprise managed rack-mount switch, 370W budget', 420.00, 260.00, N'Units', 12, 1, 3, 3, '2026-10-16 06:11:39.5917837', NULL);
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (7, N'PRD-RT-007', N'Enterprise WiFi 6 Mesh Access Point', N'AX3000 dual-band cloud managed access point with seamless roaming', 179.99, 95.00, N'Units', 30, 1, 3, 3, '2026-10-16 06:11:39.5917841', NULL);
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (8, N'PRD-HS-008', N'Noise-Cancelling Wireless Headset', N'Active noise-cancelling with noise-suppressing dual microphone', 149.99, 78.00, N'Units', 15, 1, 1, 1, '2026-10-16 06:11:39.5917844', NULL);
INSERT INTO [dbo].[Products] ([Id], [SKU], [Name], [Description], [Price], [CostPrice], [UnitOfMeasure], [ReorderLevel], [IsActive], [CategoryId], [SupplierId], [CreatedAt], [UpdatedAt]) VALUES (9, N'TP0001', N'Testing Product 001', N'Testing Product Saving', 5.00, 3.00, N'Units', 10, 1, 1, NULL, '2026-10-27 05:37:01.0445834', NULL);
SET IDENTITY_INSERT [dbo].[Products] OFF;
GO

-- Data for [dbo].[Inventories] (26 rows)
SET IDENTITY_INSERT [dbo].[Inventories] ON;
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (1, 1, 1, 50, 5, '2026-10-16 06:11:39.7407173', '2026-10-27 04:54:34.6616171');
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (2, 1, 2, 30, 0, '2026-10-16 06:11:39.7408132', '2026-10-30 05:27:08.3040356');
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (3, 1, 3, 25, 2, '2026-10-16 06:11:39.7408134', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (4, 2, 1, 50, 5, '2026-10-16 06:11:39.7408137', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (5, 2, 2, 35, 0, '2026-10-16 06:11:39.7408146', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (6, 2, 3, 25, 2, '2026-10-16 06:11:39.7408148', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (7, 3, 1, 50, 5, '2026-10-16 06:11:39.7408149', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (8, 3, 2, 35, 0, '2026-10-16 06:11:39.7408150', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (9, 3, 3, 42, 2, '2026-10-16 06:11:39.7408151', '2026-10-30 05:27:26.7032034');
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (10, 4, 1, 50, 5, '2026-10-16 06:11:39.7408153', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (11, 4, 2, 25, 0, '2026-10-16 06:11:39.7408154', '2026-10-30 05:47:57.1057408');
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (12, 4, 3, 25, 2, '2026-10-16 06:11:39.7408155', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (13, 5, 1, 50, 5, '2026-10-16 06:11:39.7408156', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (14, 5, 2, 35, 0, '2026-10-16 06:11:39.7408157', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (15, 5, 3, 25, 2, '2026-10-16 06:11:39.7408158', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (16, 6, 1, 50, 5, '2026-10-16 06:11:39.7408158', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (17, 6, 2, 4, 0, '2026-10-16 06:11:39.7408160', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (18, 6, 3, 25, 2, '2026-10-16 06:11:39.7408161', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (19, 7, 1, 50, 5, '2026-10-16 06:11:39.7408162', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (20, 7, 2, 35, 0, '2026-10-16 06:11:39.7408163', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (21, 7, 3, 25, 2, '2026-10-16 06:11:39.7408164', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (22, 8, 1, 50, 5, '2026-10-16 06:11:39.7408164', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (23, 8, 2, 35, 0, '2026-10-16 06:11:39.7408166', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (24, 8, 3, 25, 2, '2026-10-16 06:11:39.7408166', NULL);
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (25, 9, 1, 28, 0, '2026-10-27 05:38:44.0212906', '2026-10-30 05:50:35.7464505');
INSERT INTO [dbo].[Inventories] ([Id], [ProductId], [WarehouseId], [Quantity], [ReservedQuantity], [CreatedAt], [UpdatedAt]) VALUES (26, 9, 3, 2, 0, '2026-10-30 05:50:35.7677270', NULL);
SET IDENTITY_INSERT [dbo].[Inventories] OFF;
GO

-- Data for [dbo].[Orders] (5 rows)
SET IDENTITY_INSERT [dbo].[Orders] ON;
INSERT INTO [dbo].[Orders] ([Id], [OrderNumber], [CustomerName], [CustomerEmail], [CustomerPhone], [ShippingAddress], [OrderDate], [Status], [TotalAmount], [WarehouseId], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (1, N'ORD-202610-001', N'Acme Technologies Global', N'procurement@acmeglobal.com', N'+1-555-0101', N'500 Tech Parkway, Suite 400, Chicago, IL 60611', '2026-10-14 06:11:39.9153099', 2, 3149.48, 1, 3, '2026-10-16 06:11:39.9152005', NULL);
INSERT INTO [dbo].[Orders] ([Id], [OrderNumber], [CustomerName], [CustomerEmail], [CustomerPhone], [ShippingAddress], [OrderDate], [Status], [TotalAmount], [WarehouseId], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (2, N'ORD-202610-002', N'Apex Studio Architects', N'office@apexstudio.io', N'+1-555-0202', N'120 Design Way, Chicago, IL 60607', '2026-10-15 06:11:39.9155402', 1, 798.00, 1, 3, '2026-10-16 06:11:39.9155401', NULL);
INSERT INTO [dbo].[Orders] ([Id], [OrderNumber], [CustomerName], [CustomerEmail], [CustomerPhone], [ShippingAddress], [OrderDate], [Status], [TotalAmount], [WarehouseId], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (3, N'ORD-20261016-8EB593', N'Global Logistics Ltd', N'procure@globallogistics.com', N'+1-555-8899', N'99 Terminal Way, Chicago, IL', '2026-10-16 06:13:07.5198204', 5, 2599.98, 1, 1, '2026-10-16 06:13:07.5201846', '2026-10-16 06:13:07.7202412');
INSERT INTO [dbo].[Orders] ([Id], [OrderNumber], [CustomerName], [CustomerEmail], [CustomerPhone], [ShippingAddress], [OrderDate], [Status], [TotalAmount], [WarehouseId], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (4, N'ORD-20261016-E409C2', N'Apex Enterprise Verification', N'test@apexenterprise.com', N'+1-555-4321', N'500 Logistics Boulevard, Suite 100, Chicago, IL', '2026-10-16 06:39:50.8081985', 5, 1299.99, 1, 1, '2026-10-16 06:39:50.8082136', '2026-10-16 06:39:50.8692081');
INSERT INTO [dbo].[Orders] ([Id], [OrderNumber], [CustomerName], [CustomerEmail], [CustomerPhone], [ShippingAddress], [OrderDate], [Status], [TotalAmount], [WarehouseId], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (5, N'ORD-20261027-0ED8BF', N'Apex Enterprise Verification', N'test@apexenterprise.com', N'+1-555-4321', N'500 Logistics Boulevard, Suite 100, Chicago, IL', '2026-10-27 04:54:33.8000017', 5, 1299.99, 1, 1, '2026-10-27 04:54:33.8029314', '2026-10-27 04:54:34.6623220');
SET IDENTITY_INSERT [dbo].[Orders] OFF;
GO

-- Data for [dbo].[OrderItems] (6 rows)
SET IDENTITY_INSERT [dbo].[OrderItems] ON;
INSERT INTO [dbo].[OrderItems] ([Id], [OrderId], [ProductId], [Quantity], [UnitPrice], [CreatedAt], [UpdatedAt]) VALUES (1, 1, 1, 2, 1299.99, '2026-10-16 06:11:39.9154754', NULL);
INSERT INTO [dbo].[OrderItems] ([Id], [OrderId], [ProductId], [Quantity], [UnitPrice], [CreatedAt], [UpdatedAt]) VALUES (2, 1, 2, 1, 549.50, '2026-10-16 06:11:39.9155230', NULL);
INSERT INTO [dbo].[OrderItems] ([Id], [OrderId], [ProductId], [Quantity], [UnitPrice], [CreatedAt], [UpdatedAt]) VALUES (3, 2, 4, 2, 399.00, '2026-10-16 06:11:39.9155411', NULL);
INSERT INTO [dbo].[OrderItems] ([Id], [OrderId], [ProductId], [Quantity], [UnitPrice], [CreatedAt], [UpdatedAt]) VALUES (4, 3, 1, 2, 1299.99, '2026-10-16 06:13:07.5208406', NULL);
INSERT INTO [dbo].[OrderItems] ([Id], [OrderId], [ProductId], [Quantity], [UnitPrice], [CreatedAt], [UpdatedAt]) VALUES (5, 4, 1, 1, 1299.99, '2026-10-16 06:39:50.8082342', NULL);
INSERT INTO [dbo].[OrderItems] ([Id], [OrderId], [ProductId], [Quantity], [UnitPrice], [CreatedAt], [UpdatedAt]) VALUES (6, 5, 1, 1, 1299.99, '2026-10-27 04:54:33.8067979', NULL);
SET IDENTITY_INSERT [dbo].[OrderItems] OFF;
GO

-- Data for [dbo].[StockMovements] (15 rows)
SET IDENTITY_INSERT [dbo].[StockMovements] ON;
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (1, 1, 1, 2, -2, 48, N'ORD-202610-001', N'Stock allocated on order confirmation.', 3, '2026-10-16 06:11:40.0103239', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (2, 2, 1, 2, -1, 49, N'ORD-202610-001', N'Stock allocated on order confirmation.', 3, '2026-10-16 06:11:40.0340798', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (3, 1, 1, 2, -2, 48, N'ORD-20261016-8EB593', N'Stock deducted for order ORD-20261016-8EB593.', 1, '2026-10-16 06:13:07.5208494', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (4, 1, 1, 4, 2, 50, N'ORD-20261016-8EB593', N'Stock restored from cancelled order. Reason: Customer changed mind', 1, '2026-10-16 06:13:07.7200946', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (5, 1, 1, 2, -1, 49, N'ORD-20261016-E409C2', N'Stock deducted for order ORD-20261016-E409C2.', 1, '2026-10-16 06:39:50.8082349', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (6, 1, 1, 4, 1, 50, N'ORD-20261016-E409C2', N'Stock restored from cancelled order. Reason: Verification cancellation test', 1, '2026-10-16 06:39:50.8691240', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (7, 1, 1, 2, -1, 49, N'ORD-20261027-0ED8BF', N'Stock deducted for order ORD-20261027-0ED8BF.', 1, '2026-10-27 04:54:33.8075929', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (8, 1, 1, 4, 1, 50, N'ORD-20261027-0ED8BF', N'Stock restored from cancelled order. Reason: Verification cancellation test', 1, '2026-10-27 04:54:34.6617168', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (9, 9, 1, 3, 10, 10, N'ADJ-20261027053844', N'Physical inventory audit', 2, '2026-10-27 05:38:44.0513300', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (10, 9, 1, 3, 20, 30, N'ADJ-20261027054227', N'Safety stock increment', 2, '2026-10-27 05:42:27.9474175', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (11, 1, 2, 3, 26, 30, N'ADJ-20261030052708', N'Automated low-stock threshold replenishment', 1, '2026-10-30 05:27:08.3043150', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (12, 3, 3, 3, 17, 42, N'ADJ-20261030052726', N'Automated low-stock threshold replenishment', 1, '2026-10-30 05:27:26.7032342', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (13, 4, 2, 3, 21, 25, N'ADJ-20261030054757', N'Automated low-stock threshold replenishment', 1, '2026-10-30 05:47:57.1057849', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (14, 9, 1, 6, -2, 28, N'TRF-20261030055035', N'Transfer to warehouse #3. Inter-warehouse stock rebalance', 1, '2026-10-30 05:50:35.7714256', NULL);
INSERT INTO [dbo].[StockMovements] ([Id], [ProductId], [WarehouseId], [MovementType], [Quantity], [BalanceAfter], [ReferenceNumber], [Notes], [CreatedByUserId], [CreatedAt], [UpdatedAt]) VALUES (15, 9, 3, 5, 2, 2, N'TRF-20261030055035', N'Transfer from warehouse #1. Inter-warehouse stock rebalance', 1, '2026-10-30 05:50:35.7715963', NULL);
SET IDENTITY_INSERT [dbo].[StockMovements] OFF;
GO

-- Data for [dbo].[AuditLogs] (67 rows)
SET IDENTITY_INSERT [dbo].[AuditLogs] ON;
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (1, N'Order', N'ORD-202610-001', N'CreatedAndConfirmed', 3, N'sales@enterprise.com', N'{"status":"Confirmed","totalAmount":4098.98}', '2026-10-14 06:11:40.0345673', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (2, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-16 06:12:22.2806636', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (3, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-16 06:13:07.3507354', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (4, N'Order', N'ORD-20261016-8EB593', N'CreateOrderWithStockAllocation', 1, N'admin@enterprise.com', N'{"orderNumber":"ORD-20261016-8EB593","totalAmount":2599.98,"itemCount":1}', '2026-10-16 06:13:07.5218703', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (5, N'Order', N'ORD-20261016-8EB593', N'CancelOrder', 1, N'admin@enterprise.com', N'{"orderNumber":"ORD-20261016-8EB593","status":"Cancelled","stockRestored":true,"reason":"Customer changed mind"}', '2026-10-16 06:13:07.7202777', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (6, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-16 06:39:50.6137181', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (7, N'Order', N'ORD-20261016-E409C2', N'CreateOrderWithStockAllocation', 1, N'admin@enterprise.com', N'{"orderNumber":"ORD-20261016-E409C2","totalAmount":1299.99,"itemCount":1}', '2026-10-16 06:39:50.8084527', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (8, N'Order', N'ORD-20261016-E409C2', N'CancelOrder', 1, N'admin@enterprise.com', N'{"orderNumber":"ORD-20261016-E409C2","status":"Cancelled","stockRestored":true,"reason":"Verification cancellation test"}', '2026-10-16 06:39:50.8692178', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (9, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-16 07:47:37.3641386', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (10, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-16 07:49:32.4978650', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (11, N'User', N'3', N'UserLogin', 3, N'sales@enterprise.com', N'{"status":"Success"}', '2026-10-16 07:50:17.8215506', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (12, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-16 07:50:47.7851878', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (13, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-19 08:07:40.8858273', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (14, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-19 08:08:05.4828370', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (15, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-19 08:11:21.0804848', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (16, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-19 09:52:36.2850739', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (17, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-19 09:53:00.0591862', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (18, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-19 10:15:47.8002555', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (19, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-23 04:56:03.2153125', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (20, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-23 05:37:12.6903123', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (21, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-23 05:50:20.8953490', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (22, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-23 05:51:32.0445824', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (23, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-23 06:19:15.9843765', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (24, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-23 10:15:43.1886019', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (25, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-23 10:15:52.7083247', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (26, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-23 10:19:02.2384861', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (27, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-23 10:25:14.5098055', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (28, N'User', N'3', N'UserLogin', 3, N'sales@enterprise.com', N'{"status":"Success"}', '2026-10-23 10:26:02.6072095', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (29, N'User', N'4', N'UserLogin', 4, N'auditor@enterprise.com', N'{"status":"Success"}', '2026-10-23 10:27:06.6677093', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (30, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 04:30:54.3535741', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (31, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 04:39:06.1048495', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (32, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 04:44:16.8853467', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (33, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 04:54:32.8892376', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (34, N'Order', N'ORD-20261027-0ED8BF', N'CreateOrderWithStockAllocation', 1, N'admin@enterprise.com', N'{"orderNumber":"ORD-20261027-0ED8BF","totalAmount":1299.99,"itemCount":1}', '2026-10-27 04:54:33.9752484', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (35, N'Order', N'ORD-20261027-0ED8BF', N'CancelOrder', 1, N'admin@enterprise.com', N'{"orderNumber":"ORD-20261027-0ED8BF","status":"Cancelled","stockRestored":true,"reason":"Verification cancellation test"}', '2026-10-27 04:54:34.6624136', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (36, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-27 05:16:51.4756007', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (37, N'User', N'3', N'UserLogin', 3, N'sales@enterprise.com', N'{"status":"Success"}', '2026-10-27 05:17:17.8843589', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (38, N'User', N'2', N'UserLogin', 2, N'manager@enterprise.com', N'{"status":"Success"}', '2026-10-27 05:35:18.9354435', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (39, N'Product', N'9', N'CreateProduct', 2, N'manager@enterprise.com', N'{"sku":"TP0001","name":"Testing Product 001","price":5}', '2026-10-27 05:37:01.0695185', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (40, N'Inventory', N'9-1', N'StockAdjustment', 2, N'manager@enterprise.com', N'{"adjustment":10,"newQuantity":10,"reason":"Physical inventory audit"}', '2026-10-27 05:38:44.0515955', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (41, N'Inventory', N'9-1', N'StockAdjustment', 2, N'manager@enterprise.com', N'{"adjustment":20,"newQuantity":30,"reason":"Safety stock increment"}', '2026-10-27 05:42:27.9480680', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (42, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 05:46:18.0094058', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (43, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 05:55:07.2701669', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (44, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 05:56:24.1103158', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (45, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 05:59:07.3140520', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (46, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 05:59:37.2107169', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (47, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 10:26:44.5698831', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (48, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 10:27:41.8559767', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (49, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 10:28:39.7991466', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (50, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-27 11:04:27.0324736', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (51, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-28 10:12:19.4095391', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (52, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-28 10:15:13.9362373', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (53, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-28 10:42:42.8516572', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (54, N'Product', N'4', N'UpdateProduct', 1, N'admin@enterprise.com', N'{"id":4,"name":"ErgoComfort High-Back Office Mesh Chair","price":399.00}', '2026-10-28 10:42:42.9864410', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (55, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-28 10:44:33.7953426', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (56, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-28 10:48:04.4518533', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (57, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-28 10:48:23.0699384', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (58, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-28 10:48:54.9309733', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (59, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-28 10:52:16.5182122', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (60, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-29 06:23:06.7403655', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (61, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-29 06:40:25.8854761', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (62, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-29 06:47:34.3958765', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (63, N'User', N'1', N'UserLogin', 1, N'admin@enterprise.com', N'{"status":"Success"}', '2026-10-30 05:08:58.2210090', N'::1');
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (64, N'Inventory', N'1-2', N'StockAdjustment', 1, N'admin@enterprise.com', N'{"adjustment":26,"newQuantity":30,"reason":"Automated low-stock threshold replenishment"}', '2026-10-30 05:27:08.3518916', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (65, N'Inventory', N'3-3', N'StockAdjustment', 1, N'admin@enterprise.com', N'{"adjustment":17,"newQuantity":42,"reason":"Automated low-stock threshold replenishment"}', '2026-10-30 05:27:26.7035648', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (66, N'Inventory', N'4-2', N'StockAdjustment', 1, N'admin@enterprise.com', N'{"adjustment":21,"newQuantity":25,"reason":"Automated low-stock threshold replenishment"}', '2026-10-30 05:47:57.1061330', NULL);
INSERT INTO [dbo].[AuditLogs] ([Id], [EntityName], [EntityId], [Action], [UserId], [UserEmail], [ChangesJson], [Timestamp], [IpAddress]) VALUES (67, N'InventoryTransfer', N'TRF-20261030055035', N'StockTransfer', 1, N'admin@enterprise.com', N'{"productId":9,"fromWh":1,"toWh":3,"quantity":2}', '2026-10-30 05:50:35.7716471', NULL);
SET IDENTITY_INSERT [dbo].[AuditLogs] OFF;
GO
