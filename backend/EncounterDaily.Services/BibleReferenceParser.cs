using System.Text.RegularExpressions;

namespace EncounterDaily.Services
{
    public static class BibleReferenceParser
    {
        public static readonly Regex BibleRefRegex = new(
            @"(\d\s+)?([A-Za-z]+)\.?\s+(\d+):(\d+)(?:-(\d+))?",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public static readonly Regex ChapterOnlyRefRegex = new(
            @"(\d\s+)?([A-Za-z]+)\.?\s+(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public static readonly Regex ContinuationRefRegex = new(
            @"^(\d+):(\d+)(?:-(\d+))?$",
            RegexOptions.Compiled);

        public static string BuildBookName(Match match)
        {
            return (match.Groups[1].Success ? match.Groups[1].Value.Trim() + " " : "") + match.Groups[2].Value;
        }

        public static IEnumerable<(int start, int end)> ParseChapterSpecs(string spec)
        {
            foreach (var part in spec.Split(','))
            {
                var trimmed = part.Trim();
                if (trimmed.Contains('-'))
                {
                    var range = trimmed.Split('-');
                    yield return (int.Parse(range[0]), int.Parse(range[1]));
                }
                else
                {
                    var ch = int.Parse(trimmed);
                    yield return (ch, ch);
                }
            }
        }
    }
}