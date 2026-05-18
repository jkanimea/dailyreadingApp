using EncounterDaily.Core.Entities;
using EncounterDaily.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class BookmarkRepositoryTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public BookmarkRepositoryTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetUserBookmarksAsync_ShouldReturnBookmarksWithReading()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateBookmarkRepository(context);

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

            context.UserBookmarks.Add(new UserBookmark { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading.Id });
            await context.SaveChangesAsync();

            var result = await repo.GetUserBookmarksAsync(user.Id);

            result.Should().HaveCount(1);
            result.First().DailyReading.Should().NotBeNull();
            result.First().DailyReading!.BibleReading.Should().Be("Mark 1:1");
        }

        [Fact]
        public async Task GetUserBookmarksAsync_ShouldOrderByBookmarkedAtDesc()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateBookmarkRepository(context);

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

            context.UserBookmarks.AddRange(
                new UserBookmark { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading1.Id, BookmarkedAt = new DateTime(2024, 1, 1) },
                new UserBookmark { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading2.Id, BookmarkedAt = new DateTime(2024, 6, 1) }
            );
            await context.SaveChangesAsync();

            var result = await repo.GetUserBookmarksAsync(user.Id);

            result.First().DailyReadingId.Should().Be(reading2.Id);
        }

        [Fact]
        public async Task GetUserBookmarkAsync_ShouldReturnBookmark()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateBookmarkRepository(context);

            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = "id1", DisplayName = "User" };
            var book = new Book { Title = "B", Author = "A" };
            context.Users.Add(user);
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var reading = new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "R1", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 };
            context.DailyReadings.Add(reading);
            await context.SaveChangesAsync();

            context.UserBookmarks.Add(new UserBookmark { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading.Id });
            await context.SaveChangesAsync();

            var result = await repo.GetUserBookmarkAsync(user.Id, reading.Id);

            result.Should().NotBeNull();
        }

        [Fact]
        public async Task GetUserBookmarkAsync_ShouldReturnNull_WhenNotFound()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateBookmarkRepository(context);

            var result = await repo.GetUserBookmarkAsync(1, 999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetUserBookmarksBySeriesAsync_ShouldReturnBookmarks()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateBookmarkRepository(context);

            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = "id1", DisplayName = "User" };
            var book = new Book { Title = "B", Author = "A" };
            context.Users.Add(user);
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var reading = new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "R1", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 };
            context.DailyReadings.Add(reading);
            await context.SaveChangesAsync();

            context.UserBookmarks.Add(new UserBookmark { UserId = user.Id, SeriesId = series.Id, DailyReadingId = reading.Id });
            await context.SaveChangesAsync();

            var result = await repo.GetUserBookmarksBySeriesAsync(user.Id, series.Id);

            result.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetUserBookmarksBySeriesAsync_ShouldReturnEmpty_WhenNoBookmarks()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateBookmarkRepository(context);

            var result = await repo.GetUserBookmarksBySeriesAsync(1, 1);

            result.Should().BeEmpty();
        }
    }
}
