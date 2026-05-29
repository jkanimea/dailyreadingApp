using System.Security.Claims;
using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class BookmarkController : ControllerBase
    {
        private readonly IBookmarkService _bookmarkService;
        private readonly ILogger<BookmarkController> _logger;

        public BookmarkController(IBookmarkService bookmarkService, ILogger<BookmarkController> logger)
        {
            _bookmarkService = bookmarkService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookmarkDto>>> GetBookmarks()
        {
            var userId = GetUserId();
            var items = await _bookmarkService.GetUserBookmarksAsync(userId);
            return Ok(items);
        }

        [HttpPost("{readingId}")]
        public async Task<ActionResult<BookmarkDto>> AddBookmark(int readingId)
        {
            var userId = GetUserId();
            try
            {
                var bookmark = await _bookmarkService.AddBookmarkAsync(userId, readingId);
                return CreatedAtAction(nameof(GetBookmarks), new { }, bookmark);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Add bookmark failed: {Message} (readingId: {ReadingId})", ex.Message, readingId);
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{readingId}")]
        public async Task<ActionResult> RemoveBookmark(int readingId)
        {
            var userId = GetUserId();
            try
            {
                await _bookmarkService.RemoveBookmarkAsync(userId, readingId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Remove bookmark failed: {Message} (readingId: {ReadingId})", ex.Message, readingId);
                return NotFound(new { message = ex.Message });
            }
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (claim != null && int.TryParse(claim, out var userId))
                return userId;
            return 1;
        }
    }
}
