using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Enums;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class ReadingServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IRepository<DailyReading>> _mockRepo;
        private readonly Mock<IReadingRepository> _mockReadingRepo;
        private readonly IReadingService _service;

        public ReadingServiceTests()
        {
            _mockRepo = new Mock<IRepository<DailyReading>>();
            _mockReadingRepo = new Mock<IReadingRepository>();
            _mockUow = new Mock<IUnitOfWork>();
            _mockUow.Setup(u => u.Repository<DailyReading>()).Returns(_mockRepo.Object);
            _mockUow.Setup(u => u.Readings).Returns(_mockReadingRepo.Object);
            _service = new ReadingService(_mockUow.Object);
        }

        [Fact]
        public async Task GetBySeriesDateAsync_ShouldReturnReading()
        {
            var reading = new DailyReading { Id = 1, SeriesId = 1, Month = 1, Day = 1 };
            _mockReadingRepo.Setup(r => r.GetBySeriesDateAsync(1, 1, 1)).ReturnsAsync(reading);

            var result = await _service.GetBySeriesDateAsync(1, 1, 1);

            result.Should().NotBeNull();
            result!.Id.Should().Be(1);
        }

        [Fact]
        public async Task GetBySeriesDateAsync_ShouldReturnNull_WhenNotFound()
        {
            _mockReadingRepo.Setup(r => r.GetBySeriesDateAsync(1, 2, 30)).ReturnsAsync((DailyReading?)null);

            var result = await _service.GetBySeriesDateAsync(1, 2, 30);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetBySeriesMonthAsync_ShouldReturnReadings()
        {
            var readings = new List<DailyReading>
            {
                new DailyReading { Id = 1, Day = 1 },
                new DailyReading { Id = 2, Day = 2 }
            };
            _mockReadingRepo.Setup(r => r.GetBySeriesMonthAsync(1, 1)).ReturnsAsync(readings);

            var result = await _service.GetBySeriesMonthAsync(1, 1);

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetBySeriesYearAsync_ShouldReturnAllYearReadings()
        {
            var readings = new List<DailyReading> { new DailyReading { Id = 1 } };
            _mockReadingRepo.Setup(r => r.GetBySeriesYearAsync(1)).ReturnsAsync(readings);

            var result = await _service.GetBySeriesYearAsync(1);

            result.Should().HaveCount(1);
        }

        [Fact]
        public async Task SearchByTextAsync_ShouldReturnMatchingReadings()
        {
            var readings = new List<DailyReading> { new DailyReading { Id = 1, BibleReading = "Mark 1:1" } };
            _mockReadingRepo.Setup(r => r.SearchByTextAsync(1, "Mark")).ReturnsAsync(readings);

            var result = await _service.SearchByTextAsync(1, "Mark");

            result.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetTodayReadingAsync_ShouldReturnDto()
        {
            var now = DateTime.UtcNow;
            var reading = new DailyReading
            {
                Id = 1,
                SeriesId = 1,
                Month = now.Month,
                Day = now.Day,
                BibleReading = "John 3:16",
                PrimaryBookPageRange = "DA 1-5",
                Series = new Series { Id = 1, Name = "Christ The Way", ShortName = "S1" }
            };
            _mockReadingRepo.Setup(r => r.GetBySeriesDateAsync(1, now.Month, now.Day)).ReturnsAsync(reading);

            var result = await _service.GetTodayReadingAsync(1);

            result.Should().NotBeNull();
            result.Id.Should().Be(1);
            result.SeriesName.Should().Be("Christ The Way");
            result.BibleReading.Should().Be("John 3:16");
        }

        [Fact]
        public async Task GetTodayReadingAsync_ShouldThrow_WhenNoReading()
        {
            var now = DateTime.UtcNow;
            _mockReadingRepo.Setup(r => r.GetBySeriesDateAsync(1, now.Month, now.Day)).ReturnsAsync((DailyReading?)null);

            await _service.Invoking(s => s.GetTodayReadingAsync(1))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldReturnDetail()
        {
            var series = new Series { Id = 1, Name = "Christ The Way", ShortName = "S1" };
            var reading = new DailyReading
            {
                Id = 1,
                SeriesId = 1,
                Month = 3,
                Day = 15,
                BibleReading = "John 3:16",
                PrimaryBookPageRange = "DA 1-5",
                PrimaryBookPageStart = 1,
                PrimaryBookPageEnd = 5,
                Series = series
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(reading);

            var result = await _service.GetFullReadingAsync(1);

            result.Should().NotBeNull();
            result.Id.Should().Be(1);
            result.BibleReading.Should().Be("John 3:16");
            result.HasSecondaryReading.Should().BeFalse();
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldAssembleEgwTextFromMultiplePages()
        {
            var book = new Book { Id = 10, BookType = BookType.DesireOfAges, Title = "Desire of Ages" };
            var series = new Series { Id = 1, PrimaryBookId = 10, PrimaryBook = book };
            var reading = new DailyReading
            {
                Id = 1, SeriesId = 1, Month = 3, Day = 15,
                BibleReading = "John 3:16",
                PrimaryBookPageRange = "DA 1-5",
                PrimaryBookPageStart = 1, PrimaryBookPageEnd = 5,
                Series = series
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(reading);

            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            ctx.EgwPages.AddRange(
                new EgwPage { BookId = 10, PageNumber = 1, Text = "Page one content." },
                new EgwPage { BookId = 10, PageNumber = 2, Text = "Page two content." },
                new EgwPage { BookId = 10, PageNumber = 3, Text = "Page three content." },
                new EgwPage { BookId = 10, PageNumber = 4, Text = "Page four content." },
                new EgwPage { BookId = 10, PageNumber = 5, Text = "Page five content." });
            await ctx.SaveChangesAsync();
            var mockEgwRepo = new Mock<IRepository<EgwPage>>();
            mockEgwRepo.Setup(r => r.Query()).Returns(ctx.EgwPages);
            _mockUow.Setup(u => u.Repository<EgwPage>()).Returns(mockEgwRepo.Object);

            var result = await _service.GetFullReadingAsync(1);

            result.FullTextPrimary.Should().Be("Page one content. Page two content. Page three content. Page four content. Page five content.");
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldReturnEmptyEgwText_WhenNoBookId()
        {
            var series = new Series { Id = 1, PrimaryBookId = 0 };
            var reading = new DailyReading
            {
                Id = 2, SeriesId = 1, Month = 6, Day = 1,
                BibleReading = "Psalm 119:105",
                PrimaryBookPageRange = "none",
                PrimaryBookPageStart = 1, PrimaryBookPageEnd = 5,
                Series = series
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(reading);

            var result = await _service.GetFullReadingAsync(2);

            result.FullTextPrimary.Should().BeEmpty();
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldReturnEmptyEgwText_WhenPageRangeNull()
        {
            var series = new Series { Id = 1, PrimaryBookId = 10 };
            var reading = new DailyReading
            {
                Id = 3, SeriesId = 1, Month = 1, Day = 1,
                BibleReading = "Gen 1:1",
                PrimaryBookPageRange = "DA 1-5",
                Series = series
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(reading);

            var result = await _service.GetFullReadingAsync(3);

            result.FullTextPrimary.Should().BeEmpty();
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldReturnEmptyEgwText_WhenStartAfterEnd()
        {
            var series = new Series { Id = 1, PrimaryBookId = 10 };
            var reading = new DailyReading
            {
                Id = 4, SeriesId = 1, Month = 2, Day = 15,
                BibleReading = "Matt 5:9",
                PrimaryBookPageRange = "DA 10-5",
                PrimaryBookPageStart = 10, PrimaryBookPageEnd = 5,
                Series = series
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(4)).ReturnsAsync(reading);

            var result = await _service.GetFullReadingAsync(4);

            result.FullTextPrimary.Should().BeEmpty();
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldAssembleSecondaryEgwText()
        {
            var book = new Book { Id = 20, BookType = BookType.GreatControversy, Title = "The Great Controversy" };
            var series = new Series { Id = 2, SecondaryBookId = 20, SecondaryBook = book };
            var reading = new DailyReading
            {
                Id = 5, SeriesId = 2, Month = 4, Day = 10,
                BibleReading = "Acts 1:8",
                PrimaryBookPageRange = "AA 1-5",
                SecondaryBookPageRange = "GC 100-101",
                SecondaryBookPageStart = 100, SecondaryBookPageEnd = 101,
                Series = series
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(reading);

            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            ctx.EgwPages.AddRange(
                new EgwPage { BookId = 20, PageNumber = 100, Text = "Great Controversy page 100." },
                new EgwPage { BookId = 20, PageNumber = 101, Text = "Great Controversy page 101." });
            await ctx.SaveChangesAsync();
            var mockEgwRepo = new Mock<IRepository<EgwPage>>();
            mockEgwRepo.Setup(r => r.Query()).Returns(ctx.EgwPages);
            _mockUow.Setup(u => u.Repository<EgwPage>()).Returns(mockEgwRepo.Object);

            var result = await _service.GetFullReadingAsync(5);

            result.FullTextSecondary.Should().Be("Great Controversy page 100. Great Controversy page 101.");
            result.HasSecondaryReading.Should().BeTrue();
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldSkipMissingPages()
        {
            var book = new Book { Id = 10 };
            var series = new Series { Id = 1, PrimaryBookId = 10, PrimaryBook = book };
            var reading = new DailyReading
            {
                Id = 6, SeriesId = 1, Month = 5, Day = 5,
                BibleReading = "Matt 5:5",
                PrimaryBookPageRange = "DA 1-5",
                PrimaryBookPageStart = 1, PrimaryBookPageEnd = 5,
                Series = series
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(6)).ReturnsAsync(reading);

            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            ctx.EgwPages.AddRange(
                new EgwPage { BookId = 10, PageNumber = 1, Text = "Page one." },
                new EgwPage { BookId = 10, PageNumber = 3, Text = "Page three." },
                new EgwPage { BookId = 10, PageNumber = 5, Text = "Page five." });
            await ctx.SaveChangesAsync();
            var mockEgwRepo = new Mock<IRepository<EgwPage>>();
            mockEgwRepo.Setup(r => r.Query()).Returns(ctx.EgwPages);
            _mockUow.Setup(u => u.Repository<EgwPage>()).Returns(mockEgwRepo.Object);

            var result = await _service.GetFullReadingAsync(6);

            result.FullTextPrimary.Should().Be("Page one. Page three. Page five.");
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldPreserveParagraphReferencesInEgwText()
        {
            var book = new Book { Id = 10, BookType = BookType.DesireOfAges, Title = "Desire of Ages" };
            var series = new Series { Id = 1, PrimaryBookId = 10, PrimaryBook = book };
            var reading = new DailyReading
            {
                Id = 1, SeriesId = 1, Month = 5, Day = 19,
                BibleReading = "Mark 5:9",
                PrimaryBookPageRange = "Desire of Ages 338-339",
                PrimaryBookPageStart = 338, PrimaryBookPageEnd = 339,
                Series = series
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(reading);

            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            ctx.EgwPages.AddRange(
                new EgwPage { BookId = 10, PageNumber = 338, Text = "First paragraph content. [338.1] Second paragraph content. [338.2]" },
                new EgwPage { BookId = 10, PageNumber = 339, Text = "Third paragraph content. [339.1]" });
            await ctx.SaveChangesAsync();
            var mockEgwRepo = new Mock<IRepository<EgwPage>>();
            mockEgwRepo.Setup(r => r.Query()).Returns(ctx.EgwPages);
            _mockUow.Setup(u => u.Repository<EgwPage>()).Returns(mockEgwRepo.Object);

            var result = await _service.GetFullReadingAsync(1);

            result.FullTextPrimary.Should().Contain("[338.1]");
            result.FullTextPrimary.Should().Contain("[338.2]");
            result.FullTextPrimary.Should().Contain("[339.1]");
            result.FullTextPrimary.Should().Be("First paragraph content. [338.1] Second paragraph content. [338.2] Third paragraph content. [339.1]");
        }

        [Fact]
        public async Task GetFullReadingAsync_ShouldThrow_WhenNotFound()
        {
            _mockReadingRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((DailyReading?)null);

            await _service.Invoking(s => s.GetFullReadingAsync(999))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task GetSummaryAsync_ShouldReturnSummary()
        {
            var reading = new DailyReading
            {
                Id = 1,
                SummaryPoints = "- Point 1\n- Point 2",
                BibleReading = "John 3:16",
                PrimaryBookPageRange = "DA 1-5"
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(reading);

            var result = await _service.GetSummaryAsync(1);

            result.Should().NotBeNull();
            result.Id.Should().Be(1);
            result.SummaryPoints.Should().Contain("Point 1");
        }

        [Fact]
        public async Task GetSummaryAsync_ShouldThrow_WhenNotFound()
        {
            _mockReadingRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((DailyReading?)null);

            await _service.Invoking(s => s.GetSummaryAsync(999))
                .Should().ThrowAsync<KeyNotFoundException>();
        }
    }
}
