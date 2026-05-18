using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Repositories
{
    public interface IBookmarkRepository : IRepository<UserBookmark>
    {
        Task<IEnumerable<UserBookmark>> GetUserBookmarksAsync(int userId);
        Task<UserBookmark?> GetUserBookmarkAsync(int userId, int readingId);
        Task<IEnumerable<UserBookmark>> GetUserBookmarksBySeriesAsync(int userId, int seriesId);
    }
}
