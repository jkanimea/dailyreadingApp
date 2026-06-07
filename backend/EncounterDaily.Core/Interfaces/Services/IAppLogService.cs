using EncounterDaily.Core.DTOs.Logs;
using EncounterDaily.Core.DTOs.Search;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IAppLogService
    {
        Task SaveClientLogsAsync(IEnumerable<ClientLogEntry> entries, int? userId, string? userEmail, string? ipAddress);
        Task SaveServerLogAsync(string level, string source, string message, string? exception = null, int? userId = null, string? userEmail = null, string? ipAddress = null);
        Task<PagedResult<AppLogDto>> GetLogsAsync(AppLogQueryDto query);
        Task<int> DeleteOldLogsAsync();
    }

    public class ClientLogEntry
    {
        public string Level { get; set; } = "info";
        public string Source { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Exception { get; set; }
        public DateTime? Timestamp { get; set; }
    }
}
