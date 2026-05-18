using EncounterDaily.Core.DTOs.Search;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface ISearchService
    {
        Task<PagedResult<SearchResultDto>> SearchAsync(int seriesId, string searchTerm, int page, int pageSize);
        Task<PagedResult<SearchResultDto>> SearchAllAsync(string searchTerm, int page, int pageSize);
    }
}
