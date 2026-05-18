using EncounterDaily.Core.Entities;
using EncounterDaily.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class ReadingRepositoryTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public ReadingRepositoryTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetBySeriesDateAsync_ShouldReturnReading()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateReadingRepository(context);

            var book = new Book { Title = "B", Author = "A" };
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var reading = new DailyReading
            {
                SeriesId = series.Id,
                Month = 3,
                Day = 15,
                BibleReading = "John 3:16",
                PrimaryBookPageRange = "DA 1-5",
                PrimaryBookPageStart = 1,
                PrimaryBookPageEnd = 5
            };
            context.DailyReadings.Add(reading);
            await context.SaveChangesAsync();

            var result = await repo.GetBySeriesDateAsync(series.Id, 3, 15);

            result.Should().NotBeNull();
            result!.BibleReading.Should().Be("John 3:16");
        }

        [Fact]
        public async Task GetBySeriesDateAsync_ShouldReturnNull_WhenNotFound()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateReadingRepository(context);

            var result = await repo.GetBySeriesDateAsync(1, 12, 25);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetBySeriesMonthAsync_ShouldReturnReadingsOrderedByDay()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateReadingRepository(context);

            var book = new Book { Title = "B", Author = "A" };
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            context.DailyReadings.AddRange(
                new DailyReading { SeriesId = series.Id, Month = 1, Day = 2, BibleReading = "Day 2", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 },
                new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "Day 1", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 },
                new DailyReading { SeriesId = series.Id, Month = 1, Day = 3, BibleReading = "Day 3", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 }
            );
            await context.SaveChangesAsync();

            var result = await repo.GetBySeriesMonthAsync(series.Id, 1);

            result.Select(r => r.Day).Should().Equal(1, 2, 3);
        }

        [Fact]
        public async Task GetBySeriesYearAsync_ShouldReturnAllReadingsOrdered()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateReadingRepository(context);

            var book = new Book { Title = "B", Author = "A" };
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            context.DailyReadings.AddRange(
                new DailyReading { SeriesId = series.Id, Month = 2, Day = 1, BibleReading = "Feb 1", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 },
                new DailyReading { SeriesId = series.Id, Month = 1, Day = 15, BibleReading = "Jan 15", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 }
            );
            await context.SaveChangesAsync();

            var result = await repo.GetBySeriesYearAsync(series.Id);

            result.Should().HaveCount(2);
            result.First().Month.Should().Be(1);
        }

        [Fact]
        public async Task SearchByTextAsync_ShouldMatchBibleReading()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateReadingRepository(context);

            var book = new Book { Title = "B", Author = "A" };
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            context.DailyReadings.AddRange(
                new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "Mark 1:1", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 },
                new DailyReading { SeriesId = series.Id, Month = 1, Day = 2, BibleReading = "John 3:16", PrimaryBookPageRange = "DA 3-5", PrimaryBookPageStart = 3, PrimaryBookPageEnd = 5 }
            );
            await context.SaveChangesAsync();

            var result = await repo.SearchByTextAsync(series.Id, "Mark");

            result.Should().HaveCount(1);
            result.First().BibleReading.Should().Be("Mark 1:1");
        }

        [Fact]
        public async Task SearchByTextAsync_ShouldReturnEmpty_WhenNoMatch()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateReadingRepository(context);

            var book = new Book { Title = "B", Author = "A" };
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series { Name = "S", ShortName = "S", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            context.DailyReadings.Add(
                new DailyReading { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "Mark 1:1", PrimaryBookPageRange = "DA 1-2", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 2 }
            );
            await context.SaveChangesAsync();

            var result = await repo.SearchByTextAsync(series.Id, "Genesis");

            result.Should().BeEmpty();
        }
    }
}
