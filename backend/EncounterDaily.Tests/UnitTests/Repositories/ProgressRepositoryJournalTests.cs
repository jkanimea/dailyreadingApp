using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Tests.TestHelpers;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class ProgressRepositoryJournalTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public ProgressRepositoryJournalTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        private async Task<(AppDbContext ctx, User user, Series series, List<DailyReading> readings)>
            SeedAsync(AppDbContext context)
        {
            var book = new Book { Title = "Desire of Ages", Author = "EGW" };
            var user = new User { Email = "u@test.com", Provider = "google", ProviderId = "p1", DisplayName = "User" };
            context.Books.Add(book);
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var series = new Series { Name = "Christ The Way", ShortName = "CTW", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var readings = new List<DailyReading>
            {
                new() { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "Mark 1:1", PrimaryBookPageRange = "DA 1-5", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 5 },
                new() { SeriesId = series.Id, Month = 1, Day = 5, BibleReading = "Luke 2:1", PrimaryBookPageRange = "DA 6-10", PrimaryBookPageStart = 6, PrimaryBookPageEnd = 10 },
                new() { SeriesId = series.Id, Month = 2, Day = 1, BibleReading = "John 1:1", PrimaryBookPageRange = "DA 11-15", PrimaryBookPageStart = 11, PrimaryBookPageEnd = 15 },
            };
            context.DailyReadings.AddRange(readings);
            await context.SaveChangesAsync();

            return (context, user, series, readings);
        }

        [Fact]
        public async Task GetJournalEntriesAsync_ShouldReturnOnlyCompletedOrWithNotes()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var (_, user, series, readings) = await SeedAsync(ctx);
            var repo = _fixture.CreateProgressRepository(ctx);

            ctx.UserProgress.AddRange(
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[0].Id, IsCompleted = true },
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[1].Id, IsCompleted = false, Notes = "Has notes" },
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[2].Id, IsCompleted = false }
            );
            await ctx.SaveChangesAsync();

            var result = (await repo.GetJournalEntriesAsync(user.Id, series.Id)).ToList();

            result.Should().HaveCount(2);
            result.Should().NotContain(p => p.DailyReadingId == readings[2].Id);
        }

        [Fact]
        public async Task GetJournalEntriesAsync_ShouldReturnResultsSortedByMonthThenDay()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var (_, user, series, readings) = await SeedAsync(ctx);
            var repo = _fixture.CreateProgressRepository(ctx);

            ctx.UserProgress.AddRange(
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[2].Id, IsCompleted = true },
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[0].Id, IsCompleted = true },
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[1].Id, IsCompleted = true }
            );
            await ctx.SaveChangesAsync();

            var result = (await repo.GetJournalEntriesAsync(user.Id, series.Id)).ToList();

            result[0].DailyReading.Month.Should().Be(1);
            result[0].DailyReading.Day.Should().Be(1);
            result[1].DailyReading.Month.Should().Be(1);
            result[1].DailyReading.Day.Should().Be(5);
            result[2].DailyReading.Month.Should().Be(2);
        }

        [Fact]
        public async Task GetJournalEntriesAsync_ShouldNotReturnOtherUsersEntries()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var (_, user, series, readings) = await SeedAsync(ctx);
            var repo = _fixture.CreateProgressRepository(ctx);

            var otherUser = new User { Email = "other@test.com", Provider = "google", ProviderId = "p2", DisplayName = "Other" };
            ctx.Users.Add(otherUser);
            await ctx.SaveChangesAsync();

            ctx.UserProgress.AddRange(
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[0].Id, IsCompleted = true, Notes = "My note" },
                new UserProgress { UserId = otherUser.Id, SeriesId = series.Id, DailyReadingId = readings[1].Id, IsCompleted = true, Notes = "Other note" }
            );
            await ctx.SaveChangesAsync();

            var result = (await repo.GetJournalEntriesAsync(user.Id, series.Id)).ToList();

            result.Should().HaveCount(1);
            result[0].UserId.Should().Be(user.Id);
        }

        [Fact]
        public async Task GetJournalEntriesAsync_ShouldIncludeNavigationProperties()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var (_, user, series, readings) = await SeedAsync(ctx);
            var repo = _fixture.CreateProgressRepository(ctx);

            ctx.UserProgress.Add(new UserProgress
            {
                UserId = user.Id, SeriesId = series.Id,
                DailyReadingId = readings[0].Id, IsCompleted = true, Notes = "test"
            });
            await ctx.SaveChangesAsync();

            var result = (await repo.GetJournalEntriesAsync(user.Id, series.Id)).ToList();

            result[0].DailyReading.Should().NotBeNull();
            result[0].DailyReading.BibleReading.Should().Be("Mark 1:1");
            result[0].DailyReading.Series.Should().NotBeNull();
            result[0].DailyReading.Series.Name.Should().Be("Christ The Way");
        }
    }
}
