using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities
{
    public class SearchHistory : BaseEntity
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int SeriesId { get; set; }
        public Series Series { get; set; } = null!;

        [Required]
        [MaxLength(255)]
        public string SearchTerm { get; set; } = string.Empty;
    }
}
