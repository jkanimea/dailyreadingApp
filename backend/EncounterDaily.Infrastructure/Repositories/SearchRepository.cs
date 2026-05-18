using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class SearchRepository : ISearchRepository
    {
        private readonly AppDbContext _context;

        public SearchRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<DailyReading>> SearchAsync(int seriesId, string searchTerm, int page, int pageSize)
        {
            var query = _context.DailyReadings
                .Include(r => r.Series)
                .Where(r => r.SeriesId == seriesId &&
                    (r.BibleReading.Contains(searchTerm) ||
                     r.FullTextPrimary != null && r.FullTextPrimary.Contains(searchTerm) ||
                     r.FullTextSecondary != null && r.FullTextSecondary.Contains(searchTerm) ||
                     r.SummaryPoints != null && r.SummaryPoints.Contains(searchTerm)));

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(r => r.SortOrder)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<DailyReading>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PagedResult<DailyReading>> SearchAllAsync(string searchTerm, int page, int pageSize)
        {
            var query = _context.DailyReadings
                .Include(r => r.Series)
                .Where(r =>
                    r.BibleReading.Contains(searchTerm) ||
                    r.FullTextPrimary != null && r.FullTextPrimary.Contains(searchTerm) ||
                    r.FullTextSecondary != null && r.FullTextSecondary.Contains(searchTerm) ||
                    r.SummaryPoints != null && r.SummaryPoints.Contains(searchTerm));

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(r => r.SeriesId)
                .ThenBy(r => r.SortOrder)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<DailyReading>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }
    }
}
