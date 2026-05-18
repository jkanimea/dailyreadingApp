using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Repositories;

namespace EncounterDaily.Core.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IReadingRepository Readings { get; }
        IProgressRepository Progress { get; }
        IBookmarkRepository Bookmarks { get; }
        ISeriesRepository Series { get; }
        IUserRepository Users { get; }
        IRefreshTokenRepository RefreshTokens { get; }
        IRepository<T> Repository<T>() where T : BaseEntity;
        Task<int> CompleteAsync();
    }
}
