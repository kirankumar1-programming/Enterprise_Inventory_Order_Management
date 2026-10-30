using Microsoft.AspNetCore.Mvc;

namespace EnterpriseInventoryApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public abstract class BaseApiController : ControllerBase
    {
    }
}