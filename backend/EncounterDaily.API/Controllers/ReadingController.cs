using EncounterDaily.API.Services;
using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    public class ReadingController : BaseApiController
    {
        private readonly IReadingService _readingService;
        private readonly IBibleSeedService _bibleSeedService;
        private readonly ILogger<ReadingController> _logger;
        private readonly IAppLogService _appLogService;

        public ReadingController(IReadingService readingService, IBibleSeedService bibleSeedService, ILogger<ReadingController> logger, IAppLogService appLogService)
        {
            _readingService = readingService;
            _bibleSeedService = bibleSeedService;
            _logger = logger;
            _appLogService = appLogService;
        }

        [HttpGet("series/{seriesId}/today")]
        public async Task<ActionResult<DailyReadingDto>> GetToday(int seriesId, [FromQuery] int? month = null, [FromQuery] int? day = null)
        {
            if (month.HasValue && (month < 1 || month > 12))
                return BadRequest(new { message = "Month must be between 1 and 12." });
            if (day.HasValue && (day < 1 || day > 31))
                return BadRequest(new { message = "Day must be between 1 and 31." });

            try
            {
                var result = await _readingService.GetTodayReadingAsync(seriesId, month, day);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Today's reading not found for series {SeriesId}, month {Month}, day {Day}", seriesId, month, day);
                await _appLogService.SaveServerLogAsync("warn", "ReadingController.GetToday", $"Today's reading not found for series {seriesId}", ex.ToString());
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

        [HttpGet("series/{seriesId}/day/{dayNumber}")]
        [AllowAnonymous]
        public async Task<ActionResult<DailyReadingDto>> GetByDayNumber(int seriesId, int dayNumber)
        {
            if (dayNumber < 1)
                return BadRequest(new { message = "Day number must be at least 1." });

            var reading = await _readingService.GetByDayNumberAsync(seriesId, dayNumber);
            return reading == null ? NotFound() : Ok(MapToDto(reading));
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
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Full reading not found: {ReadingId}", id);
                await _appLogService.SaveServerLogAsync("warn", "ReadingController.GetFullReading", $"Full reading not found: {id}", ex.ToString());
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
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Summary not found: {ReadingId}", id);
                await _appLogService.SaveServerLogAsync("warn", "ReadingController.GetSummary", $"Summary not found: {id}", ex.ToString());
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

        private static DailyReadingDto MapToDto(DailyReading reading) => new()
        {
            Id = reading.Id,
            SeriesId = reading.SeriesId,
            SeriesName = reading.Series?.Name ?? string.Empty,
            Month = reading.Month,
            Day = reading.Day,
            BibleReading = reading.BibleReading,
            PrimaryBookPageRange = reading.PrimaryBookPageRange,
            SecondaryBookPageRange = reading.SecondaryBookPageRange,
            HasSecondaryReading = reading.SecondaryBookPageRange != null,
            SortOrder = reading.SortOrder
        };
    }
}
