namespace EncounterDaily.Core.Entities
{
    public class UserProgress : BaseEntity
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int SeriesId { get; set; }
        public Series Series { get; set; } = null!;

        public int DailyReadingId { get; set; }
        public DailyReading DailyReading { get; set; } = null!;

        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? Notes { get; set; }
    }
}
