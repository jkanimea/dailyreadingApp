using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [Route("api/v1/[controller]")]
    public class SeriesController : BaseController<Series>
    {
        private readonly ISeriesService _seriesService;
        private readonly ISeriesFactory _seriesFactory;

        public SeriesController(ISeriesService seriesService, ISeriesFactory seriesFactory) : base(seriesService)
        {
            _seriesService = seriesService;
            _seriesFactory = seriesFactory;
        }

        [HttpGet]
        public override async Task<ActionResult<IEnumerable<Series>>> GetAll()
        {
            var items = await _seriesService.GetAllSeriesWithBooksAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        public override async Task<ActionResult<Series>> GetById(int id)
        {
            var item = await _seriesService.GetSeriesWithBooksAsync(id);
            if (item == null)
                return NotFound();
            return Ok(item);
        }

        [HttpGet("{id}/config")]
        public async Task<ActionResult<SeriesConfig>> GetConfig(int id)
        {
            var config = await _seriesFactory.CreateConfigAsync(id);
            return Ok(config);
        }
    }
}
