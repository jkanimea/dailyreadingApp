using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [Route("api/[controller]")]
    public class BookmarkController : BaseController<UserBookmark>
    {
        private readonly IBookmarkService _bookmarkService;

        public BookmarkController(IBookmarkService bookmarkService) : base(bookmarkService)
        {
            _bookmarkService = bookmarkService;
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<UserBookmark>>> GetUserBookmarks(int userId)
        {
            var items = await _bookmarkService.GetUserBookmarksAsync(userId);
            return Ok(items);
        }

        [HttpGet("user-bookmark/{userId}/{readingId}")]
        public async Task<ActionResult<UserBookmark>> GetUserBookmark(int userId, int readingId)
        {
            var item = await _bookmarkService.GetUserBookmarkAsync(userId, readingId);
            if (item == null)
                return NotFound();
            return Ok(item);
        }

        [HttpGet("user-series/{userId}/{seriesId}")]
        public async Task<ActionResult<IEnumerable<UserBookmark>>> GetUserBookmarksBySeries(int userId, int seriesId)
        {
            var items = await _bookmarkService.GetUserBookmarksBySeriesAsync(userId, seriesId);
            return Ok(items);
        }
    }
}
