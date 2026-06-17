using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers;

[AllowAnonymous]
public class HealthController : BaseApiController
{
    [HttpGet]
    public IActionResult GetHealth()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}
