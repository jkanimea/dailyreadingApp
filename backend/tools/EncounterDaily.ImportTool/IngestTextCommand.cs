using System.Text.RegularExpressions;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Enums;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public class IngestTextCommand
{
    private static readonly Regex PageMarkerRegex = new(
        @"\{([A-Z]+)\s+(\d+)\.(\d+)\}",
        RegexOptions.Compiled);

    private static readonly Regex PageMarkerBracketRegex = new(
        @"\[p\.\s*(\d+)\]",
        RegexOptions.Compiled);

    private static readonly Regex InlinePageBreakRegex = new(
        @"\[(\d+)\]",
        RegexOptions.Compiled);

    private static readonly Regex WhitespaceRegex = new(
        @"\s+",
        RegexOptions.Compiled);

    private static readonly Regex ChapterLinkRegex = new(
        @"<a\s+href=""([^""]*?-da-(\d+)\.htm)""",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private record BookInfo(string Code, string Title, string TocUrl, int MaxChapters);

    private static readonly Dictionary<string, BookInfo> Books = new()
    {
        ["DA"] = new("DA", "Desire of Ages",
            "https://ellenwhite.info/books/ellen-g-white-book-desire-of-ages-da-contents.htm", 87),
        ["AA"] = new("AA", "Acts of the Apostles",
            "https://ellenwhite.info/books/ellen-g-white-book-acts-of-the-apostles-aa-contents.htm", 58),
        ["GC"] = new("GC", "The Great Controversy",
            "https://ellenwhite.info/books/ellen-g-white-book-great-controversy-gc-contents.htm", 42),
        ["PP"] = new("PP", "Patriarchs and Prophets",
            "https://ellenwhite.info/books/ellen-g-white-book-patriarchs-and-prophets-pp-contents.htm", 73),
        ["PK"] = new("PK", "Prophets and Kings",
            "https://ellenwhite.info/books/bk-pk-contents.htm", 61),
    };

    private static readonly Dictionary<string, List<(int SeriesId, bool IsSecondary)>> BookSeriesMap = new()
    {
        ["DA"] = new() { (1, false) },
        ["AA"] = new() { (2, false) },
        ["GC"] = new() { (2, true) },
        ["PP"] = new() { (3, false) },
        ["PK"] = new() { (4, false) },
    };

    private static readonly Dictionary<string, BookType> CodeToBookType = new()
    {
        ["DA"] = BookType.DesireOfAges,
        ["AA"] = BookType.ActsOfTheApostles,
        ["GC"] = BookType.GreatControversy,
        ["PP"] = BookType.PatriarchsAndProphets,
        ["PK"] = BookType.ProphetsAndKings,
    };

    private readonly string _connectionString;
    private readonly string _bookCode;
    private readonly int? _seriesFilter;
    private readonly bool _dryRun;
    private readonly bool _allBooks;
    private readonly int _maxTextLength;
    private readonly int _delayMs;

    private int _updatedCount;
    private int _skippedCount;
    private int _errorCount;

    public IngestTextCommand(
        string connectionString,
        string bookCode,
        int? seriesFilter,
        bool dryRun,
        int maxTextLength = 20000,
        int delayMs = 1000)
    {
        _connectionString = connectionString;
        _bookCode = bookCode.ToUpperInvariant();
        _seriesFilter = seriesFilter;
        _dryRun = dryRun;
        _allBooks = _bookCode == "ALL";
        _maxTextLength = maxTextLength;
        _delayMs = delayMs;
    }

    public async Task<int> ExecuteAsync()
    {
        var bookCodes = _allBooks ? Books.Keys.ToList() : new List<string> { _bookCode };

        foreach (var code in bookCodes)
        {
            if (!Books.ContainsKey(code))
            {
                Console.Error.WriteLine($"Unknown book code '{code}'. Valid: {string.Join(", ", Books.Keys)}");
                continue;
            }

            Console.WriteLine($"\n{new string('=', 60)}");
            Console.WriteLine($"Book: {Books[code].Title} ({code})");
            Console.WriteLine($"Series filter: {_seriesFilter?.ToString() ?? "all"}");
            Console.WriteLine($"Dry run: {_dryRun}");

            try
            {
                await ProcessBookAsync(code);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"  ERROR: {ex.Message}");
                _errorCount++;
            }
        }

        Console.WriteLine($"\n{new string('=', 60)}");
        Console.WriteLine($"Total - Updated: {_updatedCount}, Skipped: {_skippedCount}, Errors: {_errorCount}");
        return _errorCount > 0 ? 1 : 0;
    }

    private async Task ProcessBookAsync(string code)
    {
        var book = Books[code];

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(_connectionString);
        using var context = new AppDbContext(optionsBuilder.Options);

        var bookType = CodeToBookType[code];
        var dbBook = await context.Set<Book>().FirstOrDefaultAsync(b => b.BookType == bookType);
        if (dbBook == null)
        {
            Console.Error.WriteLine($"  Book type {bookType} not found in database. Run seeddata first.");
            return;
        }

        Dictionary<int, string>? pageTexts = null;
        var existingPages = await context.Set<EgwPage>()
            .Where(p => p.BookId == dbBook.Id)
            .CountAsync();

        if (existingPages > 0)
        {
            Console.WriteLine($"  {existingPages} EgwPages already cached in DB, skipping web scrape.");
        }
        else
        {
            Console.WriteLine($"  Scraping chapters from ellenwhite.info...");
            pageTexts = await ScrapePageTextsFromWebAsync(book);
            Console.WriteLine($"  Parsed {pageTexts.Count} pages with content");

            if (pageTexts.Count == 0)
            {
                Console.Error.WriteLine("  No page markers found. Cannot proceed.");
                return;
            }

            Console.WriteLine($"  Page range: {pageTexts.Keys.Min()} - {pageTexts.Keys.Max()}");

            Console.WriteLine($"  Storing {pageTexts.Count} pages to EgwPage table...");
            var egwPages = new List<EgwPage>();
            foreach (var (pageNum, pageText) in pageTexts)
            {
                egwPages.Add(new EgwPage
                {
                    BookId = dbBook.Id,
                    PageNumber = (short)pageNum,
                    Text = pageText
                });
            }
            context.Set<EgwPage>().AddRange(egwPages);
            await context.SaveChangesAsync();
            Console.WriteLine($"  Stored {egwPages.Count} pages.");
        }

        var allPages = await context.Set<EgwPage>()
            .Where(p => p.BookId == dbBook.Id)
            .ToDictionaryAsync(p => (int)p.PageNumber, p => p.Text);

        if (allPages.Count == 0)
        {
            Console.Error.WriteLine("  No pages in database. Cannot proceed.");
            return;
        }

        Console.WriteLine($"  Cached page range: {allPages.Keys.Min()} - {allPages.Keys.Max()}");

        var seriesMappings = BookSeriesMap[code]
            .Where(m => !_seriesFilter.HasValue || m.SeriesId == _seriesFilter.Value)
            .ToList();

        if (seriesMappings.Count == 0)
        {
            Console.Error.WriteLine($"  No series match book '{code}' with current filter.");
            return;
        }

        Console.WriteLine($"  Matching series: {string.Join(", ", seriesMappings.Select(m => $"{m.SeriesId} ({(m.IsSecondary ? "sec" : "pri")})"))}");

        foreach (var (seriesId, isSecondary) in seriesMappings)
        {
            var readings = await context.Set<DailyReading>()
                .Where(r => r.SeriesId == seriesId)
                .OrderBy(r => r.SortOrder)
                .ToListAsync();

            Console.WriteLine($"  Series {seriesId}: {readings.Count} readings");

            foreach (var reading in readings)
            {
                int startPage = isSecondary
                    ? (reading.SecondaryBookPageStart ?? 0)
                    : reading.PrimaryBookPageStart;
                int endPage = isSecondary
                    ? (reading.SecondaryBookPageEnd ?? 0)
                    : reading.PrimaryBookPageEnd;

                if (startPage == 0 || endPage == 0 || startPage > endPage)
                {
                    _skippedCount++;
                    continue;
                }

                var textParts = new List<string>();
                for (int p = startPage; p <= endPage; p++)
                {
                    if (allPages.TryGetValue(p, out var pt) && !string.IsNullOrWhiteSpace(pt))
                        textParts.Add(pt.Trim());
                }

                var fullText = string.Join(" ", textParts);
                if (string.IsNullOrWhiteSpace(fullText))
                {
                    _skippedCount++;
                    continue;
                }

                string trimmed = fullText.Length > _maxTextLength
                    ? fullText[.._maxTextLength]
                    : fullText;

                if (_dryRun)
                {
                    Console.WriteLine($"    [{seriesId}] Day {reading.Month}/{reading.Day} (pp.{startPage}-{endPage}, {(isSecondary ? "sec" : "pri")}) - {trimmed.Length} chars");
                }
                else
                {
                    if (isSecondary)
                        reading.FullTextSecondary = trimmed;
                    else
                        reading.FullTextPrimary = trimmed;
                    _updatedCount++;
                }
            }
        }

        if (!_dryRun)
        {
            await context.SaveChangesAsync();
            Console.WriteLine($"  DB updated for {code}");
        }
    }

    private async Task<Dictionary<int, string>> ScrapePageTextsFromWebAsync(BookInfo book)
    {
        var chapterUrls = await DiscoverChapterUrlsAsync(book);

        if (chapterUrls.Count == 0)
        {
            Console.WriteLine("  No chapter URLs discovered from TOC, trying sequential pattern...");
            var code = book.Code.ToLowerInvariant();
            for (int i = 1; i <= book.MaxChapters; i++)
            {
                var url = code switch
                {
                    "pk" => $"https://ellenwhite.info/books/bk-pk-{i:D2}.htm",
                    "pp" => $"https://ellenwhite.info/books/ellen-g-white-book-patriarchs-and-prophets-pp-{i}.htm",
                    _ => $"https://ellenwhite.info/books/ellen-g-white-book-{code}-{code}-{i:D2}.htm"
                };
                chapterUrls.Add(i, url);
            }
        }

        Console.WriteLine($"  Fetching {chapterUrls.Count} chapters...");

        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

        var allText = new System.Text.StringBuilder();
        int fetched = 0;

        foreach (var (chNum, url) in chapterUrls)
        {
            try
            {
                var response = await http.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"    Ch.{chNum}: HTTP {(int)response.StatusCode} - skipping");
                    continue;
                }

                var html = await response.Content.ReadAsStringAsync();
                var text = ExtractChapterText(html);
                allText.Append(' ');
                allText.Append(text);
                fetched++;

                if (fetched % 10 == 0)
                    Console.WriteLine($"    Fetched {fetched}/{chapterUrls.Count} chapters...");

                if (fetched < chapterUrls.Count)
                    await Task.Delay(_delayMs);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"    Ch.{chNum}: Error - {ex.Message}");
            }
        }

        Console.WriteLine($"  Fetched {fetched}/{chapterUrls.Count} chapters, total text: {allText.Length} chars");

        return BuildPageTextMap(allText.ToString(), book.Code);
    }

    private async Task<SortedDictionary<int, string>> DiscoverChapterUrlsAsync(BookInfo book)
    {
        var result = new SortedDictionary<int, string>();

        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
            http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");
            var html = await http.GetStringAsync(book.TocUrl);

            var pattern = book.Code.ToLowerInvariant();
            var chapterRegex = new Regex(
                $@"<a\s+href=""([^""]*?-{pattern}-(\d+)\.htm)""",
                RegexOptions.Compiled | RegexOptions.IgnoreCase);

            var matches = chapterRegex.Matches(html);
            foreach (Match m in matches)
            {
                var href = m.Groups[1].Value;
                var chNum = int.Parse(m.Groups[2].Value);
                var fullUrl = href.StartsWith("http") ? href
                    : href.StartsWith("/") ? $"https://ellenwhite.info{href}"
                    : $"https://ellenwhite.info/books/{href}";
                if (!result.ContainsKey(chNum))
                    result[chNum] = fullUrl;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  Warning: could not fetch TOC: {ex.Message}");
        }

        return result;
    }

    private static string ExtractChapterText(string html)
    {
        var text = html;

        text = Regex.Replace(text, @"<script[^>]*>.*?</script>", "", RegexOptions.Singleline | RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"<style[^>]*>.*?</style>", "", RegexOptions.Singleline | RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"<(br|/?p|/?div|/?h[1-6]|/?li|/?blockquote|/?td|/?tr|/?table)[^>]*>", "\n", RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"<[^>]*>", " ");
        text = Regex.Replace(text, @"&nbsp;", " ");
        text = Regex.Replace(text, @"&amp;", "&");
        text = Regex.Replace(text, @"&lt;", "<");
        text = Regex.Replace(text, @"&gt;", ">");
        text = Regex.Replace(text, @"&quot;", "\"");
        text = Regex.Replace(text, @"&#\d+;", " ");
        text = Regex.Replace(text, @"[ \t]+", " ");

        return text.Trim();
    }

    private static Dictionary<int, string> BuildPageTextMap(string fullText, string bookCode)
    {
        var matches = PageMarkerRegex.Matches(fullText)
            .Where(m => m.Groups[1].Value == bookCode)
            .Select(m => (
                Page: int.Parse(m.Groups[2].Value),
                Para: int.Parse(m.Groups[3].Value),
                Index: m.Index,
                Length: m.Length))
            .OrderBy(m => m.Index)
            .ToList();

        if (matches.Count == 0)
        {
            Console.WriteLine("  No {BOOK X.Y} markers found, trying [p. NN] format...");
            matches = PageMarkerBracketRegex.Matches(fullText)
                .Select(m => (
                    Page: int.Parse(m.Groups[1].Value),
                    Para: 0,
                    Index: m.Index,
                    Length: m.Length))
                .OrderBy(m => m.Index)
                .ToList();

            if (matches.Count == 0)
            {
                Console.WriteLine("  No [p. NN] markers found either.");
                return new Dictionary<int, string>();
            }
        }

        Console.WriteLine($"  Found {matches.Count} page markers (p.{matches.First().Page} - p.{matches.Last().Page})");

        var pageGroups = matches
            .GroupBy(m => m.Page)
            .OrderBy(g => g.Key)
            .ToList();

        var result = new Dictionary<int, string>();
        var markersPresent = matches.First().Para > 0;

        for (int i = 0; i < pageGroups.Count; i++)
        {
            var group = pageGroups[i];
            int page = group.Key;

            int pageStart = i > 0
                ? pageGroups[i - 1].OrderBy(m => m.Index).Last().Index + pageGroups[i - 1].OrderBy(m => m.Index).Last().Length
                : group.First().Index;

            if (markersPresent)
            {
                var sortedMarkers = group.OrderBy(m => m.Index).ToList();
                var pageEnd = sortedMarkers[^1].Index;
                if (pageEnd - pageStart <= 0) continue;

                var segments = new List<string>();

                // First segment: from pageStart to the first marker on this page
                {
                    int segEnd = sortedMarkers[0].Index;
                    if (segEnd > pageStart)
                    {
                        var segment = fullText.Substring(pageStart, segEnd - pageStart);
                        segment = InlinePageBreakRegex.Replace(segment, "");
                        segment = WhitespaceRegex.Replace(segment, " ").Trim();
                        if (!string.IsNullOrWhiteSpace(segment))
                        {
                            segments.Add($"{segment} [{sortedMarkers[0].Page}.{sortedMarkers[0].Para}]");
                        }
                    }
                }

                // Remaining segments: between consecutive markers (tagged with the closing marker)
                for (int m = 0; m < sortedMarkers.Count - 1; m++)
                {
                    int segStart = sortedMarkers[m].Index + sortedMarkers[m].Length;
                    int segEnd = sortedMarkers[m + 1].Index;
                    if (segEnd <= segStart) continue;

                    var segment = fullText.Substring(segStart, segEnd - segStart);
                    segment = InlinePageBreakRegex.Replace(segment, "");
                    segment = WhitespaceRegex.Replace(segment, " ").Trim();

                    if (!string.IsNullOrWhiteSpace(segment))
                    {
                        segments.Add($"{segment} [{sortedMarkers[m + 1].Page}.{sortedMarkers[m + 1].Para}]");
                    }
                }

                result[page] = string.Join(" ", segments);
            }
            else
            {
                int pageEnd = i < pageGroups.Count - 1
                    ? pageGroups[i + 1].First().Index
                    : fullText.Length;
                int startPos = group.First().Index + group.First().Length;
                if (pageEnd - startPos <= 0) continue;

                var text = fullText.Substring(startPos, pageEnd - startPos);
                text = PageMarkerBracketRegex.Replace(text, "");
                text = WhitespaceRegex.Replace(text, " ");
                result[page] = text.Trim();
            }
        }

        return result;
    }
}
