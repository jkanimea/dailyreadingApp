using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IBookmarkService : IService<UserBookmark>
    {
        Task<IEnumerable<BookmarkDto>> GetUserBookmarksAsync(int userId);
        Task<BookmarkDto?> GetUserBookmarkAsync(int userId, int readingId);
        Task<IEnumerable<BookmarkDto>> GetUserBookmarksBySeriesAsync(int userId, int seriesId);
        Task<BookmarkDto> AddBookmarkAsync(int userId, int readingId);
        Task RemoveBookmarkAsync(int userId, int readingId);
    }
}
