using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Repositories
{
    public class RoleRepository : GenericRepository<Role>, IRoleRepository
    {
        private readonly AppDbContext _ctx;

        public RoleRepository(AppDbContext context) : base(context)
        {
            _ctx = context;
        }

        public async Task<Role?> GetByNameAsync(string name)
        {
            return await _dbSet.FirstOrDefaultAsync(r => r.Name == name);
        }

        public async Task<string> GetUserRoleNameAsync(int userId)
        {
            var userRole = await _ctx.UserRoles
                .Include(ur => ur.Role)
                .FirstOrDefaultAsync(ur => ur.UserId == userId);

            return userRole?.Role?.Name ?? "User";
        }

        public async Task AssignRoleToUserAsync(int userId, int roleId)
        {
            var exists = await _ctx.UserRoles.AnyAsync(ur => ur.UserId == userId);
            if (exists) return;

            var userRole = new UserRole
            {
                UserId = userId,
                RoleId = roleId
            };
            await _ctx.UserRoles.AddAsync(userRole);
        }

        public async Task<bool> UserHasRoleAsync(int userId, string roleName)
        {
            return await _ctx.UserRoles
                .Include(ur => ur.Role)
                .AnyAsync(ur => ur.UserId == userId && ur.Role.Name == roleName);
        }
    }
}
