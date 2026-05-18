using System.Reflection;
using EncounterDaily.API.Controllers;
using EncounterDaily.Core.DTOs.Auth;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class AuthControllerTests
    {
        private readonly Mock<IAuthService> _mockService;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            _mockService = new Mock<IAuthService>();
            _controller = new AuthController(_mockService.Object);
        }

        [Fact]
        public async Task LoginWithGoogle_ShouldReturnOk_WhenValidToken()
        {
            var response = new TokenResponse
            {
                AccessToken = "access-token",
                RefreshToken = "refresh-token",
                ExpiresIn = 900,
                User = new UserDto { Id = 1, Email = "a@b.com", DisplayName = "User" }
            };
            _mockService.Setup(s => s.LoginWithGoogleAsync("valid-token")).ReturnsAsync(response);

            var result = await _controller.LoginWithGoogle(new LoginRequest { IdToken = "valid-token" });

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            var value = okResult.Value as TokenResponse;
            value!.AccessToken.Should().Be("access-token");
        }

        [Fact]
        public async Task LoginWithGoogle_ShouldReturnUnauthorized_WhenInvalidToken()
        {
            _mockService.Setup(s => s.LoginWithGoogleAsync("bad-token"))
                .ThrowsAsync(new UnauthorizedAccessException("Invalid Google token"));

            var result = await _controller.LoginWithGoogle(new LoginRequest { IdToken = "bad-token" });

            var statusResult = result.Result as UnauthorizedObjectResult;
            statusResult.Should().NotBeNull();
            statusResult!.StatusCode.Should().Be(401);
        }

        [Fact]
        public async Task LoginWithFacebook_ShouldReturnOk_WhenValidToken()
        {
            var response = new TokenResponse
            {
                AccessToken = "fb-access",
                RefreshToken = "fb-refresh",
                ExpiresIn = 900,
                User = new UserDto { Id = 2, Email = "fb@b.com", DisplayName = "FB User" }
            };
            _mockService.Setup(s => s.LoginWithFacebookAsync("fb-token")).ReturnsAsync(response);

            var result = await _controller.LoginWithFacebook(new LoginRequest { IdToken = "fb-token" });

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task LoginWithFacebook_ShouldReturnUnauthorized_WhenInvalidToken()
        {
            _mockService.Setup(s => s.LoginWithFacebookAsync("bad-fb-token"))
                .ThrowsAsync(new UnauthorizedAccessException("Invalid Facebook token"));

            var result = await _controller.LoginWithFacebook(new LoginRequest { IdToken = "bad-fb-token" });

            var statusResult = result.Result as UnauthorizedObjectResult;
            statusResult.Should().NotBeNull();
            statusResult!.StatusCode.Should().Be(401);
        }

        [Fact]
        public async Task Refresh_ShouldReturnOk_WhenValidToken()
        {
            var response = new TokenResponse
            {
                AccessToken = "new-access",
                RefreshToken = "new-refresh",
                ExpiresIn = 900,
                User = new UserDto { Id = 1, Email = "a@b.com", DisplayName = "User" }
            };
            _mockService.Setup(s => s.RefreshTokenAsync("valid-refresh")).ReturnsAsync(response);

            var result = await _controller.Refresh(new RefreshRequest { RefreshToken = "valid-refresh" });

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task Refresh_ShouldReturnUnauthorized_WhenInvalidToken()
        {
            _mockService.Setup(s => s.RefreshTokenAsync("bad-refresh"))
                .ThrowsAsync(new UnauthorizedAccessException("Invalid or expired refresh token"));

            var result = await _controller.Refresh(new RefreshRequest { RefreshToken = "bad-refresh" });

            var statusResult = result.Result as UnauthorizedObjectResult;
            statusResult.Should().NotBeNull();
            statusResult!.StatusCode.Should().Be(401);
        }

        [Fact]
        public void GoogleEndpoint_ShouldHaveAllowAnonymousAttribute()
        {
            var method = typeof(AuthController).GetMethod("LoginWithGoogle");
            var attr = method?.GetCustomAttribute<AllowAnonymousAttribute>();
            attr.Should().NotBeNull();
        }

        [Fact]
        public void FacebookEndpoint_ShouldHaveAllowAnonymousAttribute()
        {
            var method = typeof(AuthController).GetMethod("LoginWithFacebook");
            var attr = method?.GetCustomAttribute<AllowAnonymousAttribute>();
            attr.Should().NotBeNull();
        }

        [Fact]
        public void RefreshEndpoint_ShouldHaveAllowAnonymousAttribute()
        {
            var method = typeof(AuthController).GetMethod("Refresh");
            var attr = method?.GetCustomAttribute<AllowAnonymousAttribute>();
            attr.Should().NotBeNull();
        }

        [Fact]
        public void GetCurrentUserEndpoint_ShouldHaveAuthorizeAttribute()
        {
            var method = typeof(AuthController).GetMethod("GetCurrentUser");
            var attr = method?.GetCustomAttribute<AuthorizeAttribute>();
            attr.Should().NotBeNull();
        }
    }
}
