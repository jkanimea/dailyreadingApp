namespace EncounterDaily.Core.DTOs.Progress
{
    public class JournalEntryDto
    {
        public int ReadingId { get; set; }
        public int SeriesId { get; set; }
        public string SeriesName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Day { get; set; }
        public string BibleReading { get; set; } = string.Empty;
        public string PrimaryBookPageRange { get; set; } = string.Empty;
        public string? SecondaryBookPageRange { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? Notes { get; set; }
    }
}
