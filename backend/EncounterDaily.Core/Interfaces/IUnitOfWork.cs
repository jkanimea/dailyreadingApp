using EncounterDaily.Core.Interfaces.Repositories;

namespace EncounterDaily.Core.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IReadingRepository Readings { get; }
        IProgressRepository Progress { get; }
        IBookmarkRepository Bookmarks { get; }
        ISeriesRepository Series { get; }
        Task<int> CompleteAsync();
    }
}
