namespace EncounterDaily.Core.DTOs.Logs
{
    public class AppLogDto
    {
        public int Id { get; set; }
        public string Level { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Source { get; set; }
        public string? Exception { get; set; }
        public int? UserId { get; set; }
        public string? UserEmail { get; set; }
        public string? IpAddress { get; set; }
        public string Origin { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
