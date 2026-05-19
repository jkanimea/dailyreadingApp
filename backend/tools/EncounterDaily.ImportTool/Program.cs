using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Enums;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var argsList = args.ToList();
var force = argsList.Remove("--force") || argsList.Remove("-y");
var command = argsList.Count > 0 ? argsList[0] : "help";

switch (command)
{
    case "generate":
        await GenerateSeedCsvAsync(argsList.Count > 1 ? argsList[1] : "seed-data");
        break;
    case "import":
        await ImportCsvAsync(argsList.ElementAtOrDefault(1) ?? "", force);
        break;
    case "seeddata":
        await SeedDatabaseAsync(force);
        break;
    case "summarize":
        await SummarizeCommandAsync(argsList);
        break;
    case "ingesttext":
        await IngestTextCommandAsync(argsList);
        break;
    case "ingestbible":
        await IngestBibleCommandAsync(argsList);
        break;
    default:
        Console.WriteLine("Usage:");
        Console.WriteLine("  dotnet run -- generate [output-dir]");
        Console.WriteLine("  dotnet run -- [--force|-y] import <csv-file>");
        Console.WriteLine("  dotnet run -- [--force|-y] seeddata");
        Console.WriteLine("  dotnet run -- summarize [--dry-run] [--series <id>] [--model <name>] [--delay <ms>]");
        Console.WriteLine("  dotnet run -- ingesttext --book <CODE> [--series <id>] [--max-length <n>] [--delay <ms>] [--dry-run]");
        Console.WriteLine("  dotnet run -- ingestbible [--dry-run]");
        break;
}

static async Task SummarizeCommandAsync(List<string> argsList)
{
    var dryRun = argsList.Remove("--dry-run");
    int? seriesFilter = null;
    string model = "openai/gpt-4o-mini";
    int delayMs = 500;

    for (int i = 1; i < argsList.Count; i++)
    {
        if (argsList[i] == "--series" && i + 1 < argsList.Count)
            seriesFilter = int.Parse(argsList[++i]);
        else if (argsList[i] == "--model" && i + 1 < argsList.Count)
            model = argsList[++i];
        else if (argsList[i] == "--delay" && i + 1 < argsList.Count)
            delayMs = int.Parse(argsList[++i]);
    }

    var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
        ?? "Server=(localdb)\\mssqllocaldb;Database=EncounterDaily;Trusted_Connection=True;";

    var apiKey = Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")
        ?? throw new InvalidOperationException("OPENROUTER_API_KEY environment variable is not set.");

    var cmd = new SummarizeCommand(connectionString, apiKey, model, delayMs, dryRun, seriesFilter);
    int errors = await cmd.ExecuteAsync();
    Environment.ExitCode = errors > 0 ? 1 : 0;
}

static async Task IngestTextCommandAsync(List<string> argsList)
{
    var bookCode = "ALL";
    int? seriesFilter = null;
    int maxTextLength = 20000;
    int delayMs = 1000;
    var dryRun = argsList.Remove("--dry-run");

    for (int i = 0; i < argsList.Count; i++)
    {
        if (argsList[i] == "--book" && i + 1 < argsList.Count)
            bookCode = argsList[++i];
        else if (argsList[i] == "--series" && i + 1 < argsList.Count)
            seriesFilter = int.Parse(argsList[++i]);
        else if (argsList[i] == "--max-length" && i + 1 < argsList.Count)
            maxTextLength = int.Parse(argsList[++i]);
        else if (argsList[i] == "--delay" && i + 1 < argsList.Count)
            delayMs = int.Parse(argsList[++i]);
    }

    var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
        ?? "Server=(localdb)\\mssqllocaldb;Database=EncounterDaily;Trusted_Connection=True;";

    var cmd = new IngestTextCommand(connectionString, bookCode, seriesFilter, dryRun, maxTextLength, delayMs);
    int exitCode = await cmd.ExecuteAsync();
    Environment.ExitCode = exitCode;
}

