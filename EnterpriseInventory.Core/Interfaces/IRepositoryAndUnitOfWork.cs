using EnterpriseInventory.Core.Entities;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq.Expressions;

using System.Text;

namespace EnterpriseInventory.Core.Interfaces
{
    public interface IRepository<T> where T : class
    {
        Task<T?> GetByIdAsync(int id);
        Task<IEnumerable<T>> GetAllAsync();
        Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
        IQueryable<T> Query();
        Task AddAsync(T entity);
        void Update(T entity);
        void Delete(T entity);
    }

    public interface IUnitOfWork : IDisposable
    {
        IRepository<User> Users { get; }
        IRepository<Role> Roles { get; }
        IRepository<Category> Categories { get; }
        IRepository<Supplier> Suppliers { get; }
        IRepository<Product> Products { get; }
        IRepository<Warehouse> Warehouses { get; }
        IRepository<Inventory> Inventories { get; }
        IRepository<StockMovement> StockMovements { get; }
        IRepository<Order> Orders { get; }
        IRepository<OrderItem> OrderItems { get; }
        IRepository<AuditLog> AuditLogs { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
        Task BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollbackTransactionAsync();
        Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> action);
        Task ExecuteInTransactionAsync(Func<Task> action);
    }
}
