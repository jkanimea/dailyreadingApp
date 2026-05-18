using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Repositories
{
    public interface ISearchRepository
    {
        Task<PagedResult<DailyReading>> SearchAsync(int seriesId, string searchTerm, int page, int pageSize);
        Task<PagedResult<DailyReading>> SearchAllAsync(string searchTerm, int page, int pageSize);
    }
}
