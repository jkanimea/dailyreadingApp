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

        public async Task<UserBookmark> AddBookmarkAsync(int userId, int readingId)
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId)
                ?? throw new KeyNotFoundException($"Reading {readingId} not found");

            var existing = await _unitOfWork.Bookmarks.GetUserBookmarkAsync(userId, readingId);
            if (existing != null)
                return existing;

            var bookmark = new UserBookmark
            {
                UserId = userId,
                SeriesId = reading.SeriesId,
                DailyReadingId = readingId,
                BookmarkedAt = DateTime.UtcNow
            };

            await _unitOfWork.Bookmarks.AddAsync(bookmark);
            await _unitOfWork.CompleteAsync();
            return bookmark;
        }

        public async Task RemoveBookmarkAsync(int userId, int readingId)
        {
            var bookmark = await _unitOfWork.Bookmarks.GetUserBookmarkAsync(userId, readingId);
            if (bookmark == null)
                throw new KeyNotFoundException($"Bookmark not found for reading {readingId}");

            await _unitOfWork.Bookmarks.DeleteAsync(bookmark.Id);
            await _unitOfWork.CompleteAsync();
        }
    }
}
