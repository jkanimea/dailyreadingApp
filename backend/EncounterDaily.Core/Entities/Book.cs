using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities
{
    public class Book : BaseEntity
    {
        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Author { get; set; } = "Ellen G. White";

        [MaxLength(500)]
        public string FullTextSource { get; set; } = string.Empty;

        public int PageCount { get; set; }

        public ICollection<Series> PrimarySeries { get; set; } = new List<Series>();
        public ICollection<Series> SecondarySeries { get; set; } = new List<Series>();
    }
}
