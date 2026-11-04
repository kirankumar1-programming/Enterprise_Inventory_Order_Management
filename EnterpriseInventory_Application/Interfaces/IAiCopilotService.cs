using System.Threading.Tasks;
using EnterpriseInventory_Application.DTOs;

namespace EnterpriseInventory_Application.Interfaces;

public interface IAiCopilotService
{
    Task<CopilotQueryResponseDto> ProcessQueryAsync(CopilotQueryRequestDto request);
}
