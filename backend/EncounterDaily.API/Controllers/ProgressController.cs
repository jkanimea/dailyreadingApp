using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [Route("api/[controller]")]
    public class ProgressController : BaseController<UserProgress>
    {
        private readonly IProgressService _progressService;

        public ProgressController(IProgressService progressService) : base(progressService)
        {
            _progressService = progressService;
        }

        [HttpGet("user-reading/{userId}/{readingId}")]
        public async Task<ActionResult<UserProgress>> GetUserReadingProgress(int userId, int readingId)
        {
            var item = await _progressService.GetUserReadingProgressAsync(userId, readingId);
            if (item == null)
                return NotFound();
            return Ok(item);
        }

        [HttpGet("streak/{userId}/{seriesId}")]
        public async Task<ActionResult<int>> GetStreak(int userId, int seriesId)
        {
            var streak = await _progressService.GetStreakAsync(userId, seriesId);
            return Ok(streak);
        }

        [HttpGet("user-series/{userId}/{seriesId}")]
        public async Task<ActionResult<IEnumerable<UserProgress>>> GetUserProgressForSeries(int userId, int seriesId)
        {
            var items = await _progressService.GetUserProgressForSeriesAsync(userId, seriesId);
            return Ok(items);
        }

        [HttpGet("completion/{userId}/{seriesId}")]
        public async Task<ActionResult<double>> GetCompletionPercentage(int userId, int seriesId)
        {
            var percentage = await _progressService.GetCompletionPercentageAsync(userId, seriesId);
            return Ok(percentage);
        }
    }
}
