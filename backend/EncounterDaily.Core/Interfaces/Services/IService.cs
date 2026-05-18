using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IService<T> where T : BaseEntity
    {
        Task<T?> GetByIdAsync(int id);
        Task<IEnumerable<T>> GetAllAsync();
        Task<T> AddAsync(T entity);
        Task UpdateAsync(T entity);
        Task DeleteAsync(int id);
    }
}
