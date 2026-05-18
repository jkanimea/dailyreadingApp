using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [Route("api/[controller]")]
    public class SeriesController : BaseController<Series>
    {
        private readonly ISeriesService _seriesService;

        public SeriesController(ISeriesService seriesService) : base(seriesService)
        {
            _seriesService = seriesService;
        }

        [HttpGet("with-books")]
        public async Task<ActionResult<IEnumerable<Series>>> GetAllWithBooks()
        {
            var items = await _seriesService.GetAllSeriesWithBooksAsync();
            return Ok(items);
        }

        [HttpGet("with-books/{id}")]
        public async Task<ActionResult<Series>> GetWithBooks(int id)
        {
            var item = await _seriesService.GetSeriesWithBooksAsync(id);
            if (item == null)
                return NotFound();
            return Ok(item);
        }
    }
}
