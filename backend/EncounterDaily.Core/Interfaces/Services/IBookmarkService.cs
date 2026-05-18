using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IBookmarkService : IService<UserBookmark>
    {
        Task<IEnumerable<UserBookmark>> GetUserBookmarksAsync(int userId);
        Task<UserBookmark?> GetUserBookmarkAsync(int userId, int readingId);
        Task<IEnumerable<UserBookmark>> GetUserBookmarksBySeriesAsync(int userId, int seriesId);
        Task<UserBookmark> AddBookmarkAsync(int userId, int readingId);
        Task RemoveBookmarkAsync(int userId, int readingId);
    }
}
