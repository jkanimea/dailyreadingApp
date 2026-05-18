using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class UserRepository : GenericRepository<User>, IUserRepository
    {
        public UserRepository(AppDbContext context) : base(context) { }

        public async Task<User?> GetByProviderAsync(string provider, string providerId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(u => u.Provider == provider && u.ProviderId == providerId);
        }
    }
}
