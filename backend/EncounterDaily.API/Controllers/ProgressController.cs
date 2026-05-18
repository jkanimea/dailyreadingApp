using System.Security.Claims;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class ProgressController : ControllerBase
    {
        private readonly IProgressService _progressService;

        public ProgressController(IProgressService progressService)
        {
            _progressService = progressService;
        }

        [HttpGet("series/{seriesId}")]
        public async Task<ActionResult<IEnumerable<UserProgress>>> GetSeriesProgress(int seriesId)
        {
            var userId = GetUserId();
            var items = await _progressService.GetUserProgressForSeriesAsync(userId, seriesId);
            return Ok(items);
        }

        [HttpGet("series/{seriesId}/streak")]
        public async Task<ActionResult<int>> GetStreak(int seriesId)
        {
            var userId = GetUserId();
            var streak = await _progressService.GetStreakAsync(userId, seriesId);
            return Ok(streak);
        }

        [HttpPost("{readingId}/complete")]
        public async Task<ActionResult<UserProgress>> MarkComplete(int readingId)
        {
            var userId = GetUserId();
            try
            {
                var progress = await _progressService.MarkCompleteAsync(userId, readingId);
                return Ok(progress);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{readingId}/complete")]
        public async Task<ActionResult> UnmarkComplete(int readingId)
        {
            var userId = GetUserId();
            await _progressService.UnmarkCompleteAsync(userId, readingId);
            return NoContent();
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
