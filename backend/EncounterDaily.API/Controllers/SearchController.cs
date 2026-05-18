using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class SearchController : ControllerBase
    {
        private readonly ISearchService _searchService;

        public SearchController(ISearchService searchService)
        {
            _searchService = searchService;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<SearchResultDto>>> Search(
            [FromQuery] string q,
            [FromQuery] int seriesId = 1,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (string.IsNullOrWhiteSpace(q))
                return BadRequest(new { message = "Search term is required" });

            var result = await _searchService.SearchAsync(seriesId, q, Math.Max(page, 1), Math.Clamp(pageSize, 1, 100));
            return Ok(result);
        }

        [HttpGet("all")]
        public async Task<ActionResult<PagedResult<SearchResultDto>>> SearchAll(
            [FromQuery] string q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (string.IsNullOrWhiteSpace(q))
                return BadRequest(new { message = "Search term is required" });

            var result = await _searchService.SearchAllAsync(q, Math.Max(page, 1), Math.Clamp(pageSize, 1, 100));
            return Ok(result);
        }
    }
}