static Task GenerateSeedCsvAsync(string outputDir)
{
    Directory.CreateDirectory(outputDir);

    var seriesConfigs = new List<SeriesConfigInfo>
    {
        new(1, "Christ The Way", "Desire of Ages", null, 900, null),
        new(2, "Christ The Church", "Acts of the Apostles", "The Great Controversy", 600, 700),
        new(3, "Christ Our Redemption", "Patriarchs and Prophets", null, 800, null),
        new(4, "Christ Our Hope", "Prophets and Kings", null, 750, null)
    };

    foreach (var series in seriesConfigs)
    {
        var records = new List<CsvReadingRecord>();
        var rng = new Random(series.SeriesId);
        var daysPerMonth = new int[] { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
        int page = 1;

        for (int month = 1; month <= 12; month++)
        {
            int daysInMonth = daysPerMonth[month - 1];
            for (int day = 1; day <= daysInMonth; day++)
            {
                int pageEnd = Math.Min(page + rng.Next(3, 6), series.Pages);
                string bibleRef = series.SeriesId switch
                {
                    1 => $"Matt {rng.Next(1, 28)}:{rng.Next(1, 20)}",
                    2 => $"Acts {rng.Next(1, 28)}:{rng.Next(1, 20)}",
                    3 => $"Gen {rng.Next(1, 50)}:{rng.Next(1, 20)}",
                    4 => $"1 Kings {rng.Next(1, 22)}:{rng.Next(1, 20)}",
                    _ => "Psalm 119:105"
                };

                records.Add(new CsvReadingRecord
                {
                    SeriesId = series.SeriesId,
                    Month = month,
                    Day = day,
                    BibleReading = bibleRef,
                    PrimaryBookPageRange = $"{series.PrimaryBook} pp. {page}-{pageEnd}",
                    PrimaryBookPageStart = page,
                    PrimaryBookPageEnd = pageEnd,
                    SortOrder = (month * 100) + day,
                    FullTextPrimary = $"Sample text from {series.PrimaryBook} pages {page}-{pageEnd}. This is placeholder content for the daily reading.",
                    SummaryPoints = $"- Reading covers {series.PrimaryBook} pages {page}-{pageEnd}\n- Key theme: Faith and obedience\n- Application: Reflect on God's guidance"
                });

                if (series.SecondaryBook != null && series.PagesSecondary.HasValue)
                {
                    int secPage = rng.Next(1, series.PagesSecondary.Value);
                    int secPageEnd = Math.Min(secPage + rng.Next(2, 4), series.PagesSecondary.Value);
                    records[^1].SecondaryBookPageRange = $"{series.SecondaryBook} pp. {secPage}-{secPageEnd}";
                    records[^1].SecondaryBookPageStart = secPage;
                    records[^1].SecondaryBookPageEnd = secPageEnd;
                    records[^1].FullTextSecondary = $"Sample text from {series.SecondaryBook} pages {secPage}-{secPageEnd}.";
                }

                page = pageEnd + 1;
                if (page > series.Pages) page = 1;
            }
        }

        var csvPath = Path.Combine(outputDir, $"series-{series.SeriesId}-readings.csv");
        using var writer = new StreamWriter(csvPath);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        csv.WriteRecords(records);
        Console.WriteLine($"Generated {csvPath} ({records.Count} readings)");
    }

    return Task.CompletedTask;
}

static async Task ImportCsvAsync(string csvPath, bool force)
{
    if (!File.Exists(csvPath))
    {
        Console.Error.WriteLine($"File not found: {csvPath}");
        return;
    }

    var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
        ?? "Server=(localdb)\\mssqllocaldb;Database=EncounterDaily;Trusted_Connection=True;";

    var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
    optionsBuilder.UseSqlServer(connectionString);

    using var context = new AppDbContext(optionsBuilder.Options);
    await context.Database.EnsureCreatedAsync();

    using var reader = new StreamReader(csvPath);
    using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
    {
        HeaderValidated = null,
        MissingFieldFound = null
    });

    var records = csv.GetRecords<CsvReadingRecord>().ToList();
    Console.WriteLine($"Read {records.Count} records from CSV");

    var seriesId = records[0].SeriesId;
    var existingCount = await context.Set<DailyReading>().CountAsync(r => r.SeriesId == seriesId);
    if (existingCount > 0 && !force)
    {
        Console.Write($"Series {seriesId} already has {existingCount} readings. Overwrite? (y/N): ");
        var response = Console.ReadLine()?.Trim().ToLower();
        if (response != "y" && response != "yes")
        {
            Console.WriteLine("Import cancelled.");
            return;
        }
        context.Set<DailyReading>().RemoveRange(context.Set<DailyReading>().Where(r => r.SeriesId == seriesId));
    }
    else if (existingCount > 0)
    {
        context.Set<DailyReading>().RemoveRange(context.Set<DailyReading>().Where(r => r.SeriesId == seriesId));
    }

    foreach (var record in records)
    {
        context.Set<DailyReading>().Add(new DailyReading
        {
            SeriesId = record.SeriesId,
            Month = record.Month,
            Day = record.Day,
            BibleReading = record.BibleReading,
            PrimaryBookPageRange = record.PrimaryBookPageRange,
            PrimaryBookPageStart = record.PrimaryBookPageStart,
            PrimaryBookPageEnd = record.PrimaryBookPageEnd,
            SecondaryBookPageRange = record.SecondaryBookPageRange,
            SecondaryBookPageStart = record.SecondaryBookPageStart,
            SecondaryBookPageEnd = record.SecondaryBookPageEnd,
            FullTextPrimary = record.FullTextPrimary,
            FullTextSecondary = record.FullTextSecondary,
            SummaryPoints = record.SummaryPoints,
            SortOrder = record.SortOrder
        });
    }

    await context.SaveChangesAsync();
    Console.WriteLine($"Imported {records.Count} readings for series {seriesId}");
}

