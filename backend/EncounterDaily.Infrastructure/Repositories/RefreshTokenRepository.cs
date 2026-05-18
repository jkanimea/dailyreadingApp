using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class RefreshTokenRepository : GenericRepository<RefreshToken>, IRefreshTokenRepository
    {
        public RefreshTokenRepository(AppDbContext context) : base(context) { }

        public async Task<RefreshToken?> GetByTokenAsync(string token)
        {
            return await _dbSet.FirstOrDefaultAsync(t => t.Token == token);
        }
    }
}
