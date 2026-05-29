namespace EncounterDaily.Core.DTOs.Logs
{
    public class AppLogQueryDto
    {
        public string? Level { get; set; }
        public string? Origin { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }
}
