using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class ReadingRepository : GenericRepository<DailyReading>, IReadingRepository
    {
        public ReadingRepository(AppDbContext context) : base(context) { }

        public async Task<DailyReading?> GetBySeriesDateAsync(int seriesId, int month, int day)
        {
            return await _dbSet
                .Include(r => r.Series)
                .FirstOrDefaultAsync(r => r.SeriesId == seriesId && r.Month == month && r.Day == day);
        }

        public async Task<IEnumerable<DailyReading>> GetBySeriesMonthAsync(int seriesId, int month)
        {
            return await _dbSet
                .Where(r => r.SeriesId == seriesId && r.Month == month)
                .OrderBy(r => r.Day)
                .ToListAsync();
        }

        public async Task<IEnumerable<DailyReading>> GetBySeriesYearAsync(int seriesId)
        {
            return await _dbSet
                .Where(r => r.SeriesId == seriesId)
                .OrderBy(r => r.Month)
                .ThenBy(r => r.Day)
                .ToListAsync();
        }

        public async Task<IEnumerable<DailyReading>> SearchByTextAsync(int seriesId, string searchTerm)
        {
            return await _dbSet
                .Where(r => r.SeriesId == seriesId &&
                    (r.BibleReading.Contains(searchTerm) ||
                     r.FullTextPrimary != null && r.FullTextPrimary.Contains(searchTerm)))
                .ToListAsync();
        }
    }
}
