using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LogsController : ControllerBase
{
    private readonly ILogger<LogsController> _logger;

    public LogsController(ILogger<LogsController> logger)
    {
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost]
    public IActionResult Submit([FromBody] List<ClientLogEntry> entries)
    {
        foreach (var entry in entries)
        {
            var message = "[Client] {Source}: {Message}";
            switch (entry.Level?.ToLowerInvariant())
            {
                case "error":
                    _logger.LogError(entry.Exception, message, entry.Source, entry.Message);
                    break;
                case "warn":
                case "warning":
                    _logger.LogWarning(message, entry.Source, entry.Message);
                    break;
                case "debug":
                    _logger.LogDebug(message, entry.Source, entry.Message);
                    break;
                default:
                    _logger.LogInformation(message, entry.Source, entry.Message);
                    break;
            }
        }

        return Ok(new { received = entries.Count });
    }
}

public class ClientLogEntry
{
    public string Level { get; set; } = "info";
    public string Source { get; set; } = "";
    public string Message { get; set; } = "";
    public string? Exception { get; set; }
    public DateTime? Timestamp { get; set; }
}
