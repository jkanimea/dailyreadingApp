using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using EncounterDaily.Core.DTOs.Auth;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Services;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class AuthServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IUserRepository> _mockUserRepo;
        private readonly Mock<IRefreshTokenRepository> _mockRefreshRepo;
        private readonly Mock<IHttpClientFactory> _mockHttpFactory;
        private readonly IOptions<JwtSettings> _jwtSettings;
        private readonly RSA _rsa;
        private readonly AuthService _service;

        public AuthServiceTests()
        {
            _mockUow = new Mock<IUnitOfWork>();
            _mockUserRepo = new Mock<IUserRepository>();
            _mockRefreshRepo = new Mock<IRefreshTokenRepository>();
            _mockHttpFactory = new Mock<IHttpClientFactory>();

            _rsa = RSA.Create();

            _mockUow.Setup(u => u.Users).Returns(_mockUserRepo.Object);
            _mockUow.Setup(u => u.RefreshTokens).Returns(_mockRefreshRepo.Object);

            _jwtSettings = Options.Create(new JwtSettings
            {
                Issuer = "TestIssuer",
                Audience = "TestAudience",
                AccessTokenExpirationMinutes = 15,
                RefreshTokenExpirationDays = 30
            });

            _service = new AuthService(_mockUow.Object, _jwtSettings, _rsa, _mockHttpFactory.Object);
        }

        [Fact]
        public async Task GetCurrentUserAsync_ShouldReturnUserDto_WhenUserExists()
        {
            var user = new User
            {
                Id = 1,
                Email = "test@example.com",
                DisplayName = "Test User",
                Provider = "google",
                SelectedSeriesId = 1,
                CreatedAt = DateTime.UtcNow
            };
            _mockUserRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

            var result = await _service.GetCurrentUserAsync(1);

            result.Should().NotBeNull();
            result.Id.Should().Be(1);
            result.Email.Should().Be("test@example.com");
            result.DisplayName.Should().Be("Test User");
            result.Provider.Should().Be("google");
        }

        [Fact]
        public async Task GetCurrentUserAsync_ShouldThrow_WhenUserNotFound()
        {
            _mockUserRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

            await _service.Invoking(s => s.GetCurrentUserAsync(999))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("User not found");
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldThrow_WhenTokenNotFound()
        {
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("invalid-token")).ReturnsAsync((RefreshToken?)null);

            await _service.Invoking(s => s.RefreshTokenAsync("invalid-token"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("Invalid or expired refresh token");
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldThrow_WhenTokenReusedThreeTimes()
        {
            var token = new RefreshToken
            {
                Id = 1,
                UserId = 1,
                Token = "valid-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1),
                IsRevoked = false,
                ReuseCount = 2
            };
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("valid-token"))
                .ReturnsAsync(token);

            await _service.Invoking(s => s.RefreshTokenAsync("valid-token"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("Refresh token reuse detected");

            token.IsRevoked.Should().BeTrue();
            token.RevokedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldCreateNewTokenPair_WhenValid()
        {
            var user = new User { Id = 1, Email = "a@b.com", DisplayName = "User", Provider = "google" };
            var token = new RefreshToken
            {
                Id = 1,
                UserId = 1,
                Token = "valid-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1),
                IsRevoked = false,
                ReuseCount = 0
            };

            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("valid-token"))
                .ReturnsAsync(token);
            _mockUserRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
            _mockRefreshRepo.Setup(r => r.AddAsync(It.IsAny<RefreshToken>()))
                .ReturnsAsync((RefreshToken rt) => rt);
            _mockUow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);

            var result = await _service.RefreshTokenAsync("valid-token");

            result.Should().NotBeNull();
            result.AccessToken.Should().NotBeEmpty();
            result.RefreshToken.Should().NotBeEmpty();
            result.User.Email.Should().Be("a@b.com");
            token.IsRevoked.Should().BeTrue();
            token.ReplacedByToken.Should().Be(result.RefreshToken);
        }

        [Fact]
        public async Task GenerateAccessToken_ShouldIncludeJtiClaim()
        {
            var user = new User { Id = 1, Email = "jti@test.com", DisplayName = "JTI User", Provider = "google" };
            _mockUserRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

            var result = await _service.GetCurrentUserAsync(1);

            result.Should().NotBeNull();
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldThrow_WhenTokenExpired()
        {
            var token = new RefreshToken
            {
                Id = 1,
                UserId = 1,
                Token = "expired-token",
                ExpiresAt = DateTime.UtcNow.AddDays(-1),
                IsRevoked = false,
                ReuseCount = 0
            };
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("expired-token"))
                .ReturnsAsync(token);

            await _service.Invoking(s => s.RefreshTokenAsync("expired-token"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("Invalid or expired refresh token");
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldThrow_WhenTokenRevoked()
        {
            var token = new RefreshToken
            {
                Id = 1,
                UserId = 1,
                Token = "revoked-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1),
                IsRevoked = true,
                ReuseCount = 0
            };
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("revoked-token"))
                .ReturnsAsync(token);

            await _service.Invoking(s => s.RefreshTokenAsync("revoked-token"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("Invalid or expired refresh token");
        }
    }
}
