using EncounterDaily.Core.DTOs.Auth;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EncounterDaily.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpPost("google")]
        public async Task<ActionResult<TokenResponse>> LoginWithGoogle([FromBody] LoginRequest request)
        {
            try
            {
                var result = await _authService.LoginWithGoogleAsync(request.IdToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                _logger.LogWarning("Google login failed with invalid token");
                return Unauthorized(new { message = "Invalid Google token" });
            }
        }

        [AllowAnonymous]
        [HttpPost("facebook")]
        public async Task<ActionResult<TokenResponse>> LoginWithFacebook([FromBody] LoginRequest request)
        {
            try
            {
                var result = await _authService.LoginWithFacebookAsync(request.IdToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                _logger.LogWarning("Facebook login failed with invalid token");
                return Unauthorized(new { message = "Invalid Facebook token" });
            }
        }

        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<ActionResult<TokenResponse>> Refresh([FromBody] RefreshRequest request)
        {
            try
            {
                var result = await _authService.RefreshTokenAsync(request.RefreshToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Token refresh failed: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("logout")]
        public async Task<ActionResult> Logout([FromBody] RefreshRequest request)
        {
            try
            {
                await _authService.RevokeTokenAsync(request.RefreshToken);
                return Ok(new { message = "Logged out successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Logout failed: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
        }

        [Authorize]
        [EnableRateLimiting("PerUser")]
        [HttpGet("me")]
        public async Task<ActionResult<UserDto>> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _authService.GetCurrentUserAsync(userId);
            return Ok(user);
        }
    }
}
