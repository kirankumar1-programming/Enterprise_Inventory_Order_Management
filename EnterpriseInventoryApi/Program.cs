using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using EnterpriseInventory.Core.Interfaces;
using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory_Application.Services;
using EnterpriseInventory_Infrastructure.Data;
using EnterpriseInventory_Infrastructure.Repositories;
using EnterpriseInventoryApi.Hubs;
using EnterpriseInventoryApi.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Context (Supports Local SQLite file or SQL Server)
var dbProvider = builder.Configuration["DatabaseProvider"] ?? "Sqlite";

if (dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
{
    var sqliteConnection = builder.Configuration.GetConnectionString("SqliteConnection") 
        ?? "Data Source=EnterpriseInventory.db";
    builder.Services.AddDbContext<EnterpriseInventoryDbContext>(options =>
        options.UseSqlite(sqliteConnection));
}
else
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Server=(localdb)\\MSSQLLocalDB;Database=EnterpriseInventoryDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";
    builder.Services.AddDbContext<EnterpriseInventoryDbContext>(options =>
        options.UseSqlServer(connectionString));
}

// 2. Real-Time SignalR Services
builder.Services.AddSignalR();
builder.Services.AddSingleton<IRealTimeNotificationService, SignalRNotificationService>();

// 3. Core Infrastructure & Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<IWarehouseService, WarehouseService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IAuditService, AuditService>();

// 4. AI & Predictive Intelligence Services
builder.Services.AddScoped<IDocumentIntelligenceService, DocumentIntelligenceService>();
builder.Services.AddScoped<IAiCopilotService, AiCopilotService>();
builder.Services.AddScoped<IForecastingService, ForecastingService>();
builder.Services.AddScoped<ICatalogIntelligenceService, CatalogIntelligenceService>();
builder.Services.AddScoped<IAnomalyDetectionService, AnomalyDetectionService>();
builder.Services.AddScoped<ISupplierIntelligenceService, SupplierIntelligenceService>();

// 5. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "EnterpriseInventorySuperSecretKeyForDevelopment2026!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "EnterpriseInventoryApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "EnterpriseInventoryClient";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };

        // Support authentication in WebSockets / SignalR query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// 6. CORS for Angular client
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularClient", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddOpenApi();

var app = builder.Build();

// Automatically initialize schema & seed sample demo data for seamless local demo execution
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<EnterpriseInventoryDbContext>();
        DbInitializer.Initialize(dbContext);
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while initializing and seeding the local database.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowAngularClient");
app.UseMiddleware<EnterpriseInventoryApi.Middlewares.ExceptionHandlingMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<InventoryHub>("/hubs/inventory");

app.Run();
