using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class BookmarkService : BaseService<UserBookmark>, IBookmarkService
    {
        public BookmarkService(IUnitOfWork unitOfWork) : base(unitOfWork) { }

        public async Task<IEnumerable<UserBookmark>> GetUserBookmarksAsync(int userId)
        {
            return await _unitOfWork.Bookmarks.GetUserBookmarksAsync(userId);
        }

        public async Task<UserBookmark?> GetUserBookmarkAsync(int userId, int readingId)
        {
            return await _unitOfWork.Bookmarks.GetUserBookmarkAsync(userId, readingId);
        }

        public async Task<IEnumerable<UserBookmark>> GetUserBookmarksBySeriesAsync(int userId, int seriesId)
        {
            return await _unitOfWork.Bookmarks.GetUserBookmarksBySeriesAsync(userId, seriesId);
        }
    }
}
