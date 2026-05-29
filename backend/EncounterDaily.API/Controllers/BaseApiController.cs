using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected int GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim != null && int.TryParse(claim, out var userId))
            return userId;
        return 1;
    }
}
