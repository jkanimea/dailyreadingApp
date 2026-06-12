using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities;

public class BibleBook : BaseEntity
{
    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Abbreviation { get; set; } = string.Empty;

    public int ChapterCount { get; set; }

    public ICollection<BibleVerse> Verses { get; set; } = new List<BibleVerse>();
}
