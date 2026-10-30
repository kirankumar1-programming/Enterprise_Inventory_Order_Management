# EnterpriseInventoryDb - Database Backup & Restoration Guide

This directory contains the database backup and restore scripts for **EnterpriseInventoryDb**.

---

## Files Included

1. **`EnterpriseInventoryDb_Backup.sql`** (Recommended)
   - Complete T-SQL script containing all table definitions, primary keys, foreign key constraints, and seed data (AuditLogs, Categories, Roles, Suppliers, Warehouses, Users, Products, Orders, Inventories, StockMovements, OrderItems).
   - Compatible with **SQL Server 2017+**, **SQL Server Express**, **LocalDB**, **Azure SQL Database**, and **Docker SQL Server**.

2. **`EnterpriseInventoryDb.bak`**
   - Native SQL Server binary backup file generated from `(localdb)\MSSQLLocalDB`.

---

## How to Restore

### Option 1: Execute SQL Script (Recommended)

You can run `EnterpriseInventoryDb_Backup.sql` using:
- **SQL Server Management Studio (SSMS)**: Open the `.sql` file and click **Execute**.
- **Azure Data Studio / VS Code MSSQL**: Open the file and run query.
- **PowerShell / sqlcmd**:
  ```powershell
  sqlcmd -S "(localdb)\MSSQLLocalDB" -i "EnterpriseInventoryDb_Backup.sql"
  ```

---

### Option 2: Restore from `.bak` File

Using SSMS:
1. Right-click **Databases** > **Restore Database...**
2. Choose **Device** and browse to select `EnterpriseInventoryDb.bak`.
3. Check the destination database name `EnterpriseInventoryDb`.
4. Click **OK**.

Or using T-SQL:
```sql
RESTORE DATABASE [EnterpriseInventoryDb]
FROM DISK = N'C:\Task\EnterpriseInventoryManagement\EnterpriseInventoryApi\Database\EnterpriseInventoryDb.bak'
WITH REPLACE, RECOVERY;
GO
```

---

## Default Seeded Accounts

| Role | Username | Email |
| :--- | :--- | :--- |
| **Admin** | admin | admin@inventory.com |
| **Manager** | manager | manager@inventory.com |
| **Staff** | staff | staff@inventory.com |
| **Auditor** | auditor | auditor@inventory.com |
