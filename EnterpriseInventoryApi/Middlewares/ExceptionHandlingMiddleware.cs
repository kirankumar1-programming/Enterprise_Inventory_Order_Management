using System.Net;
using System.Text.Json;
using EnterpriseInventory.Core.Exceptions;

namespace EnterpriseInventoryApi.Middlewares;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = HttpStatusCode.InternalServerError;
        string title = "Internal Server Error";
        string message = exception.Message;
        object? errors = null;

        switch (exception)
        {
            case InsufficientStockException isEx:
                statusCode = HttpStatusCode.BadRequest;
                title = "Insufficient Stock";
                errors = new
                {
                    isEx.ProductId,
                    isEx.ProductName,
                    isEx.AvailableQuantity,
                    isEx.RequestedQuantity
                };
                break;

            case ConcurrencyConflictException:
                statusCode = HttpStatusCode.Conflict;
                title = "Concurrency Conflict";
                break;

            case BusinessRuleValidationException brvEx:
                statusCode = HttpStatusCode.BadRequest;
                title = "Validation Failed";
                errors = brvEx.Errors;
                break;

            case NotFoundException:
                statusCode = HttpStatusCode.NotFound;
                title = "Resource Not Found";
                break;

            case AppException appEx:
                statusCode = (HttpStatusCode)appEx.StatusCode;
                title = "Application Error";
                break;

            case UnauthorizedAccessException:
                statusCode = HttpStatusCode.Unauthorized;
                title = "Unauthorized";
                break;

            default:
                _logger.LogError(exception, "An unhandled exception occurred during request execution.");
                message = "An unexpected server error occurred. Please contact system administrator.";
                break;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = new
        {
            status = (int)statusCode,
            title,
            detail = message,
            errors,
            timestamp = DateTime.UtcNow
        };

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }
}

