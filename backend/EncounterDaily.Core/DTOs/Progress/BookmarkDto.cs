namespace EncounterDaily.Core.DTOs.Progress
{
    public class BookmarkDto
    {
        public int Id { get; set; }
        public int ReadingId { get; set; }
        public int SeriesId { get; set; }
        public DateTime BookmarkedAt { get; set; }
        public int Month { get; set; }
        public int Day { get; set; }
        public string BibleReading { get; set; } = string.Empty;
    }
}
