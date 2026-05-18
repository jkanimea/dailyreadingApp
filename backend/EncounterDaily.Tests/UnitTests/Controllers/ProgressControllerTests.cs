using System.Security.Claims;
using EncounterDaily.API.Controllers;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Http;
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
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "1")
                    }))
                }
            };
        }

        [Fact]
        public async Task GetSeriesProgress_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetUserProgressForSeriesAsync(1, 1)).ReturnsAsync(new List<UserProgress>());

            var result = await _controller.GetSeriesProgress(1);

            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetStreak_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetStreakAsync(1, 1)).ReturnsAsync(3);

            var result = await _controller.GetStreak(1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            okResult.Value.Should().Be(3);
        }

        [Fact]
        public async Task MarkComplete_ShouldReturnOk_WhenValid()
        {
            var progress = new UserProgress { Id = 1, UserId = 1, DailyReadingId = 1, IsCompleted = true };
            _mockService.Setup(s => s.MarkCompleteAsync(1, 1)).ReturnsAsync(progress);

            var result = await _controller.MarkComplete(1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task MarkComplete_ShouldReturnNotFound_WhenReadingMissing()
        {
            _mockService.Setup(s => s.MarkCompleteAsync(1, 999)).ThrowsAsync(new KeyNotFoundException("Reading 999 not found"));

            var result = await _controller.MarkComplete(999);

            result.Result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task UnmarkComplete_ShouldReturnNoContent()
        {
            _mockService.Setup(s => s.UnmarkCompleteAsync(1, 1)).Returns(Task.CompletedTask);

            var result = await _controller.UnmarkComplete(1);

            result.Should().BeOfType<NoContentResult>();
        }
    }
}
