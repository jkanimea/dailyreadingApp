using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class SearchService : ISearchService
    {
        private readonly IUnitOfWork _unitOfWork;

        public SearchService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<PagedResult<SearchResultDto>> SearchAsync(int userId, int seriesId, string searchTerm, int page, int pageSize)
        {
            var result = await _unitOfWork.Search.SearchAsync(seriesId, searchTerm, page, pageSize);

            await LogSearchHistory(userId, seriesId, searchTerm);

            return MapToDto(result);
        }

        public async Task<PagedResult<SearchResultDto>> SearchAllAsync(int userId, string searchTerm, int page, int pageSize)
        {
            var result = await _unitOfWork.Search.SearchAllAsync(searchTerm, page, pageSize);
            return MapToDto(result);
        }

        private async Task LogSearchHistory(int userId, int seriesId, string searchTerm)
        {
            var history = new SearchHistory
            {
                UserId = userId,
                SeriesId = seriesId,
                SearchTerm = searchTerm
            };
            await _unitOfWork.Repository<SearchHistory>().AddAsync(history);
            await _unitOfWork.CompleteAsync();
        }

        private static PagedResult<SearchResultDto> MapToDto(PagedResult<Core.Entities.DailyReading> paged)
        {
            return new PagedResult<SearchResultDto>
            {
                Items = paged.Items.Select(r => new SearchResultDto
                {
                    Id = r.Id,
                    SeriesId = r.SeriesId,
                    SeriesName = r.Series?.Name ?? "",
                    Month = r.Month,
                    Day = r.Day,
                    BibleReading = r.BibleReading,
                    FullTextPrimary = r.FullTextPrimary,
                    FullTextSecondary = r.FullTextSecondary,
                    SummaryPoints = r.SummaryPoints,
                    SortOrder = r.SortOrder
                }),
                TotalCount = paged.TotalCount,
                Page = paged.Page,
                PageSize = paged.PageSize
            };
        }
    }
}
