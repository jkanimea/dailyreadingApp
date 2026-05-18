using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Repositories;
using EncounterDaily.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class SeriesRepositoryTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public SeriesRepositoryTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAllSeriesWithBooksAsync_ShouldIncludePrimaryAndSecondaryBooks()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateSeriesRepository(context);

            var book1 = new Book { Title = "Book A", Author = "Author" };
            var book2 = new Book { Title = "Book B", Author = "Author" };
            context.Books.AddRange(book1, book2);
            await context.SaveChangesAsync();

            var series = new Series
            {
                Name = "Test Series",
                ShortName = "TS",
                PrimaryBookId = book1.Id,
                SecondaryBookId = book2.Id,
                SortOrder = 1
            };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var result = await repo.GetAllSeriesWithBooksAsync();

            result.Should().HaveCount(1);
            var loaded = result.First();
            loaded.PrimaryBook.Should().NotBeNull();
            loaded.PrimaryBook!.Title.Should().Be("Book A");
            loaded.SecondaryBook.Should().NotBeNull();
            loaded.SecondaryBook!.Title.Should().Be("Book B");
        }

        [Fact]
        public async Task GetAllSeriesWithBooksAsync_ShouldOrderBySortOrder()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateSeriesRepository(context);

            var book = new Book { Title = "Book", Author = "Author" };
            context.Books.Add(book);
            await context.SaveChangesAsync();

            context.Series.AddRange(
                new Series { Name = "Second", ShortName = "S2", PrimaryBookId = book.Id, SortOrder = 2 },
                new Series { Name = "First", ShortName = "S1", PrimaryBookId = book.Id, SortOrder = 1 }
            );
            await context.SaveChangesAsync();

            var result = await repo.GetAllSeriesWithBooksAsync();

            result.Select(s => s.Name).Should().Equal("First", "Second");
        }

        [Fact]
        public async Task GetSeriesWithBooksAsync_ShouldReturnNull_WhenNotFound()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateSeriesRepository(context);

            var result = await repo.GetSeriesWithBooksAsync(999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetSeriesWithBooksAsync_ShouldIncludeBooks()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateSeriesRepository(context);

            var book = new Book { Title = "Primary Book", Author = "Author" };
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var series = new Series
            {
                Name = "Test",
                ShortName = "T",
                PrimaryBookId = book.Id,
                SortOrder = 1
            };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var result = await repo.GetSeriesWithBooksAsync(series.Id);

            result.Should().NotBeNull();
            result!.PrimaryBook.Should().NotBeNull();
            result.PrimaryBook!.Title.Should().Be("Primary Book");
        }
    }
}
