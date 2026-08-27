using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    public class SeriesController : BaseApiController
    {
        private readonly ISeriesService _seriesService;

        public SeriesController(ISeriesService seriesService)
        {
            _seriesService = seriesService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Series>>> GetAll()
        {
            var items = await _seriesService.GetAllSeriesWithBooksAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Series>> GetById(int id)
        {
            var item = await _seriesService.GetSeriesWithBooksAsync(id);
            if (item == null)
                return NotFound();
            return Ok(item);
        }

        [HttpGet("{id}/config")]
        public async Task<ActionResult<SeriesConfig>> GetConfig(int id)
        {
            var config = await _seriesService.CreateConfigAsync(id);
            return Ok(config);
        }
    }
}
