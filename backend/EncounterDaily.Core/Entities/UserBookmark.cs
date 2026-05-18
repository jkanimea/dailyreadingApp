namespace EncounterDaily.Core.Entities
{
    public class UserBookmark : BaseEntity
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int SeriesId { get; set; }
        public Series Series { get; set; } = null!;

        public int DailyReadingId { get; set; }
        public DailyReading DailyReading { get; set; } = null!;

        public DateTime BookmarkedAt { get; set; } = DateTime.UtcNow;
    }
}
