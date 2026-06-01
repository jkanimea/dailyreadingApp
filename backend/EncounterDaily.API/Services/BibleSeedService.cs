using System.Text.Json;
using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.API.Services;

public class BibleSeedService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BibleSeedService> _logger;

    private static readonly HttpClient _http = new();

    private static readonly Dictionary<string, string> TranslationUrls = new()
    {
        ["KJV"] = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json",
        ["ASV"] = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_asv.json",
        ["WEB"] = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_web.json"
    };

    private static readonly Dictionary<string, string> AbbrevToName = new()
    {
        ["gn"] = "Genesis", ["ex"] = "Exodus", ["lv"] = "Leviticus", ["nm"] = "Numbers",
        ["dt"] = "Deuteronomy", ["js"] = "Joshua", ["jud"] = "Judges", ["rt"] = "Ruth",
        ["1sm"] = "1 Samuel", ["2sm"] = "2 Samuel", ["1kgs"] = "1 Kings", ["2kgs"] = "2 Kings",
        ["1ch"] = "1 Chronicles", ["2ch"] = "2 Chronicles", ["ezr"] = "Ezra", ["ne"] = "Nehemiah",
        ["et"] = "Esther", ["job"] = "Job", ["ps"] = "Psalms", ["prv"] = "Proverbs",
        ["ec"] = "Ecclesiastes", ["so"] = "Song of Solomon", ["is"] = "Isaiah", ["jr"] = "Jeremiah",
        ["lm"] = "Lamentations", ["ez"] = "Ezekiel", ["dn"] = "Daniel", ["ho"] = "Hosea",
        ["jl"] = "Joel", ["am"] = "Amos", ["ob"] = "Obadiah", ["jn"] = "Jonah",
        ["mi"] = "Micah", ["na"] = "Nahum", ["hk"] = "Habakkuk", ["zp"] = "Zephaniah",
        ["hg"] = "Haggai", ["zc"] = "Zechariah", ["ml"] = "Malachi",
        ["mt"] = "Matthew", ["mk"] = "Mark", ["lk"] = "Luke", ["jo"] = "John",
        ["act"] = "Acts", ["rm"] = "Romans", ["1co"] = "1 Corinthians", ["2co"] = "2 Corinthians",
        ["gl"] = "Galatians", ["eph"] = "Ephesians", ["ph"] = "Philippians", ["cl"] = "Colossians",
        ["1ts"] = "1 Thessalonians", ["2ts"] = "2 Thessalonians", ["1tm"] = "1 Timothy",
        ["2tm"] = "2 Timothy", ["tt"] = "Titus", ["phm"] = "Philemon", ["hb"] = "Hebrews",
        ["jm"] = "James", ["1pe"] = "1 Peter", ["2pe"] = "2 Peter", ["1jo"] = "1 John",
        ["2jo"] = "2 John", ["3jo"] = "3 John", ["jd"] = "Jude", ["re"] = "Revelation"
    };

    public BibleSeedService(IServiceScopeFactory scopeFactory, ILogger<BibleSeedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await context.Database.EnsureCreatedAsync(cancellationToken);

        foreach (var (translation, url) in TranslationUrls)
        {
            bool alreadySeeded = await context.Set<BibleVerse>()
                .AnyAsync(v => v.Translation == translation, cancellationToken);

            if (alreadySeeded)
            {
                _logger.LogInformation("{Translation} Bible already seeded. Skipping.", translation);
                continue;
            }

            _logger.LogInformation("Downloading {Translation} Bible data...", translation);
            try
            {
                await SeedTranslationAsync(context, translation, url, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to seed {Translation} Bible data.", translation);
            }
        }
    }

    private async Task SeedTranslationAsync(AppDbContext context, string translation, string url, CancellationToken cancellationToken)
    {
        var json = await _http.GetStringAsync(url, cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Load existing books once — shared across all translations
        var existingBooks = await context.Set<BibleBook>()
            .ToDictionaryAsync(b => b.Abbreviation, cancellationToken);

        int totalVerses = 0;
        foreach (var bookEl in root.EnumerateArray())
        {
            var abbrev = bookEl.GetProperty("abbrev").GetString() ?? "";
            if (!AbbrevToName.TryGetValue(abbrev, out var bookName))
            {
                _logger.LogWarning("Skipping unknown abbreviation: {Abbrev}", abbrev);
                continue;
            }

            // Reuse existing BibleBook or create it
            if (!existingBooks.TryGetValue(abbrev, out var bookEntity))
            {
                bookEntity = new BibleBook
                {
                    Name = bookName,
                    Abbreviation = abbrev,
                    ChapterCount = (short)bookEl.GetProperty("chapters").GetArrayLength()
                };
                context.Set<BibleBook>().Add(bookEntity);
                await context.SaveChangesAsync(cancellationToken);
                existingBooks[abbrev] = bookEntity;
            }

            var chapters = bookEl.GetProperty("chapters");
            var verses = new List<BibleVerse>();

            for (int ch = 0; ch < chapters.GetArrayLength(); ch++)
            {
                var chapter = chapters[ch];
                for (int v = 0; v < chapter.GetArrayLength(); v++)
                {
                    var text = chapter[v].GetString() ?? "";
                    text = System.Text.RegularExpressions.Regex.Replace(text, @"\{[^}]*\}", "");
                    text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ").Trim();

                    verses.Add(new BibleVerse
                    {
                        BookId = bookEntity.Id,
                        Chapter = (short)(ch + 1),
                        Verse = (short)(v + 1),
                        Translation = translation,
                        Text = text
                    });
                }
            }

            context.Set<BibleVerse>().AddRange(verses);
            totalVerses += verses.Count;
            _logger.LogInformation("  [{Translation}] {Book}: {Verses} verses", translation, bookName, verses.Count);
        }

        await context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("{Translation} seed complete: {TotalVerses} total verses", translation, totalVerses);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
