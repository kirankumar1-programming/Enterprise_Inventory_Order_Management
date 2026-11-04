using System.Collections.Generic;
using System.Threading.Tasks;
using EnterpriseInventory_Application.DTOs;

namespace EnterpriseInventory_Application.Interfaces;

public interface ISupplierIntelligenceService
{
    Task<SupplierIntelligenceReportDto> GetSupplierIntelligenceReportAsync();
    Task<List<AutonomousReorderPolicyDto>> GetAutonomousPoliciesAsync();
    Task<bool> TogglePolicyAsync(TogglePolicyRequestDto request);
}
