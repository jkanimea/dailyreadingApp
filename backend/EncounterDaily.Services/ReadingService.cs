using System.Text.RegularExpressions;
using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Services
{
    public class ReadingService : BaseService<DailyReading>, IReadingService
    {
        private static readonly Dictionary<string, string> RefAbbrevToFullName = new(StringComparer.OrdinalIgnoreCase)
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

        private static readonly Regex BibleRefRegex = new(
            @"(\d\s+)?([A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private static readonly Regex ChapterOnlyRefRegex = new(
            @"(\d\s+)?([A-Za-z]+)\s+(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public ReadingService(IUnitOfWork unitOfWork) : base(unitOfWork) { }

        public async Task<DailyReading?> GetBySeriesDateAsync(int seriesId, int month, int day)
        {
            return await _unitOfWork.Readings.GetBySeriesDateAsync(seriesId, month, day);
        }

        public async Task<IEnumerable<DailyReading>> GetBySeriesMonthAsync(int seriesId, int month)
        {
            return await _unitOfWork.Readings.GetBySeriesMonthAsync(seriesId, month);
        }

        public async Task<IEnumerable<DailyReading>> GetBySeriesYearAsync(int seriesId)
        {
            return await _unitOfWork.Readings.GetBySeriesYearAsync(seriesId);
        }

        public async Task<IEnumerable<DailyReading>> SearchByTextAsync(int seriesId, string searchTerm)
        {
            return await _unitOfWork.Readings.SearchByTextAsync(seriesId, searchTerm);
        }

        public async Task<DailyReadingDto> GetTodayReadingAsync(int seriesId, int? month = null, int? day = null)
        {
            var now = month.HasValue && day.HasValue
                ? new DateTime(DateTime.Now.Year, month.Value, day.Value)
                : DateTime.Now;
            var reading = await _unitOfWork.Readings.GetBySeriesDateAsync(seriesId, now.Month, now.Day);
            if (reading == null)
                throw new KeyNotFoundException($"No reading found for series {seriesId} on {now.Month}/{now.Day}");

            return MapToDto(reading);
        }

        public async Task<ReadingDetailDto> GetFullReadingAsync(int readingId, string translation = "KJV")
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId);
            if (reading == null)
                throw new KeyNotFoundException($"Reading {readingId} not found");

            var bibleText = await LookupBibleTextAsync(reading.BibleReading, translation);
            var primaryText = await AssembleEgwTextAsync(
                reading.Series?.PrimaryBookId, reading.PrimaryBookPageStart, reading.PrimaryBookPageEnd);
            var secondaryText = await AssembleEgwTextAsync(
                reading.Series?.SecondaryBookId, reading.SecondaryBookPageStart, reading.SecondaryBookPageEnd);

            return new ReadingDetailDto
            {
                Id = reading.Id,
                SeriesId = reading.SeriesId,
                SeriesName = reading.Series?.Name ?? "",
                Month = reading.Month,
                Day = reading.Day,
                BibleReading = reading.BibleReading,
                FullTextBible = bibleText,
                FullTextPrimary = string.IsNullOrEmpty(primaryText) ? (reading.FullTextPrimary ?? "") : primaryText,
                FullTextSecondary = string.IsNullOrEmpty(secondaryText) ? (reading.FullTextSecondary ?? "") : secondaryText,
                PrimaryBookPageRange = reading.PrimaryBookPageRange,
                SecondaryBookPageRange = reading.SecondaryBookPageRange,
                HasSecondaryReading = reading.SecondaryBookPageRange != null
            };
        }

        public async Task<object> GetBibleStatusAsync()
        {
            var bookCount = await _unitOfWork.Repository<BibleBook>().Query().CountAsync();
            var verseCount = await _unitOfWork.Repository<BibleVerse>().Query().CountAsync();
            var sample = await _unitOfWork.Repository<BibleBook>()
                .Query()
                .Select(b => new { b.Name, b.Abbreviation })
                .Take(5)
                .ToListAsync();
            return new { bookCount, verseCount, sampleBooks = sample };
        }

        public async Task<SummaryDto> GetSummaryAsync(int readingId)
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId);
            if (reading == null)
                throw new KeyNotFoundException($"Reading {readingId} not found");

            return new SummaryDto
            {
                Id = reading.Id,
                SummaryPoints = reading.SummaryPoints
            };
        }

        public async Task<BibleLookupResponse> LookupBibleVersesAsync(string refs, string translation = "KJV")
        {
            var response = new BibleLookupResponse { Reference = refs };

            if (string.IsNullOrWhiteSpace(refs))
                return response;

            var parts = refs.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            foreach (var part in parts)
            {
                var verseMatch = BibleRefRegex.Match(part);
                if (verseMatch.Success)
                {
                    await CollectVerseRef(verseMatch, response.Verses, translation);
                    continue;
                }

                var chapterMatch = ChapterOnlyRefRegex.Match(part);
                if (chapterMatch.Success)
                {
                    await CollectChapterRef(chapterMatch, response.Verses, translation);
                }
            }

            return response;
        }

        private async Task CollectVerseRef(Match match, List<BibleVerseDto> result, string translation = "KJV")
        {
            var bookName = (match.Groups[1].Success ? match.Groups[1].Value.Trim() + " " : "") + match.Groups[2].Value;
            var chapter = short.Parse(match.Groups[3].Value);
            var verseNum = short.Parse(match.Groups[4].Value);

            if (!RefAbbrevToFullName.TryGetValue(bookName, out var fullName))
                return;

            try
            {
                var book = await _unitOfWork.Repository<BibleBook>()
                    .Query()
                    .Where(b => b.Name == fullName)
                    .FirstOrDefaultAsync();

                if (book == null)
                    return;

                var endVerse = match.Groups[5].Success ? short.Parse(match.Groups[5].Value) : verseNum;

                var found = await _unitOfWork.Repository<BibleVerse>()
                    .Query()
                    .Where(v => v.BookId == book.Id && v.Translation == translation && v.Chapter == chapter && v.Verse >= verseNum && v.Verse <= endVerse)
                    .OrderBy(v => v.Verse)
                    .Select(v => new BibleVerseDto { Book = fullName, Chapter = (int)v.Chapter, Verse = (int)v.Verse, Text = v.Text })
                    .ToListAsync();

                result.AddRange(found);
            }
            catch { }
        }

        private async Task CollectChapterRef(Match match, List<BibleVerseDto> result, string translation = "KJV")
        {
            var bookName = (match.Groups[1].Success ? match.Groups[1].Value.Trim() + " " : "") + match.Groups[2].Value;
            var chapterSpec = match.Groups[3].Value;

            if (!RefAbbrevToFullName.TryGetValue(bookName, out var fullName))
                return;

            try
            {
                var book = await _unitOfWork.Repository<BibleBook>()
                    .Query()
                    .Where(b => b.Name == fullName)
                    .FirstOrDefaultAsync();

                if (book == null)
                    return;

                foreach (var (chapterStart, chapterEnd) in ParseChapterSpecs(chapterSpec))
                {
                    var found = await _unitOfWork.Repository<BibleVerse>()
                        .Query()
                        .Where(v => v.BookId == book.Id && v.Translation == translation && v.Chapter >= chapterStart && v.Chapter <= chapterEnd)
                        .OrderBy(v => v.Chapter)
                        .ThenBy(v => v.Verse)
                        .Select(v => new BibleVerseDto { Book = fullName, Chapter = (int)v.Chapter, Verse = (int)v.Verse, Text = v.Text })
                        .ToListAsync();

                    result.AddRange(found);
                }
            }
            catch { }
        }

        private async Task<string> LookupBibleTextAsync(string? bibleReading, string translation = "KJV")
        {
            if (string.IsNullOrWhiteSpace(bibleReading))
                return string.Empty;

            var resultParts = new List<string>();
            var parts = bibleReading.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            foreach (var part in parts)
            {
                var verseMatch = BibleRefRegex.Match(part);
                if (verseMatch.Success)
                {
                    await ProcessVerseRef(verseMatch, resultParts, translation);
                    continue;
                }

                var chapterMatch = ChapterOnlyRefRegex.Match(part);
                if (chapterMatch.Success)
                {
                    await ProcessChapterRef(chapterMatch, resultParts, translation);
                }
            }

            return resultParts.Count > 0 ? string.Join("\n\n", resultParts) : string.Empty;
        }

        private async Task ProcessVerseRef(Match match, List<string> resultParts, string translation = "KJV")
        {
            var bookName = (match.Groups[1].Success ? match.Groups[1].Value.Trim() + " " : "") + match.Groups[2].Value;
            var chapter = short.Parse(match.Groups[3].Value);
            var verseNum = short.Parse(match.Groups[4].Value);

            if (!RefAbbrevToFullName.TryGetValue(bookName, out var fullName))
                return;

            try
            {
                var book = await _unitOfWork.Repository<BibleBook>()
                    .Query()
                    .Where(b => b.Name == fullName)
                    .FirstOrDefaultAsync();

                if (book == null)
                    return;

                var endVerse = match.Groups[5].Success ? short.Parse(match.Groups[5].Value) : verseNum;

                var found = await _unitOfWork.Repository<BibleVerse>()
                    .Query()
                    .Where(v => v.BookId == book.Id && v.Translation == translation && v.Chapter == chapter && v.Verse >= verseNum && v.Verse <= endVerse)
                    .OrderBy(v => v.Verse)
                    .Select(v => new { v.Verse, v.Text })
                    .ToListAsync();

                if (found.Count == 0)
                    return;

                var headingRange = endVerse == verseNum ? $"{chapter}:{verseNum}" : $"{chapter}:{verseNum}-{endVerse}";
                resultParts.Add($"{fullName} {headingRange}");
                foreach (var v in found)
                    resultParts.Add($"{v.Verse} {v.Text}");
            }
            catch
            {
                // skip on error
            }
        }

        private async Task ProcessChapterRef(Match match, List<string> resultParts, string translation = "KJV")
        {
            var bookName = (match.Groups[1].Success ? match.Groups[1].Value.Trim() + " " : "") + match.Groups[2].Value;
            var chapterSpec = match.Groups[3].Value;

            if (!RefAbbrevToFullName.TryGetValue(bookName, out var fullName))
                return;

            try
            {
                var book = await _unitOfWork.Repository<BibleBook>()
                    .Query()
                    .Where(b => b.Name == fullName)
                    .FirstOrDefaultAsync();

                if (book == null)
                    return;

                foreach (var (chapterStart, chapterEnd) in ParseChapterSpecs(chapterSpec))
                {
                    var found = await _unitOfWork.Repository<BibleVerse>()
                        .Query()
                        .Where(v => v.BookId == book.Id && v.Translation == translation && v.Chapter >= chapterStart && v.Chapter <= chapterEnd)
                        .OrderBy(v => v.Chapter)
                        .ThenBy(v => v.Verse)
                        .Select(v => new { v.Chapter, v.Verse, v.Text })
                        .ToListAsync();

                    if (found.Count == 0)
                        continue;

                    var heading = chapterStart == chapterEnd
                        ? $"{fullName} {chapterStart}"
                        : $"{fullName} {chapterStart}-{chapterEnd}";

                    resultParts.Add(heading);
                    foreach (var v in found)
                        resultParts.Add($"{v.Chapter}:{v.Verse} {v.Text}");
                }
            }
            catch
            {
                // skip on error
            }
        }

        private static IEnumerable<(int start, int end)> ParseChapterSpecs(string spec)
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

        private async Task<string> AssembleEgwTextAsync(int? bookId, int? startPage, int? endPage)
        {
            if (bookId is not > 0 || startPage is not > 0 || endPage is not > 0)
                return string.Empty;

            if (startPage > endPage)
                return string.Empty;

            try
            {
                var pages = await _unitOfWork.Repository<EgwPage>()
                    .Query()
                    .Where(p => p.BookId == bookId.Value
                        && p.PageNumber >= startPage.Value
                        && p.PageNumber <= endPage.Value)
                    .OrderBy(p => p.PageNumber)
                    .Select(p => p.Text)
                    .ToListAsync();

                return string.Join(" ", pages);
            }
            catch
            {
                return string.Empty;
            }
        }

        private static DailyReadingDto MapToDto(DailyReading reading)
        {
            return new DailyReadingDto
            {
                Id = reading.Id,
                SeriesId = reading.SeriesId,
                SeriesName = reading.Series?.Name ?? "",
                Month = reading.Month,
                Day = reading.Day,
                BibleReading = reading.BibleReading,
                PrimaryBookPageRange = reading.PrimaryBookPageRange,
                SecondaryBookPageRange = reading.SecondaryBookPageRange,
                HasSecondaryReading = reading.SecondaryBookPageRange != null,
                SortOrder = reading.SortOrder
            };
        }
    }
}