static async Task SeedDatabaseAsync(bool force)
{
    var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
        ?? "Server=(localdb)\\mssqllocaldb;Database=EncounterDaily;Trusted_Connection=True;";

    var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
    optionsBuilder.UseSqlServer(connectionString);

    using var context = new AppDbContext(optionsBuilder.Options);

    if (force)
    {
        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();
    }
    else
    {
        await context.Database.EnsureCreatedAsync();
        if (await context.Set<Book>().AnyAsync())
        {
            Console.WriteLine("Database already seeded. Use --force to re-seed.");
            return;
        }
    }

    var books = new List<Book>
    {
        new() { Title = "Desire of Ages", Author = "Ellen G. White", BookType = BookType.DesireOfAges, PageCount = 900, FullTextSource = "elllenwhite.info" },
        new() { Title = "Acts of the Apostles", Author = "Ellen G. White", BookType = BookType.ActsOfTheApostles, PageCount = 600, FullTextSource = "elllenwhite.info" },
        new() { Title = "The Great Controversy", Author = "Ellen G. White", BookType = BookType.GreatControversy, PageCount = 700, FullTextSource = "elllenwhite.info" },
        new() { Title = "Patriarchs and Prophets", Author = "Ellen G. White", BookType = BookType.PatriarchsAndProphets, PageCount = 800, FullTextSource = "elllenwhite.info" },
        new() { Title = "Prophets and Kings", Author = "Ellen G. White", BookType = BookType.ProphetsAndKings, PageCount = 750, FullTextSource = "elllenwhite.info" },
    };
    context.Set<Book>().AddRange(books);
    await context.SaveChangesAsync();

    var da = books[0].Id;
    var aa = books[1].Id;
    var gc = books[2].Id;
    var pp = books[3].Id;
    var pk = books[4].Id;

    var seriesList = new List<Series>
    {
        new() { Name = "Christ The Way", ShortName = "ctw", Description = "Daily readings from Desire of Ages", SeriesType = SeriesType.ChristTheWay, PrimaryBookId = da, SortOrder = 1 },
        new() { Name = "Christ The Church", ShortName = "ctc", Description = "Daily readings from Acts of the Apostles and Great Controversy", SeriesType = SeriesType.ChristTheChurch, PrimaryBookId = aa, SecondaryBookId = gc, SortOrder = 2 },
        new() { Name = "Christ Our Redemption", ShortName = "cor", Description = "Daily readings from Patriarchs and Prophets", SeriesType = SeriesType.ChristOurRedemption, PrimaryBookId = pp, SortOrder = 3 },
        new() { Name = "Christ Our Hope", ShortName = "coh", Description = "Daily readings from Prophets and Kings", SeriesType = SeriesType.ChristOurHope, PrimaryBookId = pk, SortOrder = 4 },
    };
    context.Set<Series>().AddRange(seriesList);
    await context.SaveChangesAsync();

    var seedDir = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..", "database", "seed-data");
    if (!Directory.Exists(seedDir))
        seedDir = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "seed-data");
    if (!Directory.Exists(seedDir))
        seedDir = "seed-data";

    int total = 0;
    foreach (var series in seriesList)
    {
        var csvPath = Path.Combine(seedDir, $"series-{series.Id}-readings.csv");
        if (!File.Exists(csvPath))
        {
            Console.WriteLine($"  CSV not found: {csvPath}");
            continue;
        }

        using var reader = new StreamReader(csvPath);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HeaderValidated = null,
            MissingFieldFound = null
        });

        var records = csv.GetRecords<CsvReadingRecord>().ToList();
        foreach (var record in records)
        {
            context.Set<DailyReading>().Add(new DailyReading
            {
                SeriesId = series.Id,
                Month = record.Month,
                Day = record.Day,
                BibleReading = record.BibleReading,
                PrimaryBookPageRange = record.PrimaryBookPageRange,
                PrimaryBookPageStart = record.PrimaryBookPageStart,
                PrimaryBookPageEnd = record.PrimaryBookPageEnd,
                SecondaryBookPageRange = record.SecondaryBookPageRange,
                SecondaryBookPageStart = record.SecondaryBookPageStart,
                SecondaryBookPageEnd = record.SecondaryBookPageEnd,
                FullTextPrimary = record.FullTextPrimary,
                FullTextSecondary = record.FullTextSecondary,
                SummaryPoints = record.SummaryPoints,
                SortOrder = record.SortOrder
            });
        }
        total += records.Count;
        Console.WriteLine($"  Imported series \"{series.Name}\": {records.Count} readings");
    }

    await context.SaveChangesAsync();
    Console.WriteLine($"Seeded database: {books.Count} books, {seriesList.Count} series, {total} daily readings");
}

