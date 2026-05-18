using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class BookmarkService : BaseService<UserBookmark>, IBookmarkService
    {
        public BookmarkService(IUnitOfWork unitOfWork) : base(unitOfWork) { }

        public async Task<IEnumerable<BookmarkDto>> GetUserBookmarksAsync(int userId)
        {
            var items = await _unitOfWork.Bookmarks.GetUserBookmarksAsync(userId);
            return items.Select(MapToDto);
        }

        public async Task<BookmarkDto?> GetUserBookmarkAsync(int userId, int readingId)
        {
            var bookmark = await _unitOfWork.Bookmarks.GetUserBookmarkAsync(userId, readingId);
            return bookmark == null ? null : MapToDto(bookmark);
        }

        public async Task<IEnumerable<BookmarkDto>> GetUserBookmarksBySeriesAsync(int userId, int seriesId)
        {
            var items = await _unitOfWork.Bookmarks.GetUserBookmarksBySeriesAsync(userId, seriesId);
            return items.Select(MapToDto);
        }

        public async Task<BookmarkDto> AddBookmarkAsync(int userId, int readingId)
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId)
                ?? throw new KeyNotFoundException($"Reading {readingId} not found");

            var existing = await _unitOfWork.Bookmarks.GetUserBookmarkAsync(userId, readingId);
            if (existing != null)
                return MapToDto(existing);

            var bookmark = new UserBookmark
            {
                UserId = userId,
                SeriesId = reading.SeriesId,
                DailyReadingId = readingId,
                BookmarkedAt = DateTime.UtcNow
            };

            await _unitOfWork.Bookmarks.AddAsync(bookmark);
            await _unitOfWork.CompleteAsync();
            return MapToDto(bookmark);
        }

        public async Task RemoveBookmarkAsync(int userId, int readingId)
        {
            var bookmark = await _unitOfWork.Bookmarks.GetUserBookmarkAsync(userId, readingId);
            if (bookmark == null)
                throw new KeyNotFoundException($"Bookmark not found for reading {readingId}");

            await _unitOfWork.Bookmarks.DeleteAsync(bookmark.Id);
            await _unitOfWork.CompleteAsync();
        }

        private static BookmarkDto MapToDto(UserBookmark b)
        {
            return new BookmarkDto
            {
                Id = b.Id,
                ReadingId = b.DailyReadingId,
                SeriesId = b.SeriesId,
                BookmarkedAt = b.BookmarkedAt,
                Month = b.DailyReading?.Month ?? 0,
                Day = b.DailyReading?.Day ?? 0,
                BibleReading = b.DailyReading?.BibleReading ?? string.Empty
            };
        }
    }
}
