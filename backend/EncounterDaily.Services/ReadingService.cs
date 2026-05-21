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
            ["gen"] = "Genesis", ["ex"] = "Exodus", ["lev"] = "Leviticus", ["num"] = "Numbers",
            ["deut"] = "Deuteronomy", ["josh"] = "Joshua", ["judg"] = "Judges", ["jud"] = "Judges",
            ["ruth"] = "Ruth", ["1 sam"] = "1 Samuel", ["2 sam"] = "2 Samuel",
            ["1 samuel"] = "1 Samuel", ["2 samuel"] = "2 Samuel",
            ["1 kgs"] = "1 Kings", ["1 kings"] = "1 Kings", ["2 kgs"] = "2 Kings", ["2 kings"] = "2 Kings",
            ["1 chr"] = "1 Chronicles", ["1 chron"] = "1 Chronicles",
            ["2 chr"] = "2 Chronicles", ["2 chron"] = "2 Chronicles",
            ["ezra"] = "Ezra", ["neh"] = "Nehemiah", ["esth"] = "Esther", ["job"] = "Job",
            ["ps"] = "Psalms", ["psalm"] = "Psalms", ["psa"] = "Psalms",
            ["prov"] = "Proverbs", ["prv"] = "Proverbs", ["eccl"] = "Ecclesiastes",
            ["song"] = "Song of Solomon", ["song of sol"] = "Song of Solomon",
            ["isa"] = "Isaiah", ["jer"] = "Jeremiah", ["lam"] = "Lamentations",
            ["ezek"] = "Ezekiel", ["dan"] = "Daniel", ["hosea"] = "Hosea",
            ["joel"] = "Joel", ["amos"] = "Amos", ["obad"] = "Obadiah",
            ["jonah"] = "Jonah", ["mic"] = "Micah", ["nahum"] = "Nahum",
            ["hab"] = "Habakkuk", ["zeph"] = "Zephaniah", ["hag"] = "Haggai",
            ["zech"] = "Zechariah", ["mal"] = "Malachi",
            ["matt"] = "Matthew", ["mk"] = "Mark", ["luke"] = "Luke", ["john"] = "John",
            ["acts"] = "Acts", ["rom"] = "Romans",
            ["1 cor"] = "1 Corinthians", ["1 corinthians"] = "1 Corinthians",
            ["2 cor"] = "2 Corinthians", ["2 corinthians"] = "2 Corinthians",
            ["gal"] = "Galatians", ["eph"] = "Ephesians", ["phil"] = "Philippians",
            ["col"] = "Colossians", ["1 thess"] = "1 Thessalonians",
            ["2 thess"] = "2 Thessalonians",
            ["1 tim"] = "1 Timothy", ["2 tim"] = "2 Timothy",
            ["titus"] = "Titus", ["philem"] = "Philemon", ["heb"] = "Hebrews",
            ["james"] = "James", ["1 pet"] = "1 Peter", ["2 pet"] = "2 Peter",
            ["1 jn"] = "1 John", ["2 jn"] = "2 John", ["3 jn"] = "3 John",
            ["jude"] = "Jude", ["rev"] = "Revelation"
        };

        private static readonly Regex BibleRefRegex = new(
            @"(\d\s+)?([A-Za-z]+)\s+(\d+):(\d+)",
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
                ? new DateTime(DateTime.UtcNow.Year, month.Value, day.Value)
                : DateTime.UtcNow;
            var reading = await _unitOfWork.Readings.GetBySeriesDateAsync(seriesId, now.Month, now.Day);
            if (reading == null)
                throw new KeyNotFoundException($"No reading found for series {seriesId} on {now.Month}/{now.Day}");

            return MapToDto(reading);
        }

        public async Task<ReadingDetailDto> GetFullReadingAsync(int readingId)
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId);
            if (reading == null)
                throw new KeyNotFoundException($"Reading {readingId} not found");

            var bibleText = await LookupBibleTextAsync(reading.BibleReading);
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
                FullTextPrimary = primaryText,
                FullTextSecondary = secondaryText,
                PrimaryBookPageRange = reading.PrimaryBookPageRange,
                SecondaryBookPageRange = reading.SecondaryBookPageRange,
                HasSecondaryReading = reading.SecondaryBookPageRange != null
            };
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

        private async Task<string> LookupBibleTextAsync(string? bibleReading)
        {
            if (string.IsNullOrWhiteSpace(bibleReading))
                return string.Empty;

            var verses = new List<string>();
            var parts = bibleReading.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            foreach (var part in parts)
            {
                var match = BibleRefRegex.Match(part);
                if (!match.Success)
                {
                    verses.Add($"({part})");
                    continue;
                }

                var bookName = (match.Groups[1].Success ? match.Groups[1].Value.Trim() + " " : "") + match.Groups[2].Value;
                var chapter = short.Parse(match.Groups[3].Value);
                var verseNum = short.Parse(match.Groups[4].Value);

                if (!RefAbbrevToFullName.TryGetValue(bookName, out var fullName))
                {
                    verses.Add($"({part})");
                    continue;
                }

                try
                {
                    var book = await _unitOfWork.Repository<BibleBook>()
                        .Query()
                        .Where(b => b.Name == fullName)
                        .FirstOrDefaultAsync();

                    if (book == null)
                    {
                        verses.Add($"({part})");
                        continue;
                    }

                    var verse = await _unitOfWork.Repository<BibleVerse>()
                        .Query()
                        .Where(v => v.BookId == book.Id && v.Chapter == chapter && v.Verse == verseNum)
                        .Select(v => v.Text)
                        .FirstOrDefaultAsync();

                    verses.Add(verse ?? $"({part})");
                }
                catch
                {
                    verses.Add($"({part})");
                }
            }

            return string.Join("\n\n", verses);
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
