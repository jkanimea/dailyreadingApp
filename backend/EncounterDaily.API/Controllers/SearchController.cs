using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    public class SearchController : BaseApiController
    {
        private readonly ISearchService _searchService;
        private readonly ILogger<SearchController> _logger;

        public SearchController(ISearchService searchService, ILogger<SearchController> logger)
        {
            _searchService = searchService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<SearchResultDto>>> Search(
            [FromQuery] string q,
            [FromQuery] int seriesId = 1,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return BadRequest(new { message = "Search term must be at least 2 characters" });

            var userId = GetUserId();
            var result = await _searchService.SearchAsync(userId, seriesId, q.Trim(), Math.Max(page, 1), Math.Clamp(pageSize, 1, 100));
            return Ok(result);
        }

        [HttpGet("all")]
        public async Task<ActionResult<PagedResult<SearchResultDto>>> SearchAll(
            [FromQuery] string q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return BadRequest(new { message = "Search term must be at least 2 characters" });

            var userId = GetUserId();
            var result = await _searchService.SearchAllAsync(userId, q.Trim(), Math.Max(page, 1), Math.Clamp(pageSize, 1, 100));
            return Ok(result);
        }

    }
}
