using EncounterDaily.Core.DTOs.Logs;
using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class AppLogService : IAppLogService
    {
        private readonly IUnitOfWork _unitOfWork;

        public AppLogService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task SaveClientLogsAsync(
            IEnumerable<ClientLogEntry> entries,
            int? userId,
            string? userEmail,
            string? ipAddress)
        {
            foreach (var entry in entries)
            {
                var log = new AppLog
                {
                    Level = NormalizeLevel(entry.Level),
                    Message = entry.Message ?? string.Empty,
                    Source = entry.Source,
                    Exception = entry.Exception,
                    UserId = userId,
                    UserEmail = userEmail,
                    IpAddress = ipAddress,
                    Origin = "client"
                };
                await _unitOfWork.AppLogs.AddAsync(log);
            }
            await _unitOfWork.CompleteAsync();
        }

        public async Task<PagedResult<AppLogDto>> GetLogsAsync(AppLogQueryDto query)
        {
            var paged = await _unitOfWork.AppLogs.GetPagedAsync(query);
            return new PagedResult<AppLogDto>
            {
                Items = paged.Items.Select(MapToDto),
                TotalCount = paged.TotalCount,
                Page = paged.Page,
                PageSize = paged.PageSize
            };
        }

        public async Task<int> DeleteOldLogsAsync()
        {
            var cutoff = DateTime.UtcNow.AddMonths(-6);
            return await _unitOfWork.AppLogs.DeleteOlderThanAsync(cutoff);
        }

        private static AppLogDto MapToDto(AppLog log) => new()
        {
            Id = log.Id,
            Level = log.Level,
            Message = log.Message,
            Source = log.Source,
            Exception = log.Exception,
            UserId = log.UserId,
            UserEmail = log.UserEmail,
            IpAddress = log.IpAddress,
            Origin = log.Origin,
            CreatedAt = log.CreatedAt
        };

        private static string NormalizeLevel(string? level) =>
            level?.ToLowerInvariant() switch
            {
                "error" => "error",
                "warn" or "warning" => "warn",
                "debug" => "debug",
                _ => "info"
            };
    }
}
