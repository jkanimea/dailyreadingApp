using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities;

public class EgwPage : BaseEntity
{
    public int BookId { get; set; }
    public Book Book { get; set; } = null!;

    public short PageNumber { get; set; }

    public string Text { get; set; } = string.Empty;
}
