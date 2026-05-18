namespace EncounterDaily.Services
{
    public class JwtSettings
    {
        public string Issuer { get; set; } = "EncounterDaily";
        public string Audience { get; set; } = "EncounterDailyApp";
        public int AccessTokenExpirationMinutes { get; set; } = 15;
        public int RefreshTokenExpirationDays { get; set; } = 30;
        public string RsaPrivateKey { get; set; } = string.Empty;
        public string GoogleClientId { get; set; } = string.Empty;
        public string FacebookAppSecret { get; set; } = string.Empty;
    }
}
