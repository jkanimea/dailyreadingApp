using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    public class BibleController : BaseApiController
    {
        private readonly IReadingService _readingService;
        private readonly ILogger<BibleController> _logger;

        public BibleController(IReadingService readingService, ILogger<BibleController> logger)
        {
            _readingService = readingService;
            _logger = logger;
        }

        [HttpGet("lookup")]
        public async Task<ActionResult<BibleLookupResponse>> LookupVerses(
            [FromQuery] string refs, [FromQuery] string translation = "KJV")
        {
            if (string.IsNullOrWhiteSpace(refs))
                return BadRequest(new { message = "Reference is required" });

            try
            {
                var result = await _readingService.LookupBibleVersesAsync(refs, translation);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to lookup Bible verses: {Refs}", refs);
                return StatusCode(500, new { message = "Failed to lookup Bible verses" });
            }
        }
    }
}
