using System.Text.RegularExpressions;
using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EncounterDaily.Services
{
    public class BibleTextAssembler
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<BibleTextAssembler> _logger;

        public BibleTextAssembler(IUnitOfWork unitOfWork, ILogger<BibleTextAssembler> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<List<BibleVerseGroup>> ResolveReferencesAsync(string refs, string translation = "KJV")
        {
            var groups = new List<BibleVerseGroup>();

            if (string.IsNullOrWhiteSpace(refs))
                return groups;

            var parts = refs.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            string? lastBookName = null;

            foreach (var part in parts)
            {
                var group = new BibleVerseGroup { Reference = part };

                var verseMatch = BibleReferenceParser.BibleRefRegex.Match(part);
                if (verseMatch.Success)
                {
                    lastBookName = BibleReferenceParser.BuildBookName(verseMatch);

                    await CollectVerseRef(verseMatch, group.Verses, translation);

                    var remaining = part.Substring(verseMatch.Length);
                    var commaParts = remaining.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    foreach (var cp in commaParts)
                    {
                        var rangeMatch = Regex.Match(cp, @"^(\d+)(?:-(\d+))?$");
                        if (!rangeMatch.Success) continue;

                        var chapter = short.Parse(verseMatch.Groups[3].Value);
                        var startVerse = short.Parse(rangeMatch.Groups[1].Value);
                        var endVerse = rangeMatch.Groups[2].Success ? short.Parse(rangeMatch.Groups[2].Value) : startVerse;

                        await LookupVerseRange(lastBookName, chapter, startVerse, endVerse, group.Verses, translation);
                    }

                    if (group.Verses.Count > 0)
                        groups.Add(group);
                    continue;
                }

                if (lastBookName != null)
                {
                    var contMatch = BibleReferenceParser.ContinuationRefRegex.Match(part);
                    if (contMatch.Success)
                    {
                        var chapter = short.Parse(contMatch.Groups[1].Value);
                        var startVerse = short.Parse(contMatch.Groups[2].Value);
                        var endVerse = contMatch.Groups[3].Success ? short.Parse(contMatch.Groups[3].Value) : startVerse;

                        await LookupVerseRange(lastBookName, chapter, startVerse, endVerse, group.Verses, translation);

                        if (group.Verses.Count > 0)
                            groups.Add(group);
                        continue;
                    }
                }

                var chapterMatch = BibleReferenceParser.ChapterOnlyRefRegex.Match(part);
                if (chapterMatch.Success)
                {
                    lastBookName = BibleReferenceParser.BuildBookName(chapterMatch);

                    await CollectChapterRef(chapterMatch, group.Verses, translation);
                    if (group.Verses.Count > 0)
                        groups.Add(group);
                }
            }

            return groups;
        }

        public async Task<string> LookupBibleTextAsync(string? bibleReading, string translation = "KJV")
        {
            if (string.IsNullOrWhiteSpace(bibleReading))
                return string.Empty;

            var resultParts = new List<string>();
            var parts = bibleReading.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            foreach (var part in parts)
            {
                var verseMatch = BibleReferenceParser.BibleRefRegex.Match(part);
                if (verseMatch.Success)
                {
                    await ProcessVerseRef(verseMatch, resultParts, translation);
                    continue;
                }

                var chapterMatch = BibleReferenceParser.ChapterOnlyRefRegex.Match(part);
                if (chapterMatch.Success)
                {
                    await ProcessChapterRef(chapterMatch, resultParts, translation);
                }
            }

            return resultParts.Count > 0 ? string.Join("\n\n", resultParts) : string.Empty;
        }

        public async Task<string> AssembleEgwTextAsync(int? bookId, int? startPage, int? endPage)
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
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "EGW text assembly failed for book {BookId} pages {StartPage}-{EndPage}", bookId, startPage, endPage);
                return string.Empty;
            }
        }

        private Task<BibleBook?> GetBookByNameAsync(string fullName)
        {
            return _unitOfWork.Repository<BibleBook>()
                .Query()
                .Where(b => b.Name == fullName)
                .FirstOrDefaultAsync();
        }

        private async Task LookupVerseRange(string bookName, short chapter, short startVerse, short endVerse,
            List<BibleVerseDto> result, string translation)
        {
            if (!BibleBookAbbreviations.TryResolve(bookName, out var fullName))
                return;

            try
            {
                var book = await GetBookByNameAsync(fullName);

                if (book == null)
                    return;

                var found = await _unitOfWork.Repository<BibleVerse>()
                    .Query()
                    .Where(v => v.BookId == book.Id && v.Translation == translation && v.Chapter == chapter
                        && v.Verse >= startVerse && v.Verse <= endVerse)
                    .OrderBy(v => v.Verse)
                    .Select(v => new BibleVerseDto { Book = fullName, Chapter = (int)v.Chapter, Verse = (int)v.Verse, Text = v.Text })
                    .ToListAsync();

                result.AddRange(found);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bible verse range lookup failed for {BookName} {Chapter}:{StartVerse}-{EndVerse}", bookName, chapter, startVerse, endVerse);
            }
        }

        private async Task CollectVerseRef(Match match, List<BibleVerseDto> result, string translation = "KJV")
        {
            var bookName = BibleReferenceParser.BuildBookName(match);
            var chapter = short.Parse(match.Groups[3].Value);
            var verseNum = short.Parse(match.Groups[4].Value);
            var endVerse = match.Groups[5].Success ? short.Parse(match.Groups[5].Value) : verseNum;

            await LookupVerseRange(bookName, chapter, verseNum, endVerse, result, translation);
        }

        private async Task CollectChapterRef(Match match, List<BibleVerseDto> result, string translation = "KJV")
        {
            var bookName = BibleReferenceParser.BuildBookName(match);
            var chapterSpec = match.Groups[3].Value;

            if (!BibleBookAbbreviations.TryResolve(bookName, out var fullName))
                return;

            try
            {
                var book = await GetBookByNameAsync(fullName);

                if (book == null)
                    return;

                foreach (var (chapterStart, chapterEnd) in BibleReferenceParser.ParseChapterSpecs(chapterSpec))
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
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bible chapter range lookup failed for {BookName} {ChapterSpec}", bookName, chapterSpec);
            }
        }

        private async Task ProcessVerseRef(Match match, List<string> resultParts, string translation = "KJV")
        {
            var bookName = BibleReferenceParser.BuildBookName(match);
            var chapter = short.Parse(match.Groups[3].Value);
            var verseNum = short.Parse(match.Groups[4].Value);

            if (!BibleBookAbbreviations.TryResolve(bookName, out var fullName))
                return;

            try
            {
                var book = await GetBookByNameAsync(fullName);

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
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bible verse text assembly failed for {BookName}", bookName);
            }
        }

        private async Task ProcessChapterRef(Match match, List<string> resultParts, string translation = "KJV")
        {
            var bookName = BibleReferenceParser.BuildBookName(match);
            var chapterSpec = match.Groups[3].Value;

            if (!BibleBookAbbreviations.TryResolve(bookName, out var fullName))
                return;

            try
            {
                var book = await GetBookByNameAsync(fullName);

                if (book == null)
                    return;

                foreach (var (chapterStart, chapterEnd) in BibleReferenceParser.ParseChapterSpecs(chapterSpec))
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
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bible chapter text assembly failed for {BookName}", bookName);
            }
        }
    }
}