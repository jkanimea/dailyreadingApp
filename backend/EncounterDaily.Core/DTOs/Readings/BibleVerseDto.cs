namespace EncounterDaily.Core.DTOs.Readings
{
    public class BibleVerseDto
    {
        public string Book { get; set; } = string.Empty;
        public int Chapter { get; set; }
        public int Verse { get; set; }
        public string Text { get; set; } = string.Empty;
    }

    public class BibleVerseGroup
    {
        public string Reference { get; set; } = string.Empty;
        public List<BibleVerseDto> Verses { get; set; } = new();
    }

    public class BibleLookupResponse
    {
        public string Reference { get; set; } = string.Empty;
        public List<BibleVerseGroup> Groups { get; set; } = new();
    }
}
