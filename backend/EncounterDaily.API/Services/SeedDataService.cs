using System.Globalization;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Enums;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.API.Services;

public class SeedDataService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SeedDataService> _logger;
    private readonly string _seedDir;

    public SeedDataService(IServiceScopeFactory scopeFactory, ILogger<SeedDataService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _seedDir = Path.Combine(AppContext.BaseDirectory, "seed-data");
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await context.Database.EnsureCreatedAsync(cancellationToken);

        if (!await context.Set<Book>().AnyAsync(cancellationToken))
        {
            await SeedBooksAsync(context, cancellationToken);
            await SeedSeriesAsync(context, cancellationToken);
            await SeedDailyReadingsAsync(context, cancellationToken);
            _logger.LogInformation("Seed complete: books, series, and daily readings populated.");
        }
        else
        {
            _logger.LogInformation("Database already seeded. Skipping.");
        }
    }

    private async Task SeedBooksAsync(AppDbContext context, CancellationToken ct)
    {
        var books = new List<Book>
        {
            new() { Title = "Desire of Ages", Author = "Ellen G. White", BookType = BookType.DesireOfAges, PageCount = 900, FullTextSource = "elllenwhite.info" },
            new() { Title = "Acts of the Apostles", Author = "Ellen G. White", BookType = BookType.ActsOfTheApostles, PageCount = 600, FullTextSource = "elllenwhite.info" },
            new() { Title = "The Great Controversy", Author = "Ellen G. White", BookType = BookType.GreatControversy, PageCount = 700, FullTextSource = "elllenwhite.info" },
            new() { Title = "Patriarchs and Prophets", Author = "Ellen G. White", BookType = BookType.PatriarchsAndProphets, PageCount = 800, FullTextSource = "elllenwhite.info" },
            new() { Title = "Prophets and Kings", Author = "Ellen G. White", BookType = BookType.ProphetsAndKings, PageCount = 750, FullTextSource = "elllenwhite.info" },
        };
        context.Set<Book>().AddRange(books);
        await context.SaveChangesAsync(ct);
        _logger.LogInformation("Seeded {Count} EGW books.", books.Count);
    }

    private async Task SeedSeriesAsync(AppDbContext context, CancellationToken ct)
    {
        var books = await context.Set<Book>().ToListAsync(ct);
        var bookMap = books.ToDictionary(b => b.Title, b => b.Id);

        var seriesList = new List<Series>
        {
            new() { Name = "Christ The Way", ShortName = "ctw", Description = "Daily readings from Desire of Ages", SeriesType = SeriesType.ChristTheWay, PrimaryBookId = bookMap["Desire of Ages"], SortOrder = 1 },
            new() { Name = "Christ The Church", ShortName = "ctc", Description = "Daily readings from Acts of the Apostles and Great Controversy", SeriesType = SeriesType.ChristTheChurch, PrimaryBookId = bookMap["Acts of the Apostles"], SecondaryBookId = bookMap["The Great Controversy"], SortOrder = 2 },
            new() { Name = "Christ Our Redemption", ShortName = "cor", Description = "Daily readings from Patriarchs and Prophets", SeriesType = SeriesType.ChristOurRedemption, PrimaryBookId = bookMap["Patriarchs and Prophets"], SortOrder = 3 },
            new() { Name = "Christ Our Hope", ShortName = "coh", Description = "Daily readings from Prophets and Kings", SeriesType = SeriesType.ChristOurHope, PrimaryBookId = bookMap["Prophets and Kings"], SortOrder = 4 },
        };
        context.Set<Series>().AddRange(seriesList);
        await context.SaveChangesAsync(ct);
        _logger.LogInformation("Seeded {Count} series.", seriesList.Count);
    }

    private async Task SeedDailyReadingsAsync(AppDbContext context, CancellationToken ct)
    {
        var seriesList = await context.Set<Series>().OrderBy(s => s.Id).ToListAsync(ct);
        int total = 0;

        foreach (var series in seriesList)
        {
            var csvPath = Path.Combine(_seedDir, $"series-{series.Id}-readings.csv");
            if (!File.Exists(csvPath))
            {
                _logger.LogWarning("CSV not found: {Path}", csvPath);
                continue;
            }

            var lines = await File.ReadAllLinesAsync(csvPath, ct);
            var readings = new List<DailyReading>();

            foreach (var line in lines.Skip(1))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                var fields = ParseCsvLine(line);
                if (fields.Count < 7) continue;

                readings.Add(new DailyReading
                {
                    SeriesId = series.Id,
                    Month = int.Parse(fields[1]),
                    Day = int.Parse(fields[2]),
                    BibleReading = fields[3],
                    PrimaryBookPageRange = fields[4],
                    PrimaryBookPageStart = int.Parse(fields[5]),
                    PrimaryBookPageEnd = int.Parse(fields[6]),
                    SecondaryBookPageRange = fields.Count > 7 ? fields[7] : null,
                    SecondaryBookPageStart = fields.Count > 8 && !string.IsNullOrEmpty(fields[8]) ? int.Parse(fields[8]) : null,
                    SecondaryBookPageEnd = fields.Count > 9 && !string.IsNullOrEmpty(fields[9]) ? int.Parse(fields[9]) : null,
                    SortOrder = fields.Count > 10 ? int.Parse(fields[10]) : 0,
                    FullTextPrimary = fields.Count > 11 ? fields[11] : null,
                    FullTextSecondary = fields.Count > 12 ? fields[12] : null,
                    SummaryPoints = fields.Count > 13 ? fields[13] : null
                });
            }

            context.Set<DailyReading>().AddRange(readings);
            total += readings.Count;
            _logger.LogInformation("  Series {Name}: {Count} readings", series.Name, readings.Count);
        }

        await context.SaveChangesAsync(ct);
        _logger.LogInformation("Seeded {Total} daily readings across {Series} series.", total, seriesList.Count);
    }

    private static List<string> ParseCsvLine(string line)
    {
        var result = new List<string>();
        var current = new System.Text.StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            if (line[i] == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (line[i] == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(line[i]);
            }
        }
        result.Add(current.ToString());
        return result;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
