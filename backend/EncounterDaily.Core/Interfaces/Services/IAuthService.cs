using EncounterDaily.Core.DTOs.Auth;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IAuthService
    {
        Task<TokenResponse> LoginWithGoogleAsync(string idToken);
        Task<TokenResponse> LoginWithFacebookAsync(string accessToken);
        Task<TokenResponse> RefreshTokenAsync(string refreshToken);
        Task RevokeTokenAsync(string refreshToken);
        Task<UserDto> GetCurrentUserAsync(int userId);
    }
}
