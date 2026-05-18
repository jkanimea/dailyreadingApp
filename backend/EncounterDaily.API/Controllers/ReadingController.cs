using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [Route("api/[controller]")]
    public class ReadingController : BaseController<DailyReading>
    {
        private readonly IReadingService _readingService;

        public ReadingController(IReadingService readingService) : base(readingService)
        {
            _readingService = readingService;
        }

        [HttpGet("by-series-date/{seriesId}/{month}/{day}")]
        public async Task<ActionResult<DailyReading>> GetBySeriesDate(int seriesId, int month, int day)
        {
            var item = await _readingService.GetBySeriesDateAsync(seriesId, month, day);
            if (item == null)
                return NotFound();
            return Ok(item);
        }

        [HttpGet("by-series-month/{seriesId}/{month}")]
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

        [HttpGet("search/{seriesId}")]
        public async Task<ActionResult<IEnumerable<DailyReading>>> Search(int seriesId, [FromQuery] string searchTerm)
        {
            var items = await _readingService.SearchByTextAsync(seriesId, searchTerm);
            return Ok(items);
        }
    }
}
