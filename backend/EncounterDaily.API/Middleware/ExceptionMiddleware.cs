using System.Net;
using System.Security.Claims;
using System.Text.Json;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IServiceScopeFactory scopeFactory)
    {
        _next = next;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception processing request {Method} {Path}",
                context.Request.Method, context.Request.Path);

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var appLogService = scope.ServiceProvider.GetRequiredService<IAppLogService>();
                var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                int? userId = int.TryParse(userIdClaim, out var uid) ? uid : null;
                var userEmail = context.User.FindFirst(ClaimTypes.Email)?.Value;
                var ipAddress = context.Connection.RemoteIpAddress?.ToString();

                await appLogService.SaveServerLogAsync(
                    "error",
                    "ExceptionMiddleware",
                    $"{context.Request.Method} {context.Request.Path} failed with {ex.GetType().Name}",
                    ex.ToString(),
                    userId,
                    userEmail,
                    ipAddress
                );
            }
            catch (Exception logEx)
            {
                _logger.LogWarning(logEx, "Failed to save exception to AppLogs");
            }

            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";

            var response = new
            {
                error = "An internal server error occurred.",
                requestId = context.TraceIdentifier
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
