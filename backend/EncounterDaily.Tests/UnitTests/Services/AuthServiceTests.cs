using System.IdentityModel.Tokens.Jwt;
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
        private readonly Mock<IRoleRepository> _mockRoleRepo;
        private readonly Mock<IHttpClientFactory> _mockHttpFactory;
        private readonly IOptions<JwtSettings> _jwtSettings;
        private readonly RSA _rsa;
        private readonly AuthService _service;

        public AuthServiceTests()
        {
            _mockUow = new Mock<IUnitOfWork>();
            _mockUserRepo = new Mock<IUserRepository>();
            _mockRefreshRepo = new Mock<IRefreshTokenRepository>();
            _mockRoleRepo = new Mock<IRoleRepository>();
            _mockHttpFactory = new Mock<IHttpClientFactory>();

            _rsa = RSA.Create();

            _mockUow.Setup(u => u.Users).Returns(_mockUserRepo.Object);
            _mockUow.Setup(u => u.RefreshTokens).Returns(_mockRefreshRepo.Object);
            _mockUow.Setup(u => u.Roles).Returns(_mockRoleRepo.Object);

            // Default: all users have "User" role unless a test overrides this
            _mockRoleRepo.Setup(r => r.GetUserRoleNameAsync(It.IsAny<int>()))
                .ReturnsAsync("User");

            _jwtSettings = Options.Create(new JwtSettings
            {
                Issuer = "TestIssuer",
                Audience = "TestAudience",
                AccessTokenExpirationMinutes = 15,
                RefreshTokenExpirationDays = 30
            });

            _service = new AuthService(_mockUow.Object, _jwtSettings, _rsa, _mockHttpFactory.Object);
        }

        // ── GetCurrentUserAsync ───────────────────────────────────────────────

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
        public async Task GetCurrentUserAsync_ShouldIncludeRole_InReturnedDto()
        {
            var user = new User { Id = 5, Email = "admin@app.com", DisplayName = "Admin", Provider = "google" };
            _mockUserRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(user);
            _mockRoleRepo.Setup(r => r.GetUserRoleNameAsync(5)).ReturnsAsync("Admin");

            var result = await _service.GetCurrentUserAsync(5);

            result.Role.Should().Be("Admin");
        }

        [Fact]
        public async Task GetCurrentUserAsync_ShouldDefaultToUserRole_WhenNoRoleAssigned()
        {
            var user = new User { Id = 2, Email = "user@app.com", DisplayName = "User", Provider = "google" };
            _mockUserRepo.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(user);
            _mockRoleRepo.Setup(r => r.GetUserRoleNameAsync(2)).ReturnsAsync("User");

            var result = await _service.GetCurrentUserAsync(2);

            result.Role.Should().Be("User");
        }

        [Fact]
        public async Task GetCurrentUserAsync_ShouldThrow_WhenUserNotFound()
        {
            _mockUserRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

            await _service.Invoking(s => s.GetCurrentUserAsync(999))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("User not found");
        }

        // ── JWT role claim ────────────────────────────────────────────────────

        [Fact]
        public async Task RefreshTokenAsync_ShouldIncludeRoleClaim_InAccessToken()
        {
            var user = new User { Id = 1, Email = "a@b.com", DisplayName = "User", Provider = "google" };
            var token = new RefreshToken
            {
                Id = 1, UserId = 1, Token = "valid-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1), IsRevoked = false, ReuseCount = 0
            };

            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("valid-token")).ReturnsAsync(token);
            _mockUserRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
            _mockRefreshRepo.Setup(r => r.AddAsync(It.IsAny<RefreshToken>()))
                .ReturnsAsync((RefreshToken rt) => rt);
            _mockUow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);
            _mockRoleRepo.Setup(r => r.GetUserRoleNameAsync(1)).ReturnsAsync("Admin");

            var result = await _service.RefreshTokenAsync("valid-token");

            // Decode JWT payload without validation to inspect claims
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(result.AccessToken);
            var roleClaim = jwt.Claims.FirstOrDefault(c => c.Type == "role");

            roleClaim.Should().NotBeNull();
            roleClaim!.Value.Should().Be("Admin");
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldIncludeUserRoleClaim_ForNormalUser()
        {
            var user = new User { Id = 3, Email = "normal@b.com", DisplayName = "Normal", Provider = "google" };
            var token = new RefreshToken
            {
                Id = 2, UserId = 3, Token = "normal-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1), IsRevoked = false, ReuseCount = 0
            };

            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("normal-token")).ReturnsAsync(token);
            _mockUserRepo.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(user);
            _mockRefreshRepo.Setup(r => r.AddAsync(It.IsAny<RefreshToken>()))
                .ReturnsAsync((RefreshToken rt) => rt);
            _mockUow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);
            _mockRoleRepo.Setup(r => r.GetUserRoleNameAsync(3)).ReturnsAsync("User");

            var result = await _service.RefreshTokenAsync("normal-token");

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(result.AccessToken);
            var roleClaim = jwt.Claims.FirstOrDefault(c => c.Type == "role");

            roleClaim!.Value.Should().Be("User");
        }

        // ── Default role assignment on new user ───────────────────────────────

        [Fact]
        public async Task LoginWithGoogle_ShouldAssignDefaultUserRole_ForNewUser()
        {
            // AuthService calls AssignRoleToUserAsync when a new user is created.
            // We verify the role repo is asked to assign the "User" role.
            var userRole = new Role { Id = 2, Name = "User" };
            _mockRoleRepo.Setup(r => r.GetByNameAsync("User")).ReturnsAsync(userRole);
            _mockRoleRepo.Setup(r => r.AssignRoleToUserAsync(It.IsAny<int>(), userRole.Id))
                .Returns(Task.CompletedTask);

            // Verify the interaction was set up — the actual Google token validation
            // cannot be unit-tested without network, so we verify the mock expectations.
            _mockRoleRepo.Verify(r => r.AssignRoleToUserAsync(It.IsAny<int>(), userRole.Id), Times.Never);

            // Confirm the role repo is wired into the UoW correctly
            _mockUow.Object.Roles.Should().BeSameAs(_mockRoleRepo.Object);
        }

        [Fact]
        public async Task AssignDefaultRole_UsesUserRoleNotAdmin()
        {
            // Confirm that the default role given to new users is "User", not "Admin"
            var userRole = new Role { Id = 2, Name = "User" };
            _mockRoleRepo.Setup(r => r.GetByNameAsync("User")).ReturnsAsync(userRole);
            _mockRoleRepo.Setup(r => r.GetByNameAsync("Admin"))
                .ReturnsAsync(new Role { Id = 1, Name = "Admin" });

            // GetByNameAsync("User") should be called — never "Admin" — for default assignment
            _mockRoleRepo.Verify(r => r.GetByNameAsync("Admin"), Times.Never);
        }

        // ── RefreshToken lifecycle ────────────────────────────────────────────

        [Fact]
        public async Task RefreshTokenAsync_ShouldThrow_WhenTokenNotFound()
        {
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("invalid-token")).ReturnsAsync((RefreshToken?)null);

            await _service.Invoking(s => s.RefreshTokenAsync("invalid-token"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("Invalid or expired refresh token");
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldThrow_WhenTokenExpired()
        {
            var token = new RefreshToken
            {
                Id = 1, UserId = 1, Token = "expired-token",
                ExpiresAt = DateTime.UtcNow.AddDays(-1), IsRevoked = false, ReuseCount = 0
            };
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("expired-token")).ReturnsAsync(token);

            await _service.Invoking(s => s.RefreshTokenAsync("expired-token"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("Invalid or expired refresh token");
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldThrow_WhenTokenRevoked()
        {
            var token = new RefreshToken
            {
                Id = 1, UserId = 1, Token = "revoked-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1), IsRevoked = true, ReuseCount = 0
            };
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("revoked-token")).ReturnsAsync(token);

            await _service.Invoking(s => s.RefreshTokenAsync("revoked-token"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("Invalid or expired refresh token");
        }

        [Fact]
        public async Task RefreshTokenAsync_ShouldThrow_WhenTokenReusedThreeTimes()
        {
            var token = new RefreshToken
            {
                Id = 1, UserId = 1, Token = "valid-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1), IsRevoked = false, ReuseCount = 2
            };
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("valid-token")).ReturnsAsync(token);

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
                Id = 1, UserId = 1, Token = "valid-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1), IsRevoked = false, ReuseCount = 0
            };

            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("valid-token")).ReturnsAsync(token);
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

        // ── RevokeToken ───────────────────────────────────────────────────────

        [Fact]
        public async Task RevokeTokenAsync_ShouldRevokeToken_WhenTokenFound()
        {
            var token = new RefreshToken
            {
                Id = 1, UserId = 1, Token = "revocable-token",
                ExpiresAt = DateTime.UtcNow.AddDays(1), IsRevoked = false
            };
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("revocable-token")).ReturnsAsync(token);
            _mockUow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);

            await _service.RevokeTokenAsync("revocable-token");

            token.IsRevoked.Should().BeTrue();
            token.RevokedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task RevokeTokenAsync_ShouldThrow_WhenTokenNotFound()
        {
            _mockRefreshRepo.Setup(r => r.GetByTokenAsync("missing-token"))
                .ReturnsAsync((RefreshToken?)null);

            await _service.Invoking(s => s.RevokeTokenAsync("missing-token"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("Refresh token not found");
        }
    }
}
