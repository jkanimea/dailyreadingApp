using EncounterDaily.API.Services;
using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    public class ReadingController : BaseController<DailyReading>
    {
        private readonly IReadingService _readingService;
        private readonly IBibleSeedService _bibleSeedService;

        public ReadingController(IReadingService readingService, IBibleSeedService bibleSeedService, ILogger<ReadingController> logger)
            : base(readingService, logger)
        {
            _readingService = readingService;
            _bibleSeedService = bibleSeedService;
        }

        [HttpGet("debug/bible-status")]
        public async Task<ActionResult> GetBibleStatus()
        {
            var status = await _readingService.GetBibleStatusAsync();
            return Ok(status);
        }

        [HttpGet("series/{seriesId}/today")]
        public async Task<ActionResult<DailyReadingDto>> GetToday(int seriesId, [FromQuery] int? month = null, [FromQuery] int? day = null)
        {
            try
            {
                var result = await _readingService.GetTodayReadingAsync(seriesId, month, day);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                _logger.LogWarning("Today's reading not found for series {SeriesId}, month {Month}, day {Day}", seriesId, month, day);
                return NotFound(new { message = "No reading found for today" });
            }
        }

        [HttpGet("series/{seriesId}/date/{month}/{day}")]
        public async Task<ActionResult<DailyReading>> GetBySeriesDate(int seriesId, int month, int day)
        {
            var item = await _readingService.GetBySeriesDateAsync(seriesId, month, day);
            if (item == null)
                return NotFound();
            return Ok(item);
        }

        [HttpGet("series/{seriesId}/month/{month}")]
        public async Task<ActionResult<IEnumerable<DailyReading>>> GetBySeriesMonth(int seriesId, int month)
        {
            var items = await _readingService.GetBySeriesMonthAsync(seriesId, month);
            return Ok(items);
        }

        [HttpGet("by-series-year/{seriesId}")]
        public async Task<ActionResult<IEnumerable<DailyReading>>> GetBySeriesYear(int seriesId)
        {
            var items = await _readingService.GetBySeriesYearAsync(seriesId);
            return Ok(items);
        }

        [HttpGet("{id}/full")]
        public async Task<ActionResult<ReadingDetailDto>> GetFullReading(int id, [FromQuery] string translation = "KJV")
        {
            try
            {
                var result = await _readingService.GetFullReadingAsync(id, translation);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                _logger.LogWarning("Full reading not found: {ReadingId}", id);
                return NotFound();
            }
        }

        [HttpGet("{id}/summary")]
        public async Task<ActionResult<SummaryDto>> GetSummary(int id)
        {
            try
            {
                var result = await _readingService.GetSummaryAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                _logger.LogWarning("Summary not found: {ReadingId}", id);
                return NotFound();
            }
        }

        [HttpGet("search/{seriesId}")]
        public async Task<ActionResult<IEnumerable<DailyReading>>> Search(int seriesId, [FromQuery] string searchTerm)
        {
            var items = await _readingService.SearchByTextAsync(seriesId, searchTerm);
            return Ok(items);
        }

        [HttpPost("seed-bible")]
        public async Task<ActionResult> SeedBible()
        {
            await _bibleSeedService.SeedMissingTranslationsAsync();
            return Ok(new { message = "Bible seed completed" });
        }
    }
}
