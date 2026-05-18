using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities
{
    public class Series : BaseEntity
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string ShortName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public int PrimaryBookId { get; set; }
        public Book PrimaryBook { get; set; } = null!;

        public int? SecondaryBookId { get; set; }
        public Book? SecondaryBook { get; set; }

        public int SortOrder { get; set; }

        public ICollection<DailyReading> DailyReadings { get; set; } = new List<DailyReading>();
    }
}
