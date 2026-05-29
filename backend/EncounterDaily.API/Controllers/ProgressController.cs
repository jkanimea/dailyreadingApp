using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    public class ProgressController : BaseApiController
    {
        private readonly IProgressService _progressService;
        private readonly ILogger<ProgressController> _logger;

        public ProgressController(IProgressService progressService, ILogger<ProgressController> logger)
        {
            _progressService = progressService;
            _logger = logger;
        }

        [HttpGet("series/{seriesId}")]
        public async Task<ActionResult<IEnumerable<ProgressDto>>> GetSeriesProgress(int seriesId)
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

        [HttpGet("series/{seriesId}/completed-count")]
        public async Task<ActionResult<int>> GetCompletedCount(int seriesId)
        {
            var userId = GetUserId();
            var count = await _progressService.GetCompletedCountAsync(userId, seriesId);
            return Ok(count);
        }

        [HttpGet("series/{seriesId}/percentage")]
        public async Task<ActionResult<double>> GetCompletionPercentage(int seriesId)
        {
            var userId = GetUserId();
            var percentage = await _progressService.GetCompletionPercentageAsync(userId, seriesId);
            return Ok(percentage);
        }

        [HttpPost("{readingId}/complete")]
        public async Task<ActionResult<ProgressDto>> MarkComplete(int readingId)
        {
            var userId = GetUserId();
            try
            {
                var progress = await _progressService.MarkCompleteAsync(userId, readingId);
                return Ok(progress);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Mark complete failed: {Message} (readingId: {ReadingId})", ex.Message, readingId);
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

    }
}
