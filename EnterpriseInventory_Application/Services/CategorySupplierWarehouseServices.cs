using Microsoft.EntityFrameworkCore;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory.Core.Interfaces;

namespace EnterpriseInventory_Application.Services;

public interface ICategoryService
{
    Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync();
    Task<CategoryDto> GetCategoryByIdAsync(int id);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto);
}

public interface ISupplierService
{
    Task<IEnumerable<SupplierDto>> GetAllSuppliersAsync();
    Task<SupplierDto> GetSupplierByIdAsync(int id);
    Task<SupplierDto> CreateSupplierAsync(CreateSupplierDto dto);
    Task<SupplierDto> UpdateSupplierAsync(int id, CreateSupplierDto dto);
}

public interface IWarehouseService
{
    Task<IEnumerable<WarehouseDto>> GetAllWarehousesAsync();
    Task<WarehouseDto> GetWarehouseByIdAsync(int id);
    Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseDto dto);
}

public class CategoryService : ICategoryService
{
    private readonly IUnitOfWork _unitOfWork;

    public CategoryService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync()
    {
        return await _unitOfWork.Categories.Query()
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                Description = c.Description,
                ProductCount = c.Products.Count
            })
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<CategoryDto> GetCategoryByIdAsync(int id)
    {
        var c = await _unitOfWork.Categories.Query()
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (c == null) throw new NotFoundException("Category", id);

        return new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Code = c.Code,
            Description = c.Description,
            ProductCount = c.Products.Count
        };
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto)
    {
        var exists = await _unitOfWork.Categories.Query().AnyAsync(c => c.Code == dto.Code.Trim());
        if (exists) throw new BusinessRuleValidationException($"Category with code '{dto.Code}' already exists.");

        var category = new Category
        {
            Name = dto.Name.Trim(),
            Code = dto.Code.Trim().ToUpper(),
            Description = dto.Description
        };

        await _unitOfWork.Categories.AddAsync(category);
        await _unitOfWork.SaveChangesAsync();
        return await GetCategoryByIdAsync(category.Id);
    }
}

public class SupplierService : ISupplierService
{
    private readonly IUnitOfWork _unitOfWork;

    public SupplierService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<SupplierDto>> GetAllSuppliersAsync()
    {
        return await _unitOfWork.Suppliers.Query()
            .Select(s => new SupplierDto
            {
                Id = s.Id,
                Name = s.Name,
                ContactPerson = s.ContactPerson,
                Email = s.Email,
                Phone = s.Phone,
                Address = s.Address,
                City = s.City,
                Country = s.Country,
                ProductCount = s.Products.Count
            })
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<SupplierDto> GetSupplierByIdAsync(int id)
    {
        var s = await _unitOfWork.Suppliers.Query()
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (s == null) throw new NotFoundException("Supplier", id);

        return new SupplierDto
        {
            Id = s.Id,
            Name = s.Name,
            ContactPerson = s.ContactPerson,
            Email = s.Email,
            Phone = s.Phone,
            Address = s.Address,
            City = s.City,
            Country = s.Country,
            ProductCount = s.Products.Count
        };
    }

    public async Task<SupplierDto> CreateSupplierAsync(CreateSupplierDto dto)
    {
        var supplier = new Supplier
        {
            Name = dto.Name.Trim(),
            ContactPerson = dto.ContactPerson.Trim(),
            Email = dto.Email.Trim(),
            Phone = dto.Phone.Trim(),
            Address = dto.Address.Trim(),
            City = dto.City.Trim(),
            Country = dto.Country.Trim()
        };

        await _unitOfWork.Suppliers.AddAsync(supplier);
        await _unitOfWork.SaveChangesAsync();
        return await GetSupplierByIdAsync(supplier.Id);
    }

    public async Task<SupplierDto> UpdateSupplierAsync(int id, CreateSupplierDto dto)
    {
        var supplier = await _unitOfWork.Suppliers.GetByIdAsync(id);
        if (supplier == null) throw new NotFoundException("Supplier", id);

        supplier.Name = dto.Name.Trim();
        supplier.ContactPerson = dto.ContactPerson.Trim();
        supplier.Email = dto.Email.Trim();
        supplier.Phone = dto.Phone.Trim();
        supplier.Address = dto.Address.Trim();
        supplier.City = dto.City.Trim();
        supplier.Country = dto.Country.Trim();
        supplier.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Suppliers.Update(supplier);
        await _unitOfWork.SaveChangesAsync();
        return await GetSupplierByIdAsync(supplier.Id);
    }
}

public class WarehouseService : IWarehouseService
{
    private readonly IUnitOfWork _unitOfWork;

    public WarehouseService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<WarehouseDto>> GetAllWarehousesAsync()
    {
        return await _unitOfWork.Warehouses.Query()
            .Select(w => new WarehouseDto
            {
                Id = w.Id,
                Code = w.Code,
                Name = w.Name,
                Location = w.Location,
                Address = w.Address,
                Capacity = w.Capacity,
                IsActive = w.IsActive,
                TotalStockQuantity = w.Inventories.Sum(i => i.Quantity)
            })
            .OrderBy(w => w.Name)
            .ToListAsync();
    }

    public async Task<WarehouseDto> GetWarehouseByIdAsync(int id)
    {
        var w = await _unitOfWork.Warehouses.Query()
            .Include(x => x.Inventories)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (w == null) throw new NotFoundException("Warehouse", id);

        return new WarehouseDto
        {
            Id = w.Id,
            Code = w.Code,
            Name = w.Name,
            Location = w.Location,
            Address = w.Address,
            Capacity = w.Capacity,
            IsActive = w.IsActive,
            TotalStockQuantity = w.Inventories.Sum(i => i.Quantity)
        };
    }

    public async Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseDto dto)
    {
        var exists = await _unitOfWork.Warehouses.Query().AnyAsync(w => w.Code == dto.Code.Trim());
        if (exists) throw new BusinessRuleValidationException($"Warehouse with code '{dto.Code}' already exists.");

        var warehouse = new Warehouse
        {
            Code = dto.Code.Trim().ToUpper(),
            Name = dto.Name.Trim(),
            Location = dto.Location.Trim(),
            Address = dto.Address.Trim(),
            Capacity = dto.Capacity,
            IsActive = true
        };

        await _unitOfWork.Warehouses.AddAsync(warehouse);
        await _unitOfWork.SaveChangesAsync();
        return await GetWarehouseByIdAsync(warehouse.Id);
    }
}

