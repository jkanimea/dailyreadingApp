using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public abstract class BaseService<T> : IService<T> where T : BaseEntity
    {
        protected readonly IUnitOfWork _unitOfWork;
        protected readonly IRepository<T> _repository;

        protected BaseService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
            _repository = unitOfWork.Repository<T>();
        }

        public virtual async Task<T?> GetByIdAsync(int id)
        {
            return await _repository.GetByIdAsync(id);
        }

        public virtual async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _repository.GetAllAsync();
        }

        public virtual async Task<T> AddAsync(T entity)
        {
            var result = await _repository.AddAsync(entity);
            await _unitOfWork.CompleteAsync();
            return result;
        }

        public virtual async Task UpdateAsync(T entity)
        {
            await _repository.UpdateAsync(entity);
            await _unitOfWork.CompleteAsync();
        }

        public virtual async Task DeleteAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity != null)
            {
                await _repository.DeleteAsync(id);
                await _unitOfWork.CompleteAsync();
            }
        }
    }
}
