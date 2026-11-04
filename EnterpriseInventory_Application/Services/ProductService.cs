using Microsoft.EntityFrameworkCore;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory.Core.Interfaces;

namespace EnterpriseInventory_Application.Services;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetProductsAsync(ProductFilterParams filter);
    Task<ProductDto> GetProductByIdAsync(int id);
    Task<ProductDto> CreateProductAsync(CreateProductDto dto);
    Task<ProductDto> UpdateProductAsync(int id, UpdateProductDto dto);
    Task<bool> DeleteProductAsync(int id);
}

public class ProductService : IProductService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public ProductService(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<PagedResult<ProductDto>> GetProductsAsync(ProductFilterParams filter)
    {
        var query = _unitOfWork.Products.Query()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .Include(p => p.Inventories)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var search = filter.SearchTerm.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(search) || 
                                     p.SKU.ToLower().Contains(search));
        }

        if (filter.CategoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == filter.CategoryId.Value);
        }

        if (filter.SupplierId.HasValue)
        {
            query = query.Where(p => p.SupplierId == filter.SupplierId.Value);
        }

        if (filter.WarehouseId.HasValue)
        {
            query = query.Where(p => p.Inventories.Any(i => i.WarehouseId == filter.WarehouseId.Value));
        }

        if (filter.LowStockOnly == true)
        {
            query = query.Where(p => p.Inventories.Sum(i => i.Quantity - i.ReservedQuantity) <= p.ReorderLevel);
        }

        // Sorting
        query = (filter.SortBy?.ToLower(), filter.SortDescending) switch
        {
            ("name", true) => query.OrderByDescending(p => p.Name),
            ("name", false) => query.OrderBy(p => p.Name),
            ("sku", true) => query.OrderByDescending(p => p.SKU),
            ("sku", false) => query.OrderBy(p => p.SKU),
            ("price", true) => query.OrderByDescending(p => p.Price),
            ("price", false) => query.OrderBy(p => p.Price),
            ("reorderlevel", true) => query.OrderByDescending(p => p.ReorderLevel),
            ("reorderlevel", false) => query.OrderBy(p => p.ReorderLevel),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        var totalCount = await query.CountAsync();

        var products = await query
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(p => new ProductDto
            {
                Id = p.Id,
                SKU = p.SKU,
                Name = p.Name,
                Description = p.Description,
                Price = p.Price,
                CostPrice = p.CostPrice,
                UnitOfMeasure = p.UnitOfMeasure,
                ReorderLevel = p.ReorderLevel,
                IsActive = p.IsActive,
                CategoryId = p.CategoryId,
                CategoryName = p.Category.Name,
                SupplierId = p.SupplierId,
                SupplierName = p.Supplier != null ? p.Supplier.Name : null,
                TotalQuantity = p.Inventories.Sum(i => i.Quantity),
                TotalAvailableQuantity = p.Inventories.Sum(i => i.Quantity - i.ReservedQuantity),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return new PagedResult<ProductDto>(products, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<ProductDto> GetProductByIdAsync(int id)
    {
        var p = await _unitOfWork.Products.Query()
            .Include(x => x.Category)
            .Include(x => x.Supplier)
            .Include(x => x.Inventories)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (p == null)
        {
            throw new NotFoundException("Product", id);
        }

        return new ProductDto
        {
            Id = p.Id,
            SKU = p.SKU,
            Name = p.Name,
            Description = p.Description,
            Price = p.Price,
            CostPrice = p.CostPrice,
            UnitOfMeasure = p.UnitOfMeasure,
            ReorderLevel = p.ReorderLevel,
            IsActive = p.IsActive,
            CategoryId = p.CategoryId,
            CategoryName = p.Category.Name,
            SupplierId = p.SupplierId,
            SupplierName = p.Supplier?.Name,
            TotalQuantity = p.Inventories.Sum(i => i.Quantity),
            TotalAvailableQuantity = p.Inventories.Sum(i => i.Quantity - i.ReservedQuantity),
            CreatedAt = p.CreatedAt
        };
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductDto dto)
    {
        // SKU uniqueness check
        var skuExists = await _unitOfWork.Products.Query().AnyAsync(p => p.SKU == dto.SKU.Trim());
        if (skuExists)
        {
            throw new BusinessRuleValidationException($"Product with SKU '{dto.SKU}' already exists.");
        }

        var categoryExists = await _unitOfWork.Categories.Query().AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists)
        {
            throw new NotFoundException("Category", dto.CategoryId);
        }

        if (dto.SupplierId.HasValue)
        {
            var supplierExists = await _unitOfWork.Suppliers.Query().AnyAsync(s => s.Id == dto.SupplierId.Value);
            if (!supplierExists)
            {
                throw new NotFoundException("Supplier", dto.SupplierId.Value);
            }
        }

        var product = new Product
        {
            SKU = dto.SKU.Trim().ToUpper(),
            Name = dto.Name.Trim(),
            Description = dto.Description,
            Price = dto.Price,
            CostPrice = dto.CostPrice,
            UnitOfMeasure = string.IsNullOrWhiteSpace(dto.UnitOfMeasure) ? "Units" : dto.UnitOfMeasure,
            ReorderLevel = dto.ReorderLevel,
            CategoryId = dto.CategoryId,
            SupplierId = dto.SupplierId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Products.AddAsync(product);
        await _unitOfWork.SaveChangesAsync();

        // Audit Log
        await _unitOfWork.AuditLogs.AddAsync(new AuditLog
        {
            EntityName = "Product",
            EntityId = product.Id.ToString(),
            Action = "CreateProduct",
            UserId = _currentUserService.UserId,
            UserEmail = _currentUserService.UserEmail,
            ChangesJson = $"{{\"sku\":\"{product.SKU}\",\"name\":\"{product.Name}\",\"price\":{product.Price}}}",
            Timestamp = DateTime.UtcNow
        });
        await _unitOfWork.SaveChangesAsync();

        return await GetProductByIdAsync(product.Id);
    }

    public async Task<ProductDto> UpdateProductAsync(int id, UpdateProductDto dto)
    {
        var product = await _unitOfWork.Products.GetByIdAsync(id);
        if (product == null)
        {
            throw new NotFoundException("Product", id);
        }

        var categoryExists = await _unitOfWork.Categories.Query().AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists)
        {
            throw new NotFoundException("Category", dto.CategoryId);
        }

        if (dto.SupplierId.HasValue)
        {
            var supplierExists = await _unitOfWork.Suppliers.Query().AnyAsync(s => s.Id == dto.SupplierId.Value);
            if (!supplierExists)
            {
                throw new NotFoundException("Supplier", dto.SupplierId.Value);
            }
        }

        product.Name = dto.Name.Trim();
        product.Description = dto.Description;
        product.Price = dto.Price;
        product.CostPrice = dto.CostPrice;
        product.UnitOfMeasure = dto.UnitOfMeasure;
        product.ReorderLevel = dto.ReorderLevel;
        product.IsActive = dto.IsActive;
        product.CategoryId = dto.CategoryId;
        product.SupplierId = dto.SupplierId;
        product.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Products.Update(product);

        // Audit Log
        await _unitOfWork.AuditLogs.AddAsync(new AuditLog
        {
            EntityName = "Product",
            EntityId = product.Id.ToString(),
            Action = "UpdateProduct",
            UserId = _currentUserService.UserId,
            UserEmail = _currentUserService.UserEmail,
            ChangesJson = $"{{\"id\":{product.Id},\"name\":\"{product.Name}\",\"price\":{product.Price}}}",
            Timestamp = DateTime.UtcNow
        });

        await _unitOfWork.SaveChangesAsync();
        return await GetProductByIdAsync(product.Id);
    }

    public async Task<bool> DeleteProductAsync(int id)
    {
        var product = await _unitOfWork.Products.Query()
            .Include(p => p.Inventories)
            .Include(p => p.OrderItems)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null)
        {
            throw new NotFoundException("Product", id);
        }

        // Soft delete if linked to orders or has existing stock
        if (product.OrderItems.Any() || product.Inventories.Any(i => i.Quantity > 0))
        {
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Products.Update(product);
        }
        else
        {
            _unitOfWork.Products.Delete(product);
        }

        await _unitOfWork.AuditLogs.AddAsync(new AuditLog
        {
            EntityName = "Product",
            EntityId = id.ToString(),
            Action = "DeleteProduct",
            UserId = _currentUserService.UserId,
            UserEmail = _currentUserService.UserEmail,
            ChangesJson = $"{{\"id\":{id},\"softDeleted\":{!product.IsActive}}}",
            Timestamp = DateTime.UtcNow
        });

        await _unitOfWork.SaveChangesAsync();
        return true;
    }
}

