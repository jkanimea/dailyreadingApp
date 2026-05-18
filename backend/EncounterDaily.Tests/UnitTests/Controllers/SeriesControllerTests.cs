using EncounterDaily.API.Controllers;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class SeriesControllerTests
    {
        private readonly Mock<ISeriesService> _mockService;
        private readonly SeriesController _controller;

        public SeriesControllerTests()
        {
            _mockService = new Mock<ISeriesService>();
            _controller = new SeriesController(_mockService.Object);
        }

        [Fact]
        public async Task GetAllWithBooks_ShouldReturnOk()
        {
            var seriesList = new List<Series>
            {
                new Series { Id = 1, Name = "Series 1" },
                new Series { Id = 2, Name = "Series 2" }
            };
            _mockService.Setup(s => s.GetAllSeriesWithBooksAsync()).ReturnsAsync(seriesList);

            var result = await _controller.GetAllWithBooks();

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            var value = okResult.Value as IEnumerable<Series>;
            value.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetWithBooks_ShouldReturnOk_WhenFound()
        {
            var series = new Series { Id = 1, Name = "Test" };
            _mockService.Setup(s => s.GetSeriesWithBooksAsync(1)).ReturnsAsync(series);

            var result = await _controller.GetWithBooks(1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            var value = okResult.Value as Series;
            value!.Id.Should().Be(1);
        }

        [Fact]
        public async Task GetWithBooks_ShouldReturnNotFound_WhenMissing()
        {
            _mockService.Setup(s => s.GetSeriesWithBooksAsync(999)).ReturnsAsync((Series?)null);

            var result = await _controller.GetWithBooks(999);

            result.Result.Should().BeOfType<NotFoundResult>();
        }
    }
}
