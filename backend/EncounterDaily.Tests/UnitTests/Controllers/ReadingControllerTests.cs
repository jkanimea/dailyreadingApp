using EncounterDaily.API.Controllers;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class ReadingControllerTests
    {
        private readonly Mock<IReadingService> _mockService;
        private readonly ReadingController _controller;

        public ReadingControllerTests()
        {
            _mockService = new Mock<IReadingService>();
            _controller = new ReadingController(_mockService.Object);
        }

        [Fact]
        public async Task GetBySeriesDate_ShouldReturnOk_WhenFound()
        {
            var reading = new DailyReading { Id = 1, SeriesId = 1, Month = 1, Day = 1 };
            _mockService.Setup(s => s.GetBySeriesDateAsync(1, 1, 1)).ReturnsAsync(reading);

            var result = await _controller.GetBySeriesDate(1, 1, 1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task GetBySeriesDate_ShouldReturnNotFound_WhenMissing()
        {
            _mockService.Setup(s => s.GetBySeriesDateAsync(1, 2, 30)).ReturnsAsync((DailyReading?)null);

            var result = await _controller.GetBySeriesDate(1, 2, 30);

            result.Result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetBySeriesMonth_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetBySeriesMonthAsync(1, 1)).ReturnsAsync(new List<DailyReading>());

            var result = await _controller.GetBySeriesMonth(1, 1);

            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetBySeriesYear_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetBySeriesYearAsync(1)).ReturnsAsync(new List<DailyReading>());

            var result = await _controller.GetBySeriesYear(1);

            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task Search_ShouldReturnOk()
        {
            _mockService.Setup(s => s.SearchByTextAsync(1, "Mark")).ReturnsAsync(new List<DailyReading>());

            var result = await _controller.Search(1, "Mark");

            result.Result.Should().BeOfType<OkObjectResult>();
        }
    }
}
