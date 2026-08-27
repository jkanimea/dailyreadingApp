using System.Security.Claims;
using EncounterDaily.Core.DTOs.Logs;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LogsController : BaseApiController
{
    private static readonly Dictionary<string, Action<ILogger, ClientLogEntry, string>> LogDispatch = new(StringComparer.OrdinalIgnoreCase)
    {
        ["error"] = (logger, entry, message) => logger.LogError(entry.Exception, message, entry.Source, entry.Message),
        ["warn"] = (logger, entry, message) => logger.LogWarning(message, entry.Source, entry.Message),
        ["warning"] = (logger, entry, message) => logger.LogWarning(message, entry.Source, entry.Message),
        ["debug"] = (logger, entry, message) => logger.LogDebug(message, entry.Source, entry.Message)
    };

    private readonly ILogger<LogsController> _logger;
    private readonly IAppLogService _appLogService;

    public LogsController(ILogger<LogsController> logger, IAppLogService appLogService)
    {
        _logger = logger;
        _appLogService = appLogService;
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] List<ClientLogEntry> entries)
    {
        int? userId = null;
        string? userEmail = null;

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var parsedId))
            userId = parsedId;

        userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        foreach (var entry in entries)
        {
            var message = "[Client] {Source}: {Message}";
            if (LogDispatch.TryGetValue(entry.Level, out var log))
                log(_logger, entry, message);
            else
                _logger.LogInformation(message, entry.Source, entry.Message);
        }

        await _appLogService.SaveClientLogsAsync(entries, userId, userEmail, ipAddress);

        return Ok(new { received = entries.Count });
    }

    [Authorize(Policy = "RequireAdminRole")]
    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] AppLogQueryDto query)
    {
        var result = await _appLogService.GetLogsAsync(query);
        return Ok(result);
    }

    [Authorize(Policy = "RequireAdminRole")]
    [HttpDelete("old")]
    public async Task<IActionResult> DeleteOldLogs()
    {
        var deleted = await _appLogService.DeleteOldLogsAsync();
        return Ok(new { deleted, message = $"Deleted {deleted} log entries older than 6 months." });
    }
}
