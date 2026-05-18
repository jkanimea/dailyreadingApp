using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class BookmarkRepository : GenericRepository<UserBookmark>, IBookmarkRepository
    {
        public BookmarkRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<UserBookmark>> GetUserBookmarksAsync(int userId)
        {
            return await _dbSet
                .Include(b => b.DailyReading)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.BookmarkedAt)
                .ToListAsync();
        }

        public async Task<UserBookmark?> GetUserBookmarkAsync(int userId, int readingId)
        {
            return await _dbSet
                .Include(b => b.DailyReading)
                .FirstOrDefaultAsync(b => b.UserId == userId && b.DailyReadingId == readingId);
        }

        public async Task<IEnumerable<UserBookmark>> GetUserBookmarksBySeriesAsync(int userId, int seriesId)
        {
            return await _dbSet
                .Include(b => b.DailyReading)
                .Where(b => b.UserId == userId && b.SeriesId == seriesId)
                .OrderByDescending(b => b.BookmarkedAt)
                .ToListAsync();
        }
    }
}
