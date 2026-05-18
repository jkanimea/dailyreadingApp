namespace EncounterDaily.Core.Entities
{
    public class UserSeriesPreference : BaseEntity
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int SeriesId { get; set; }
        public Series Series { get; set; } = null!;

        public DateTime StartDate { get; set; }
        public int CurrentDay { get; set; }
        public bool IsActive { get; set; }
    }
}
