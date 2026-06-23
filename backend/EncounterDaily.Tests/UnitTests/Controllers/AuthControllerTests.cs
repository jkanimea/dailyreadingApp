using System.Reflection;
using EncounterDaily.API.Controllers;
using EncounterDaily.Core.DTOs.Auth;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
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
            _controller = new AuthController(_mockService.Object, Mock.Of<ILogger<AuthController>>(), Mock.Of<IAppLogService>());
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
        public async Task Logout_ShouldReturnOk_WhenValidToken()
        {
            _mockService.Setup(s => s.RevokeTokenAsync("valid-token")).Returns(Task.CompletedTask);

            var result = await _controller.Logout(new RefreshRequest { RefreshToken = "valid-token" });

            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task Logout_ShouldReturnUnauthorized_WhenInvalidToken()
        {
            _mockService.Setup(s => s.RevokeTokenAsync("bad-token"))
                .ThrowsAsync(new UnauthorizedAccessException("Refresh token not found"));

            var result = await _controller.Logout(new RefreshRequest { RefreshToken = "bad-token" });

            var statusResult = result as UnauthorizedObjectResult;
            statusResult.Should().NotBeNull();
            statusResult!.StatusCode.Should().Be(401);
        }

        [Fact]
        public void LogoutEndpoint_ShouldHaveAllowAnonymousAttribute()
        {
            var method = typeof(AuthController).GetMethod("Logout");
            var attr = method?.GetCustomAttribute<AllowAnonymousAttribute>();
            attr.Should().NotBeNull();
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

        // ─── Regression: full TokenResponse must be returned so the frontend
        //            has tokens to store and a user to react to. The frontend
        //            login page depends on receiving a non-null body on 2xx. ───

        [Fact]
        public async Task LoginWithGoogle_ShouldReturnTokenResponse_WithAllRequiredFields()
        {
            var response = new TokenResponse
            {
                AccessToken = "google-access",
                RefreshToken = "google-refresh",
                ExpiresIn = 900,
                User = new UserDto { Id = 7, Email = "google@b.com", DisplayName = "Google User" }
            };
            _mockService.Setup(s => s.LoginWithGoogleAsync("good-token")).ReturnsAsync(response);

            var result = await _controller.LoginWithGoogle(new LoginRequest { IdToken = "good-token" });

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            okResult.Value.Should().NotBeNull("frontend relies on a non-null body to call storeTokens and navigate");

            var body = okResult.Value as TokenResponse;
            body.Should().NotBeNull();
            body!.AccessToken.Should().Be("google-access");
            body.RefreshToken.Should().Be("google-refresh");
            body.User.Should().NotBeNull();
            body.User!.Email.Should().Be("google@b.com");
            body.User.Id.Should().Be(7);
        }

        [Fact]
        public async Task LoginWithFacebook_ShouldReturnTokenResponse_WithAllRequiredFields()
        {
            var response = new TokenResponse
            {
                AccessToken = "fb-access",
                RefreshToken = "fb-refresh",
                ExpiresIn = 900,
                User = new UserDto { Id = 8, Email = "fb@b.com", DisplayName = "FB User" }
            };
            _mockService.Setup(s => s.LoginWithFacebookAsync("good-fb-token")).ReturnsAsync(response);

            var result = await _controller.LoginWithFacebook(new LoginRequest { IdToken = "good-fb-token" });

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            okResult.Value.Should().NotBeNull("frontend relies on a non-null body to call storeTokens and navigate");

            var body = okResult.Value as TokenResponse;
            body.Should().NotBeNull();
            body!.AccessToken.Should().Be("fb-access");
            body.RefreshToken.Should().Be("fb-refresh");
            body.User.Should().NotBeNull();
            body.User!.Email.Should().Be("fb@b.com");
            body.User.Id.Should().Be(8);
        }
    }
}
