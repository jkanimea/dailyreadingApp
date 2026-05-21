using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [Route("api/v1/[controller]")]
    public class ReadingController : BaseController<DailyReading>
    {
        private readonly IReadingService _readingService;

        public ReadingController(IReadingService readingService) : base(readingService)
        {
            _readingService = readingService;
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
        public async Task<ActionResult<ReadingDetailDto>> GetFullReading(int id)
        {
            try
            {
                var result = await _readingService.GetFullReadingAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
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
                return NotFound();
            }
        }

        [HttpGet("search/{seriesId}")]
        public async Task<ActionResult<IEnumerable<DailyReading>>> Search(int seriesId, [FromQuery] string searchTerm)
        {
            var items = await _readingService.SearchByTextAsync(seriesId, searchTerm);
            return Ok(items);
        }
    }
}
