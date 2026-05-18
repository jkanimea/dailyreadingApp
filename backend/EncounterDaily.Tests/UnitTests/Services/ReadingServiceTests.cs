using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Services;
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
    }
}
