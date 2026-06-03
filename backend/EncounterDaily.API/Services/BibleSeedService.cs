using System.Text.Json;
using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.API.Services;

public class BibleSeedService : IHostedService, IBibleSeedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BibleSeedService> _logger;

    private static readonly HttpClient _http = new()
    {
        Timeout = TimeSpan.FromMinutes(5)
    };

    private static readonly Dictionary<string, string> TranslationUrls = new()
    {
        ["KJV"] = "https://raw.githubusercontent.com/Amosamevor/Bible-json/main/versions/en/KING%20JAMES%20BIBLE.json",
        ["ASV"] = "https://raw.githubusercontent.com/Amosamevor/Bible-json/main/versions/en/AMERICAN%20STANDARD%20VERSION.json",
        ["WEB"] = "https://raw.githubusercontent.com/Amosamevor/Bible-json/main/versions/en/WORLD%20ENGLISH%20BIBLE.json"
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
        await SeedMissingTranslationsCoreAsync(context, cancellationToken);
    }

    public async Task SeedMissingTranslationsAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedMissingTranslationsCoreAsync(context, cancellationToken);
    }

    private async Task SeedMissingTranslationsCoreAsync(AppDbContext context, CancellationToken cancellationToken)
    {
        foreach (var (translation, url) in TranslationUrls)
        {
            bool alreadySeeded = await context.Set<BibleVerse>()
                .AnyAsync(v => v.Translation == translation, cancellationToken);

            if (alreadySeeded)
            {
                _logger.LogInformation("{Translation} Bible already seeded. Skipping.", translation);
                continue;
            }

            await SeedWithRetryAsync(context, translation, url, cancellationToken);
        }
    }

    private async Task SeedWithRetryAsync(AppDbContext context, string translation, string url, CancellationToken cancellationToken, int maxRetries = 3)
    {
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                _logger.LogInformation("Downloading {Translation} Bible data (attempt {Attempt}/{MaxRetries})...", translation, attempt, maxRetries);
                await SeedTranslationAsync(context, translation, url, cancellationToken);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to seed {Translation} Bible data (attempt {Attempt}/{MaxRetries}).", translation, attempt, maxRetries);
                if (attempt < maxRetries)
                {
                    var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                    _logger.LogInformation("Retrying {Translation} in {DelaySeconds}s...", translation, delay.TotalSeconds);
                    await Task.Delay(delay, cancellationToken);
                }
            }
        }
    }

    private async Task SeedTranslationAsync(AppDbContext context, string translation, string url, CancellationToken cancellationToken)
    {
        var json = await _http.GetStringAsync(url, cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var existingBooks = await context.Set<BibleBook>()
            .ToDictionaryAsync(b => b.Name, cancellationToken);

        int totalVerses = 0;
        foreach (var bookEntry in root.EnumerateObject())
        {
            var bookName = bookEntry.Name;
            var chaptersEl = bookEntry.Value;

            if (!existingBooks.TryGetValue(bookName, out var bookEntity))
            {
                short chapterCount = 0;
                foreach (var ch in chaptersEl.EnumerateObject())
                {
                    var chNum = short.Parse(ch.Name);
                    if (chNum > chapterCount) chapterCount = chNum;
                }

                bookEntity = new BibleBook
                {
                    Name = bookName,
                    Abbreviation = bookName,
                    ChapterCount = chapterCount
                };
                context.Set<BibleBook>().Add(bookEntity);
                await context.SaveChangesAsync(cancellationToken);
                existingBooks[bookName] = bookEntity;
            }

            var verses = new List<BibleVerse>();

            foreach (var chapterEntry in chaptersEl.EnumerateObject())
            {
                var chapterNum = short.Parse(chapterEntry.Name);
                var versesEl = chapterEntry.Value;

                foreach (var verseEntry in versesEl.EnumerateObject())
                {
                    var verseNum = short.Parse(verseEntry.Name);
                    var text = verseEntry.Value.GetString() ?? "";
                    text = System.Text.RegularExpressions.Regex.Replace(text, @"\{[^}]*\}", "");
                    text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ").Trim();

                    verses.Add(new BibleVerse
                    {
                        BookId = bookEntity.Id,
                        Chapter = chapterNum,
                        Verse = verseNum,
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
