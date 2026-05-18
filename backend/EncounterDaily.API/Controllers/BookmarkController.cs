using System.Security.Claims;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class BookmarkController : ControllerBase
    {
        private readonly IBookmarkService _bookmarkService;

        public BookmarkController(IBookmarkService bookmarkService)
        {
            _bookmarkService = bookmarkService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserBookmark>>> GetBookmarks()
        {
            var userId = GetUserId();
            var items = await _bookmarkService.GetUserBookmarksAsync(userId);
            return Ok(items);
        }

        [HttpPost("{readingId}")]
        public async Task<ActionResult<UserBookmark>> AddBookmark(int readingId)
        {
            var userId = GetUserId();
            try
            {
                var bookmark = await _bookmarkService.AddBookmarkAsync(userId, readingId);
                return CreatedAtAction(nameof(GetBookmarks), new { }, bookmark);
            }
            catch (KeyNotFoundException ex)
            {
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
                return NotFound(new { message = ex.Message });
            }
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (claim == null || !int.TryParse(claim, out var userId))
                throw new UnauthorizedAccessException("User not authenticated");
            return userId;
        }
    }
}
