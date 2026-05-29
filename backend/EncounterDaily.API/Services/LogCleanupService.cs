using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.API.Services;

public class LogCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LogCleanupService> _logger;
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(24);

    public LogCleanupService(IServiceScopeFactory scopeFactory, ILogger<LogCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("LogCleanupService started. Will run every {Hours}h.", CleanupInterval.TotalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCleanupAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during log cleanup.");
            }

            await Task.Delay(CleanupInterval, stoppingToken);
        }
    }

    private async Task RunCleanupAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var logService = scope.ServiceProvider.GetRequiredService<IAppLogService>();
        var deleted = await logService.DeleteOldLogsAsync();

        if (deleted > 0)
            _logger.LogInformation("LogCleanupService: deleted {Count} log entries older than 6 months.", deleted);
    }
}
