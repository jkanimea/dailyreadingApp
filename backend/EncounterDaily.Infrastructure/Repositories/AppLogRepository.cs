using EncounterDaily.Core.DTOs.Logs;
using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class AppLogRepository : GenericRepository<AppLog>, IAppLogRepository
    {
        public AppLogRepository(AppDbContext context) : base(context) { }

        public async Task<PagedResult<AppLog>> GetPagedAsync(AppLogQueryDto query)
        {
            var q = _dbSet.AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Level))
                q = q.Where(l => l.Level.ToLower() == query.Level.ToLower());

            if (!string.IsNullOrWhiteSpace(query.Origin))
                q = q.Where(l => l.Origin.ToLower() == query.Origin.ToLower());

            if (query.From.HasValue)
                q = q.Where(l => l.CreatedAt >= query.From.Value);

            if (query.To.HasValue)
                q = q.Where(l => l.CreatedAt <= query.To.Value);

            var totalCount = await q.CountAsync();
            var pageSize = Math.Max(1, Math.Min(query.PageSize, 200));
            var page = Math.Max(1, query.Page);
            var items = await q
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<AppLog>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<int> DeleteOlderThanAsync(DateTime cutoff)
        {
            var old = await _dbSet.Where(l => l.CreatedAt < cutoff).ToListAsync();
            if (old.Count == 0) return 0;
            _dbSet.RemoveRange(old);
            await _context.SaveChangesAsync();
            return old.Count;
        }
    }
}
