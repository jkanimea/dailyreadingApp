using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EncounterDaily.Core.DTOs.Auth;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace EncounterDaily.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly JwtSettings _jwtSettings;
        private readonly RSA _rsa;
        private readonly IHttpClientFactory _httpClientFactory;

        public AuthService(IUnitOfWork unitOfWork, IOptions<JwtSettings> jwtSettings, RSA rsa, IHttpClientFactory httpClientFactory)
        {
            _unitOfWork = unitOfWork;
            _jwtSettings = jwtSettings.Value;
            _rsa = rsa;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<TokenResponse> LoginWithGoogleAsync(string idToken)
        {
            var validationSettings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _jwtSettings.GoogleClientId }
            };

            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(idToken, validationSettings);
            }
            catch (InvalidJwtException)
            {
                throw new UnauthorizedAccessException("Invalid Google token");
            }

            var user = await _unitOfWork.Users.GetByProviderAsync("google", payload.Subject);
            if (user == null)
            {
                user = new User
                {
                    Email = payload.Email,
                    DisplayName = payload.Name,
                    Provider = "google",
                    ProviderId = payload.Subject,
                    SelectedSeriesId = 1
                };
                await _unitOfWork.Users.AddAsync(user);
            }
            else
            {
                user.LastLoginAt = DateTime.UtcNow;
                await _unitOfWork.Users.UpdateAsync(user);
            }

            await _unitOfWork.CompleteAsync();
            return await GenerateTokensAsync(user);
        }

        public async Task<TokenResponse> LoginWithFacebookAsync(string accessToken)
        {
            FacebookUserResponse response;
            try
            {
                var http = _httpClientFactory.CreateClient("FacebookGraph");
                var fbUrl = $"/me?fields=id,name,email&access_token={accessToken}";

                if (!string.IsNullOrEmpty(_jwtSettings.FacebookAppSecret))
                {
                    var appSecretProof = ComputeAppSecretProof(accessToken, _jwtSettings.FacebookAppSecret);
                    fbUrl += $"&appsecret_proof={appSecretProof}";
                }

                response = await http.GetFromJsonAsync<FacebookUserResponse>(fbUrl)
                    ?? throw new UnauthorizedAccessException("Invalid Facebook token");
            }
            catch (HttpRequestException ex)
            {
                throw new UnauthorizedAccessException("Facebook token verification failed", ex);
            }

            var user = await _unitOfWork.Users.GetByProviderAsync("facebook", response.Id);
            if (user == null)
            {
                user = new User
                {
                    Email = response.Email ?? $"{response.Id}@facebook.com",
                    DisplayName = response.Name ?? "Facebook User",
                    Provider = "facebook",
                    ProviderId = response.Id,
                    SelectedSeriesId = 1
                };
                await _unitOfWork.Users.AddAsync(user);
            }
            else
            {
                user.LastLoginAt = DateTime.UtcNow;
                await _unitOfWork.Users.UpdateAsync(user);
            }

            await _unitOfWork.CompleteAsync();
            return await GenerateTokensAsync(user);
        }

        public async Task<TokenResponse> RefreshTokenAsync(string refreshToken)
        {
            var token = await _unitOfWork.RefreshTokens.GetByTokenAsync(refreshToken);

            if (token == null || token.IsRevoked || token.ExpiresAt <= DateTime.UtcNow)
                throw new UnauthorizedAccessException("Invalid or expired refresh token");

            token.ReuseCount++;
            if (token.ReuseCount >= 3)
            {
                token.IsRevoked = true;
                token.RevokedAt = DateTime.UtcNow;
                await _unitOfWork.CompleteAsync();
                throw new UnauthorizedAccessException("Refresh token reuse detected");
            }

            var user = await _unitOfWork.Users.GetByIdAsync(token.UserId)
                ?? throw new UnauthorizedAccessException("User not found");

            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
            await _unitOfWork.CompleteAsync();

            var tokens = await GenerateTokensAsync(user);

            token.ReplacedByToken = tokens.RefreshToken;
            await _unitOfWork.CompleteAsync();

            return tokens;
        }

        public async Task RevokeTokenAsync(string refreshToken)
        {
            var token = await _unitOfWork.RefreshTokens.GetByTokenAsync(refreshToken);
            if (token == null)
                throw new UnauthorizedAccessException("Refresh token not found");

            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
            await _unitOfWork.CompleteAsync();
        }

        public async Task<UserDto> GetCurrentUserAsync(int userId)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found");

            return MapToDto(user);
        }

        private async Task<TokenResponse> GenerateTokensAsync(User user)
        {
            var accessToken = GenerateAccessToken(user);
            var refreshToken = await GenerateRefreshTokenAsync(user);

            return new TokenResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60,
                User = MapToDto(user)
            };
        }

        private string GenerateAccessToken(User user)
        {
            var privateKey = new RsaSecurityKey(_rsa);
            var credentials = new SigningCredentials(privateKey, SecurityAlgorithms.RsaSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.DisplayName),
                new Claim("provider", user.Provider)
            };

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private async Task<string> GenerateRefreshTokenAsync(User user)
        {
            var tokenBytes = RandomNumberGenerator.GetBytes(64);
            var token = Convert.ToBase64String(tokenBytes);

            var refreshToken = new RefreshToken
            {
                UserId = user.Id,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays),
                IsRevoked = false
            };

            await _unitOfWork.RefreshTokens.AddAsync(refreshToken);
            await _unitOfWork.CompleteAsync();

            return token;
        }

        private static string ComputeAppSecretProof(string accessToken, string appSecret)
        {
            var keyBytes = Encoding.ASCII.GetBytes(appSecret);
            var tokenBytes = Encoding.ASCII.GetBytes(accessToken);
            using var hmac = new HMACSHA256(keyBytes);
            var hash = hmac.ComputeHash(tokenBytes);
            return Convert.ToHexString(hash).ToLower();
        }

        private static UserDto MapToDto(User user)
        {
            return new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                Provider = user.Provider,
                SelectedSeriesId = user.SelectedSeriesId,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            };
        }

        private class FacebookUserResponse
        {
            public string Id { get; set; } = string.Empty;
            public string? Name { get; set; }
            public string? Email { get; set; }
        }
    }
}
