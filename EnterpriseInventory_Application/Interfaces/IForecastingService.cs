using System.Collections.Generic;
using System.Threading.Tasks;
using EnterpriseInventory_Application.DTOs;

namespace EnterpriseInventory_Application.Interfaces;

public interface IForecastingService
{
    Task<ProductForecastSummaryDto> GetForecastSummaryAsync(int? warehouseId = null);
    Task<IEnumerable<RestockRecommendationDto>> GetRestockRecommendationsAsync(int? warehouseId = null);
    Task<IEnumerable<OverstockAlertDto>> GetOverstockAlertsAsync(int? warehouseId = null);
    Task<RestockRecommendationDto?> GetProductRunwayAsync(int productId, int? warehouseId = null);
    Task<RestockPoDraftDto> GenerateRestockPoDraftAsync(GeneratePoDraftRequestDto request);
}
