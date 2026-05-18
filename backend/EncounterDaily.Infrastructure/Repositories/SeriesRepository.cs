using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class SeriesRepository : GenericRepository<Series>, ISeriesRepository
    {
        public SeriesRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<Series>> GetAllSeriesWithBooksAsync()
        {
            return await _dbSet
                .Include(s => s.PrimaryBook)
                .Include(s => s.SecondaryBook)
                .OrderBy(s => s.SortOrder)
                .ToListAsync();
        }

        public async Task<Series?> GetSeriesWithBooksAsync(int seriesId)
        {
            return await _dbSet
                .Include(s => s.PrimaryBook)
                .Include(s => s.SecondaryBook)
                .FirstOrDefaultAsync(s => s.Id == seriesId);
        }
    }
}
