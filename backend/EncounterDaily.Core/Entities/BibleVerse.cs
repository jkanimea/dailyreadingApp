using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities;

public class BibleVerse : BaseEntity
{
    public int BookId { get; set; }
    public BibleBook Book { get; set; } = null!;

    public short Chapter { get; set; }
    public short Verse { get; set; }

    [MaxLength(10)]
    public string Translation { get; set; } = "KJV";

    public string Text { get; set; } = string.Empty;
}
