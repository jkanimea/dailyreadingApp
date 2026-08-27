using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Services;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class SeriesServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IRepository<Series>> _mockRepo;
        private readonly Mock<ISeriesRepository> _mockSeriesRepo;
        private readonly ISeriesService _service;

        public SeriesServiceTests()
        {
            _mockRepo = new Mock<IRepository<Series>>();
            _mockSeriesRepo = new Mock<ISeriesRepository>();
            _mockUow = new Mock<IUnitOfWork>();
            _mockUow.Setup(u => u.Repository<Series>()).Returns(_mockRepo.Object);
            _mockUow.Setup(u => u.Series).Returns(_mockSeriesRepo.Object);
            _service = new SeriesService(_mockUow.Object);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldIncludeBooks()
        {
            var series = new Series { Id = 1, Name = "Test Series" };
            _mockSeriesRepo.Setup(r => r.GetSeriesWithBooksAsync(1)).ReturnsAsync(series);

            var result = await _service.GetByIdAsync(1);

            result.Should().NotBeNull();
            _mockSeriesRepo.Verify(r => r.GetSeriesWithBooksAsync(1), Times.Once);
        }

        [Fact]
        public async Task GetAllAsync_ShouldIncludeBooks()
        {
            var seriesList = new List<Series> { new Series { Id = 1, Name = "S1" } };
            _mockSeriesRepo.Setup(r => r.GetAllSeriesWithBooksAsync()).ReturnsAsync(seriesList);

            var result = await _service.GetAllAsync();

            result.Should().HaveCount(1);
            _mockSeriesRepo.Verify(r => r.GetAllSeriesWithBooksAsync(), Times.Once);
        }

        [Fact]
        public async Task GetAllSeriesWithBooksAsync_ShouldReturnFromRepository()
        {
            var seriesList = new List<Series>
            {
                new Series { Id = 1, Name = "Christ the Way" },
                new Series { Id = 2, Name = "Christ the Church" }
            };
            _mockSeriesRepo.Setup(r => r.GetAllSeriesWithBooksAsync()).ReturnsAsync(seriesList);

            var result = await _service.GetAllSeriesWithBooksAsync();

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetSeriesWithBooksAsync_ShouldReturnSeriesWithBooks()
        {
            var series = new Series { Id = 1, Name = "Test Series" };
            _mockSeriesRepo.Setup(r => r.GetSeriesWithBooksAsync(1)).ReturnsAsync(series);

            var result = await _service.GetSeriesWithBooksAsync(1);

            result.Should().NotBeNull();
            result!.Id.Should().Be(1);
        }

        [Fact]
        public async Task CreateConfigAsync_ShouldMapSeriesToConfig()
        {
            var primaryBook = new Book { Id = 1, Title = "Desire of Ages" };
            var secondaryBook = new Book { Id = 2, Title = "Acts of the Apostles" };
            var series = new Series
            {
                Id = 1,
                PrimaryBookId = 1,
                PrimaryBook = primaryBook,
                SecondaryBookId = 2,
                SecondaryBook = secondaryBook
            };
            _mockSeriesRepo.Setup(r => r.GetSeriesWithBooksAsync(1)).ReturnsAsync(series);

            var result = await _service.CreateConfigAsync(1);

            result.SeriesId.Should().Be(1);
            result.PrimaryBookTitle.Should().Be("Desire of Ages");
            result.SecondaryBookTitle.Should().Be("Acts of the Apostles");
            result.HasSecondaryReading.Should().BeTrue();
            result.DateRangeStart.Should().Be("01-01");
        }

        [Fact]
        public async Task CreateConfigAsync_ShouldUseUnknownTitle_WhenSeriesMissing()
        {
            _mockSeriesRepo.Setup(r => r.GetSeriesWithBooksAsync(999)).ReturnsAsync((Series?)null);

            var result = await _service.CreateConfigAsync(999);

            result.PrimaryBookTitle.Should().Be("Unknown");
            result.HasSecondaryReading.Should().BeFalse();
        }
    }
}
