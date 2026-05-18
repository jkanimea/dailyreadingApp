namespace EncounterDaily.Core.DTOs.Progress
{
    public class ProgressDto
    {
        public int ReadingId { get; set; }
        public int SeriesId { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int Month { get; set; }
        public int Day { get; set; }
        public string BibleReading { get; set; } = string.Empty;
    }
}
