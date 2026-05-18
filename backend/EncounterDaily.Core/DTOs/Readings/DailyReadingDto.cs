namespace EncounterDaily.Core.DTOs.Readings
{
    public class DailyReadingDto
    {
        public int Id { get; set; }
        public int SeriesId { get; set; }
        public string SeriesName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Day { get; set; }
        public string BibleReading { get; set; } = string.Empty;
        public string PrimaryBookPageRange { get; set; } = string.Empty;
        public string? SecondaryBookPageRange { get; set; }
        public bool HasSecondaryReading { get; set; }
        public int SortOrder { get; set; }
    }
}
