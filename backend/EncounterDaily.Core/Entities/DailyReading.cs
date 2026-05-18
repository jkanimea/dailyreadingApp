using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities
{
    public class DailyReading : BaseEntity
    {
        public int SeriesId { get; set; }
        public Series Series { get; set; } = null!;

        public int Month { get; set; }
        public int Day { get; set; }

        [Required]
        [MaxLength(500)]
        public string BibleReading { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string PrimaryBookPageRange { get; set; } = string.Empty;

        public int PrimaryBookPageStart { get; set; }
        public int PrimaryBookPageEnd { get; set; }

        [MaxLength(50)]
        public string? SecondaryBookPageRange { get; set; }

        public int? SecondaryBookPageStart { get; set; }
        public int? SecondaryBookPageEnd { get; set; }

        public string? FullTextPrimary { get; set; }
        public string? FullTextSecondary { get; set; }
        public string? SummaryPoints { get; set; }

        public int SortOrder { get; set; }

        public ICollection<UserProgress> UserProgresses { get; set; } = new List<UserProgress>();
        public ICollection<UserBookmark> UserBookmarks { get; set; } = new List<UserBookmark>();
    }
}
