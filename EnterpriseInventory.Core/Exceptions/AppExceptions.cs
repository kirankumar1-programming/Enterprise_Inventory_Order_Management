using System;
using System.Collections.Generic;
using System.Text;

namespace EnterpriseInventory.Core.Exceptions
{
    public class AppException : Exception
    {
        public int StatusCode { get; }

        public AppException(string message, int statusCode = 400) : base(message)
        {
            StatusCode = statusCode;
        }
    }

    public class NotFoundException : AppException
    {
        public NotFoundException(string entityName, object key)
            : base($"{entityName} with key ({key}) was not found.", 404)
        {
        }

        public NotFoundException(string message) : base(message, 404)
        {
        }
    }

    public class InsufficientStockException : AppException
    {
        public int ProductId { get; }
        public string ProductName { get; }
        public int AvailableQuantity { get; }
        public int RequestedQuantity { get; }

        public InsufficientStockException(int productId, string productName, int available, int requested)
            : base($"Insufficient stock for product '{productName}' (ID: {productId}). Available: {available}, Requested: {requested}.", 400)
        {
            ProductId = productId;
            ProductName = productName;
            AvailableQuantity = available;
            RequestedQuantity = requested;
        }
    }

    public class ConcurrencyConflictException : AppException
    {
        public ConcurrencyConflictException(string message = "The record was updated by another user or concurrent operation. Please refresh and try again.")
            : base(message, 409)
        {
        }
    }

    public class BusinessRuleValidationException : AppException
    {
        public IDictionary<string, string[]> Errors { get; }

        public BusinessRuleValidationException(string message) : base(message, 400)
        {
            Errors = new Dictionary<string, string[]> { { "General", new[] { message } } };
        }

        public BusinessRuleValidationException(IDictionary<string, string[]> errors)
            : base("One or more validation failures have occurred.", 400)
        {
            Errors = errors;
        }
    }
}