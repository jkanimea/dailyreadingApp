using EncounterDaily.Core.Entities;
using EncounterDaily.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class ProgressRepositoryTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public ProgressRepositoryTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetUserReadingProgressAsync_ShouldReturnProgress()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateProgressRepository(context);

            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = "id1", DisplayName = "User" };
            var book = new Book { Title = "B", Author = "A" };
            context.Users.Add(user);
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var reading = new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "Mark 1:1", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 };
            context.DailyReadings.Add(reading);
            await context.SaveChangesAsync();

            var progress = new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading.Id, IsCompleted = true, CompletedAt = DateTime.UtcNow };
            await repo.AddAsync(progress);
            await context.SaveChangesAsync();

            var result = await repo.GetUserReadingProgressAsync(user.Id, reading.Id);

            result.Should().NotBeNull();
            result!.IsCompleted.Should().BeTrue();
        }

        [Fact]
        public async Task GetUserReadingProgressAsync_ShouldReturnNull_WhenNotFound()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateProgressRepository(context);

            var result = await repo.GetUserReadingProgressAsync(1, 999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetUserProgressForSeriesAsync_ShouldReturnProgress()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateProgressRepository(context);

            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = "id1", DisplayName = "User" };
            var book = new Book { Title = "B", Author = "A" };
            context.Users.Add(user);
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var reading1 = new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "R1", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 };
            var reading2 = new DailyReading { SeriesId = series.Id, Month = 1, Day = 2, BibleReading = "R2", PrimaryBookPageRange = "DA 3-4", PrimaryBookPageStart = 3, PrimaryBookPageEnd = 4 };
            context.DailyReadings.AddRange(reading1, reading2);
            await context.SaveChangesAsync();

            context.UserProgress.AddRange(
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading1.Id, IsCompleted = true },
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading2.Id, IsCompleted = false }
            );
            await context.SaveChangesAsync();

            var result = await repo.GetUserProgressForSeriesAsync(user.Id, series.Id);

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task ResetSeriesAsync_ShouldKeepNotesAndBookmarksByDefault()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateProgressRepository(context);
            var user = new User { Email = "reset@b.com", Provider = "google", ProviderId = "reset", DisplayName = "Reset" };
            var book = new Book { Title = "B", Author = "A" };
            context.Users.Add(user);
            context.Books.Add(book);
            await context.SaveChangesAsync();
            var series = new Series { Name = "Reset", ShortName = "RS", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();
            var reading = new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "R", PrimaryBookPageRange = "P", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 1 };
            context.DailyReadings.Add(reading);
            await context.SaveChangesAsync();
            context.UserProgress.Add(new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading.Id, IsCompleted = true, CompletedAt = DateTime.UtcNow, Notes = "keep" });
            context.UserBookmarks.Add(new UserBookmark { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading.Id });
            await context.SaveChangesAsync();

            await repo.ResetSeriesAsync(user.Id, series.Id, false);
            await context.SaveChangesAsync();

            var progress = await context.UserProgress.SingleAsync();
            progress.IsCompleted.Should().BeFalse();
            progress.CompletedAt.Should().BeNull();
            progress.Notes.Should().Be("keep");
            (await context.UserBookmarks.CountAsync()).Should().Be(1);
        }

        [Fact]
        public async Task ResetSeriesAsync_ShouldDeleteProgressWhenDeleteNotesIsTrue()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateProgressRepository(context);
            var user = new User { Email = "delete@b.com", Provider = "google", ProviderId = "delete", DisplayName = "Delete" };
            var book = new Book { Title = "B", Author = "A" };
            context.Users.Add(user);
            context.Books.Add(book);
            await context.SaveChangesAsync();
            var series = new Series { Name = "Delete", ShortName = "DS", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();
            var reading = new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "R", PrimaryBookPageRange = "P", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 1 };
            context.DailyReadings.Add(reading);
            await context.SaveChangesAsync();
            context.UserProgress.Add(new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading.Id, Notes = "remove" });
            await context.SaveChangesAsync();

            await repo.ResetSeriesAsync(user.Id, series.Id, true);
            await context.SaveChangesAsync();

            (await context.UserProgress.CountAsync()).Should().Be(0);
        }

        [Fact]
        public async Task GetCompletionPercentageAsync_ShouldReturnCorrectPercentage()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateProgressRepository(context);

            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = "id1", DisplayName = "User" };
            var book = new Book { Title = "B", Author = "A" };
            context.Users.Add(user);
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            for (int d = 1; d <= 10; d++)
            {
                var reading = new DailyReading { SeriesId = series.Id, Month = 1, Day = d, BibleReading = $"R{d}", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 };
                context.DailyReadings.Add(reading);
            }
            await context.SaveChangesAsync();

            var allReadings = await context.DailyReadings.Where(r => r.SeriesId == series.Id).ToListAsync();
            for (int i = 0; i < 3; i++)
            {
                context.UserProgress.Add(new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = allReadings[i].Id, IsCompleted = true, CompletedAt = DateTime.UtcNow });
            }
            await context.SaveChangesAsync();

            var percentage = await repo.GetCompletionPercentageAsync(user.Id, series.Id);

            percentage.Should().Be(30.0);
        }

        [Fact]
        public async Task GetCompletionPercentageAsync_ShouldReturnZero_WhenNoReadings()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateProgressRepository(context);

            var result = await repo.GetCompletionPercentageAsync(1, 999);

            result.Should().Be(0.0);
        }

        [Fact]
        public async Task GetStreakAsync_ShouldReturnCorrectStreak()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateProgressRepository(context);

            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = "id1", DisplayName = "User" };
            var book = new Book { Title = "B", Author = "A" };
            context.Users.Add(user);
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var today = DateTime.Today;
            for (int i = 0; i < 5; i++)
            {
                var reading = new DailyReading { SeriesId = series.Id, Month = today.AddDays(-i).Month, Day = today.AddDays(-i).Day, BibleReading = $"R{i}", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 };
                context.DailyReadings.Add(reading);
            }
            await context.SaveChangesAsync();

            var readings = await context.DailyReadings.Where(r => r.SeriesId == series.Id).OrderBy(r => r.Id).ToListAsync();
            for (int i = 0; i < 3; i++)
            {
                context.UserProgress.Add(new UserProgress
                {
                    UserId = user.Id,
                    SeriesId = series.Id,
                    DailyReadingId = readings[i].Id,
                    IsCompleted = true,
                    CompletedAt = today.AddDays(-i)
                });
            }
            await context.SaveChangesAsync();

            var streak = await repo.GetStreakAsync(user.Id, series.Id);

            streak.Should().Be(3);
        }
    }
}
