using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class ProgressRepository : GenericRepository<UserProgress>, IProgressRepository
    {
        public ProgressRepository(AppDbContext context) : base(context) { }

        public async Task<UserProgress?> GetUserReadingProgressAsync(int userId, int readingId)
        {
            return await _dbSet
                .Include(p => p.DailyReading)
                .FirstOrDefaultAsync(p => p.UserId == userId && p.DailyReadingId == readingId);
        }

        public async Task<int> GetStreakAsync(int userId, int seriesId)
        {
            var completedReadings = await _dbSet
                .Where(p => p.UserId == userId && p.SeriesId == seriesId && p.IsCompleted)
                .OrderByDescending(p => p.CompletedAt)
                .Select(p => p.CompletedAt!.Value.Date)
                .Distinct()
                .ToListAsync();

            if (!completedReadings.Any()) return 0;

            int streak = 1;
            var today = DateTime.UtcNow.Date;
            var expectedDate = completedReadings.First();

            if (expectedDate < today.AddDays(-1)) return 0;

            for (int i = 1; i < completedReadings.Count; i++)
            {
                if (completedReadings[i] == expectedDate.AddDays(-i))
                {
                    streak++;
                }
                else
                {
                    break;
                }
            }

            return streak;
        }

        public async Task<IEnumerable<UserProgress>> GetUserProgressForSeriesAsync(int userId, int seriesId)
        {
            return await _dbSet
                .Include(p => p.DailyReading)
                .Where(p => p.UserId == userId && p.SeriesId == seriesId)
                .ToListAsync();
        }

        public async Task<double> GetCompletionPercentageAsync(int userId, int seriesId)
        {
            var totalReadings = await _context.DailyReadings
                .CountAsync(r => r.SeriesId == seriesId);

            if (totalReadings == 0) return 0;

            var completedCount = await _dbSet
                .CountAsync(p => p.UserId == userId && p.SeriesId == seriesId && p.IsCompleted);

            return (double)completedCount / totalReadings * 100;
        }

        public async Task<int> GetCompletedCountAsync(int userId, int seriesId)
        {
            return await _dbSet
                .CountAsync(p => p.UserId == userId && p.SeriesId == seriesId && p.IsCompleted);
        }

        public async Task<IEnumerable<UserProgress>> GetJournalEntriesAsync(int userId, int seriesId)
        {
            return await _dbSet
                .Include(p => p.DailyReading)
                    .ThenInclude(d => d.Series)
                .Where(p => p.UserId == userId && p.SeriesId == seriesId && (p.IsCompleted || p.Notes != null))
                .OrderBy(p => p.DailyReading.Month)
                    .ThenBy(p => p.DailyReading.Day)
                .ToListAsync();
        }
    }
}
