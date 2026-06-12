using EncounterDaily.API.Services;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Enums;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace EncounterDaily.Tests.UnitTests.Services;

[Trait("Category", "Unit")]
public class SeedDataServiceTests : IDisposable
{
    private readonly string _tempSeedDir;

    public SeedDataServiceTests()
    {
        _tempSeedDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_tempSeedDir);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempSeedDir))
            Directory.Delete(_tempSeedDir, recursive: true);
    }

    private static (IServiceProvider provider, AppDbContext context) BuildProvider()
    {
        var dbName = Guid.NewGuid().ToString(); // captured once — all scopes share the same DB
        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(dbName));
        var provider = services.BuildServiceProvider();
        var ctx = provider.GetRequiredService<AppDbContext>();
        return (provider, ctx);
    }

    private static async Task SeedBaseEntitiesAsync(AppDbContext ctx, int seriesId = 1)
    {
        var book = new Book { Id = 1, Title = "Desire of Ages" };
        ctx.Set<Book>().Add(book);

        var series = new Series
        {
            Id = seriesId,
            Name = "Christ The Way",
            ShortName = "ctw",
            Description = "Test",
            SeriesType = SeriesType.ChristTheWay,
            PrimaryBookId = 1,
            SortOrder = 1
        };
        ctx.Set<Series>().Add(series);
        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task UpdateMissingText_ShouldOverwrite_PlaceholderText()
    {
        var (provider, ctx) = BuildProvider();
        await SeedBaseEntitiesAsync(ctx);

        ctx.Set<DailyReading>().Add(new DailyReading
        {
            SeriesId = 1, Month = 6, Day = 12,
            BibleReading = "Matt 1:1",
            PrimaryBookPageRange = "pp. 1-5",
            PrimaryBookPageStart = 1, PrimaryBookPageEnd = 5,
            SortOrder = 101,
            FullTextPrimary = "Sample text from Desire of Ages pages 1-5. This is placeholder content for the daily reading."
        });
        await ctx.SaveChangesAsync();

        var realText = "This is the real EGW text for the reading.";
        var csvPath = Path.Combine(_tempSeedDir, "series-1-readings.csv");
        await File.WriteAllTextAsync(csvPath,
            "SeriesId,Month,Day,BibleReading,PrimaryBookPageRange,PrimaryBookPageStart,PrimaryBookPageEnd," +
            "SecondaryBookPageRange,SecondaryBookPageStart,SecondaryBookPageEnd,SortOrder,FullTextPrimary,FullTextSecondary,SummaryPoints\n" +
            $"1,6,12,Matt 1:1,pp. 1-5,1,5,,,, 101,\"{realText}\",,");

        var scopeFactory = provider.GetRequiredService<IServiceScopeFactory>();
        var svc = new SeedDataService(scopeFactory, NullLogger<SeedDataService>.Instance, _tempSeedDir);

        await svc.StartAsync(CancellationToken.None);

        var updated = await ctx.Set<DailyReading>().AsNoTracking()
            .FirstAsync(r => r.SeriesId == 1 && r.Month == 6 && r.Day == 12);

        updated.FullTextPrimary.Should().Be(realText);
    }

    [Fact]
    public async Task UpdateMissingText_ShouldNotOverwrite_RealText()
    {
        var (provider, ctx) = BuildProvider();
        await SeedBaseEntitiesAsync(ctx);

        var existingRealText = "Existing real EGW content that must not be replaced.";
        ctx.Set<DailyReading>().Add(new DailyReading
        {
            SeriesId = 1, Month = 1, Day = 1,
            BibleReading = "Matt 1:1",
            PrimaryBookPageRange = "pp. 1-5",
            PrimaryBookPageStart = 1, PrimaryBookPageEnd = 5,
            SortOrder = 101,
            FullTextPrimary = existingRealText
        });
        await ctx.SaveChangesAsync();

        var csvPath = Path.Combine(_tempSeedDir, "series-1-readings.csv");
        await File.WriteAllTextAsync(csvPath,
            "SeriesId,Month,Day,BibleReading,PrimaryBookPageRange,PrimaryBookPageStart,PrimaryBookPageEnd," +
            "SecondaryBookPageRange,SecondaryBookPageStart,SecondaryBookPageEnd,SortOrder,FullTextPrimary,FullTextSecondary,SummaryPoints\n" +
            "1,1,1,Matt 1:1,pp. 1-5,1,5,,,,101,\"CSV replacement text\",,");

        var scopeFactory = provider.GetRequiredService<IServiceScopeFactory>();
        var svc = new SeedDataService(scopeFactory, NullLogger<SeedDataService>.Instance, _tempSeedDir);

        await svc.StartAsync(CancellationToken.None);

        var reading = await ctx.Set<DailyReading>().AsNoTracking()
            .FirstAsync(r => r.SeriesId == 1 && r.Month == 1 && r.Day == 1);

        reading.FullTextPrimary.Should().Be(existingRealText);
    }

    [Fact]
    public async Task UpdateMissingText_ShouldFill_NullText()
    {
        var (provider, ctx) = BuildProvider();
        await SeedBaseEntitiesAsync(ctx);

        ctx.Set<DailyReading>().Add(new DailyReading
        {
            SeriesId = 1, Month = 3, Day = 5,
            BibleReading = "Matt 1:1",
            PrimaryBookPageRange = "pp. 10-15",
            PrimaryBookPageStart = 10, PrimaryBookPageEnd = 15,
            SortOrder = 201,
            FullTextPrimary = null
        });
        await ctx.SaveChangesAsync();

        var realText = "Real text for a reading that had no text at all.";
        var csvPath = Path.Combine(_tempSeedDir, "series-1-readings.csv");
        await File.WriteAllTextAsync(csvPath,
            "SeriesId,Month,Day,BibleReading,PrimaryBookPageRange,PrimaryBookPageStart,PrimaryBookPageEnd," +
            "SecondaryBookPageRange,SecondaryBookPageStart,SecondaryBookPageEnd,SortOrder,FullTextPrimary,FullTextSecondary,SummaryPoints\n" +
            $"1,3,5,Matt 1:1,pp. 10-15,10,15,,,,201,\"{realText}\",,");

        var scopeFactory = provider.GetRequiredService<IServiceScopeFactory>();
        var svc = new SeedDataService(scopeFactory, NullLogger<SeedDataService>.Instance, _tempSeedDir);

        await svc.StartAsync(CancellationToken.None);

        var reading = await ctx.Set<DailyReading>().AsNoTracking()
            .FirstAsync(r => r.SeriesId == 1 && r.Month == 3 && r.Day == 5);

        reading.FullTextPrimary.Should().Be(realText);
    }
}
