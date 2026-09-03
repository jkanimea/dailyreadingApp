namespace EncounterDaily.Core.DTOs.Readings
{
    public class SeriesConfig
    {
        public int SeriesId { get; set; }
        public string PrimaryBookTitle { get; set; } = string.Empty;
        public string? SecondaryBookTitle { get; set; }
        public bool HasSecondaryReading { get; set; }
        public string DateRangeStart { get; set; } = string.Empty;
        public int TotalReadings { get; set; }
    }
}