static async Task IngestBibleCommandAsync(List<string> argsList)
{
    var dryRun = argsList.Remove("--dry-run");

    var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
        ?? "Server=(localdb)\\mssqllocaldb;Database=EncounterDaily;Trusted_Connection=True;";

    var cmd = new IngestBibleCommand(connectionString, dryRun);
    int exitCode = await cmd.ExecuteAsync();
    Environment.ExitCode = exitCode;
}

public record SeriesConfigInfo(int SeriesId, string Name, string PrimaryBook, string? SecondaryBook, int Pages, int? PagesSecondary);

public class CsvReadingRecord
{
    public int SeriesId { get; set; }
    public int Month { get; set; }
    public int Day { get; set; }
    public string BibleReading { get; set; } = string.Empty;
    public string PrimaryBookPageRange { get; set; } = string.Empty;
    public int PrimaryBookPageStart { get; set; }
    public int PrimaryBookPageEnd { get; set; }
    public string? SecondaryBookPageRange { get; set; }
    public int? SecondaryBookPageStart { get; set; }
    public int? SecondaryBookPageEnd { get; set; }
    public int SortOrder { get; set; }
    public string? FullTextPrimary { get; set; }
    public string? FullTextSecondary { get; set; }
    public string? SummaryPoints { get; set; }
}
