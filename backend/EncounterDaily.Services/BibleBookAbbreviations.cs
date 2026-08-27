namespace EncounterDaily.Services
{
    public static class BibleBookAbbreviations
    {
        private static readonly Dictionary<string, string> Map = new(StringComparer.OrdinalIgnoreCase)
        {
            ["genesis"] = "Genesis", ["gen"] = "Genesis",
            ["exodus"] = "Exodus", ["ex"] = "Exodus",
            ["leviticus"] = "Leviticus", ["lev"] = "Leviticus",
            ["numbers"] = "Numbers", ["num"] = "Numbers",
            ["deuteronomy"] = "Deuteronomy", ["deut"] = "Deuteronomy",
            ["joshua"] = "Joshua", ["josh"] = "Joshua",
            ["judges"] = "Judges", ["judg"] = "Judges", ["jud"] = "Judges",
            ["ruth"] = "Ruth",
            ["1 samuel"] = "1 Samuel", ["1 sam"] = "1 Samuel", ["2 samuel"] = "2 Samuel", ["2 sam"] = "2 Samuel",
            ["1 kings"] = "1 Kings", ["1 kgs"] = "1 Kings", ["2 kings"] = "2 Kings", ["2 kgs"] = "2 Kings",
            ["1 chronicles"] = "1 Chronicles", ["1 chr"] = "1 Chronicles", ["1 chron"] = "1 Chronicles",
            ["2 chronicles"] = "2 Chronicles", ["2 chr"] = "2 Chronicles", ["2 chron"] = "2 Chronicles",
            ["ezra"] = "Ezra", ["nehemiah"] = "Nehemiah", ["neh"] = "Nehemiah",
            ["esther"] = "Esther", ["esth"] = "Esther", ["job"] = "Job",
            ["psalms"] = "Psalms", ["psalm"] = "Psalms", ["ps"] = "Psalms", ["psa"] = "Psalms",
            ["proverbs"] = "Proverbs", ["prov"] = "Proverbs", ["prv"] = "Proverbs",
            ["ecclesiastes"] = "Ecclesiastes", ["eccl"] = "Ecclesiastes",
            ["song of solomon"] = "Song of Solomon", ["song of sol"] = "Song of Solomon", ["song"] = "Song of Solomon",
            ["isaiah"] = "Isaiah", ["isa"] = "Isaiah",
            ["jeremiah"] = "Jeremiah", ["jer"] = "Jeremiah",
            ["lamentations"] = "Lamentations", ["lam"] = "Lamentations",
            ["ezekiel"] = "Ezekiel", ["ezek"] = "Ezekiel",
            ["daniel"] = "Daniel", ["dan"] = "Daniel",
            ["hosea"] = "Hosea", ["joel"] = "Joel", ["amos"] = "Amos",
            ["obadiah"] = "Obadiah", ["obad"] = "Obadiah",
            ["jonah"] = "Jonah", ["micah"] = "Micah", ["mic"] = "Micah",
            ["nahum"] = "Nahum", ["habakkuk"] = "Habakkuk", ["hab"] = "Habakkuk",
            ["zephaniah"] = "Zephaniah", ["zeph"] = "Zephaniah",
            ["haggai"] = "Haggai", ["hag"] = "Haggai",
            ["zechariah"] = "Zechariah", ["zech"] = "Zechariah",
            ["malachi"] = "Malachi", ["mal"] = "Malachi",
            ["matthew"] = "Matthew", ["matt"] = "Matthew",
            ["mark"] = "Mark", ["mk"] = "Mark",
            ["luke"] = "Luke", ["john"] = "John",
            ["acts"] = "Acts",
            ["romans"] = "Romans", ["rom"] = "Romans",
            ["1 corinthians"] = "1 Corinthians", ["1 cor"] = "1 Corinthians",
            ["2 corinthians"] = "2 Corinthians", ["2 cor"] = "2 Corinthians",
            ["galatians"] = "Galatians", ["gal"] = "Galatians",
            ["ephesians"] = "Ephesians", ["eph"] = "Ephesians",
            ["philippians"] = "Philippians", ["phil"] = "Philippians",
            ["colossians"] = "Colossians", ["col"] = "Colossians",
            ["1 thessalonians"] = "1 Thessalonians", ["1 thess"] = "1 Thessalonians",
            ["2 thessalonians"] = "2 Thessalonians", ["2 thess"] = "2 Thessalonians",
            ["1 timothy"] = "1 Timothy", ["1 tim"] = "1 Timothy",
            ["2 timothy"] = "2 Timothy", ["2 tim"] = "2 Timothy",
            ["titus"] = "Titus", ["philemon"] = "Philemon", ["philem"] = "Philemon",
            ["hebrews"] = "Hebrews", ["heb"] = "Hebrews",
            ["james"] = "James",
            ["1 peter"] = "1 Peter", ["1 pet"] = "1 Peter",
            ["2 peter"] = "2 Peter", ["2 pet"] = "2 Peter",
            ["1 john"] = "1 John", ["1 jn"] = "1 John",
            ["2 john"] = "2 John", ["2 jn"] = "2 John",
            ["3 john"] = "3 John", ["3 jn"] = "3 John",
            ["jude"] = "Jude",
            ["revelation"] = "Revelation", ["rev"] = "Revelation"
        };

        public static bool TryResolve(string? abbreviation, out string fullName)
        {
            if (string.IsNullOrWhiteSpace(abbreviation))
            {
                fullName = string.Empty;
                return false;
            }

            if (Map.TryGetValue(abbreviation, out var resolved))
            {
                fullName = resolved;
                return true;
            }

            fullName = string.Empty;
            return false;
        }
    }
}