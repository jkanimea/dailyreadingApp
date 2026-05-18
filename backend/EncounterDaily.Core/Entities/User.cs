using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities
{
    public class User : BaseEntity
    {
        [Required]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Provider { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string ProviderId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string DisplayName { get; set; } = string.Empty;

        public int SelectedSeriesId { get; set; } = 1;

        public DateTime? LastLoginAt { get; set; }

        public ICollection<UserProgress> UserProgresses { get; set; } = new List<UserProgress>();
        public ICollection<UserBookmark> UserBookmarks { get; set; } = new List<UserBookmark>();
        public ICollection<UserSeriesPreference> SeriesPreferences { get; set; } = new List<UserSeriesPreference>();
        public ICollection<SearchHistory> SearchHistory { get; set; } = new List<SearchHistory>();
    }
}
