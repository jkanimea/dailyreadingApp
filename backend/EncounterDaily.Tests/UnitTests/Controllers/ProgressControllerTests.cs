using EncounterDaily.API.Controllers;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class ProgressControllerTests
    {
        private readonly Mock<IProgressService> _mockService;
        private readonly ProgressController _controller;

        public ProgressControllerTests()
        {
            _mockService = new Mock<IProgressService>();
            _controller = new ProgressController(_mockService.Object);
        }

        [Fact]
        public async Task GetUserReadingProgress_ShouldReturnOk_WhenFound()
        {
            var progress = new UserProgress { Id = 1, UserId = 1, DailyReadingId = 1 };
            _mockService.Setup(s => s.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(progress);

            var result = await _controller.GetUserReadingProgress(1, 1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task GetUserReadingProgress_ShouldReturnNotFound_WhenMissing()
        {
            _mockService.Setup(s => s.GetUserReadingProgressAsync(1, 999)).ReturnsAsync((UserProgress?)null);

            var result = await _controller.GetUserReadingProgress(1, 999);

            result.Result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetStreak_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetStreakAsync(1, 1)).ReturnsAsync(3);

            var result = await _controller.GetStreak(1, 1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            okResult.Value.Should().Be(3);
        }

        [Fact]
        public async Task GetUserProgressForSeries_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetUserProgressForSeriesAsync(1, 1)).ReturnsAsync(new List<UserProgress>());

            var result = await _controller.GetUserProgressForSeries(1, 1);

            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetCompletionPercentage_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetCompletionPercentageAsync(1, 1)).ReturnsAsync(75.0);

            var result = await _controller.GetCompletionPercentage(1, 1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            okResult.Value.Should().Be(75.0);
        }
    }
}
