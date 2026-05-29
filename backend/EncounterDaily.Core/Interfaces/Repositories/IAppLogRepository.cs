using EncounterDaily.Core.DTOs.Logs;
using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Repositories
{
    public interface IAppLogRepository : IRepository<AppLog>
    {
        Task<PagedResult<AppLog>> GetPagedAsync(AppLogQueryDto query);
        Task<int> DeleteOlderThanAsync(DateTime cutoff);
    }
}
