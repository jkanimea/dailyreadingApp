namespace EncounterDaily.Core.DTOs.Readings
{
    public class ReadingDetailDto
    {
        public int Id { get; set; }
        public int SeriesId { get; set; }
        public string SeriesName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Day { get; set; }
        public string BibleReading { get; set; } = string.Empty;
        public string? FullTextPrimary { get; set; }
        public string? FullTextSecondary { get; set; }
        public string PrimaryBookPageRange { get; set; } = string.Empty;
        public string? SecondaryBookPageRange { get; set; }
        public bool HasSecondaryReading { get; set; }
    }
}
