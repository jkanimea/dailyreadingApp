using System.ComponentModel.DataAnnotations;
using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    public class ProgressController : BaseApiController
    {
        private readonly IProgressService _progressService;
        private readonly IAiSummaryService _aiSummaryService;
        private readonly ILogger<ProgressController> _logger;
        private readonly IAppLogService _appLogService;

        public ProgressController(IProgressService progressService, IAiSummaryService aiSummaryService, ILogger<ProgressController> logger, IAppLogService appLogService)
        {
            _progressService = progressService;
            _aiSummaryService = aiSummaryService;
            _logger = logger;
            _appLogService = appLogService;
        }

        [HttpGet("series/{seriesId}")]
        public async Task<ActionResult<IEnumerable<ProgressDto>>> GetSeriesProgress(int seriesId)
        {
            var userId = GetUserId();
            var items = await _progressService.GetUserProgressForSeriesAsync(userId, seriesId);
            return Ok(items);
        }

        [HttpPost("series/{seriesId}/reset")]
        public async Task<ActionResult> ResetSeries(int seriesId, [FromBody] ResetSeriesRequest? request = null)
        {
            var userId = GetUserId();
            await _progressService.ResetSeriesAsync(userId, seriesId, request?.DeleteNotes ?? false);
            return Ok();
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
                await _appLogService.SaveServerLogAsync("warn", "ProgressController.MarkComplete", $"Mark complete failed for reading {readingId}: {ex.Message}", ex.ToString());
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

        [HttpGet("{readingId}")]
        public async Task<ActionResult<ProgressDto>> GetProgress(int readingId)
        {
            var userId = GetUserId();
            var result = await _progressService.GetUserReadingProgressAsync(userId, readingId);
            if (result == null)
                return NotFound(new { message = "Progress not found for this reading" });
            return Ok(result);
        }

        [HttpPut("{readingId}/notes")]
        public async Task<ActionResult<ProgressDto>> SaveNotes(int readingId, [FromBody] SaveNotesRequest request)
        {
            var userId = GetUserId();
            var notes = request.Notes?.Trim();

            if (notes?.Length > 2000)
                return BadRequest(new { message = "Notes must be 2000 characters or fewer." });

            try
            {
                var result = await _progressService.SaveNotesAsync(userId, readingId, notes);
                if (result == null)
                    return NoContent();
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Save notes failed: {Message} (readingId: {ReadingId})", ex.Message, readingId);
                await _appLogService.SaveServerLogAsync("warn", "ProgressController.SaveNotes", $"Save notes failed for reading {readingId}: {ex.Message}", ex.ToString());
                return NotFound(new { message = ex.Message });
            }
            catch (ValidationException ex)
            {
                await _appLogService.SaveServerLogAsync("warn", "ProgressController.SaveNotes", $"Validation error: {ex.Message}", ex.ToString());
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("series/{seriesId}/journal")]
        public async Task<ActionResult<IEnumerable<JournalEntryDto>>> GetJournal(int seriesId)
        {
            var userId = GetUserId();
            var entries = await _progressService.GetJournalAsync(userId, seriesId);
            return Ok(entries);
        }

        [HttpPost("{readingId}/summarize")]
        public async Task<ActionResult<SummarizeNotesResponse>> SummarizeNotes(int readingId, [FromBody] SummarizeNotesRequest request)
        {
            var userId = GetUserId();
            var notes = request.Notes?.Trim();

            if (string.IsNullOrWhiteSpace(notes))
                return BadRequest(new { message = "No notes to summarize." });
            if (notes.Length > 2000)
                return BadRequest(new { message = "Notes must be 2000 characters or fewer." });

            try
            {
                var summary = await _aiSummaryService.SummarizeAsync(notes);
                return Ok(new SummarizeNotesResponse { Summary = summary });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Summarize failed: {Message}", ex.Message);
                await _appLogService.SaveServerLogAsync("warn", "ProgressController.SummarizeNotes", $"Summarize failed: {ex.Message}", ex.ToString());
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Summarize invalid: {Message}", ex.Message);
                await _appLogService.SaveServerLogAsync("warn", "ProgressController.SummarizeNotes", $"Summarize invalid: {ex.Message}", ex.ToString());
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
