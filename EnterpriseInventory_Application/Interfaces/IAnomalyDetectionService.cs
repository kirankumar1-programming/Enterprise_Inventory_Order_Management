using System.Threading.Tasks;
using EnterpriseInventory_Application.DTOs;

namespace EnterpriseInventory_Application.Interfaces;

public interface IAnomalyDetectionService
{
    Task<AnomalyRadarReportDto> GetAnomalyRadarReportAsync();
    Task<bool> ResolveAnomalyAsync(ResolveAnomalyRequestDto request);
}
