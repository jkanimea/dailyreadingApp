using EncounterDaily.Core.DTOs.Search;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface ISearchService
    {
        Task<PagedResult<SearchResultDto>> SearchAsync(int userId, int seriesId, string searchTerm, int page, int pageSize);
        Task<PagedResult<SearchResultDto>> SearchAllAsync(int userId, string searchTerm, int page, int pageSize);
    }
}
