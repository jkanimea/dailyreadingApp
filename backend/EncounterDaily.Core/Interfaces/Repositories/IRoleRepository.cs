using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Repositories
{
    public interface IRoleRepository : IRepository<Role>
    {
        Task<Role?> GetByNameAsync(string name);
        Task<string> GetUserRoleNameAsync(int userId);
        Task AssignRoleToUserAsync(int userId, int roleId);
        Task<bool> UserHasRoleAsync(int userId, string roleName);
    }
}
