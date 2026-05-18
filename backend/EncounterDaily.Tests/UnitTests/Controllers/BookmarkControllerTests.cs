using EncounterDaily.API.Controllers;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class BookmarkControllerTests
    {
        private readonly Mock<IBookmarkService> _mockService;
        private readonly BookmarkController _controller;

        public BookmarkControllerTests()
        {
            _mockService = new Mock<IBookmarkService>();
            _controller = new BookmarkController(_mockService.Object);
        }

        [Fact]
        public async Task GetUserBookmarks_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetUserBookmarksAsync(1)).ReturnsAsync(new List<UserBookmark>());

            var result = await _controller.GetUserBookmarks(1);

            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetUserBookmark_ShouldReturnOk_WhenFound()
        {
            var bookmark = new UserBookmark { Id = 1, UserId = 1, DailyReadingId = 1 };
            _mockService.Setup(s => s.GetUserBookmarkAsync(1, 1)).ReturnsAsync(bookmark);

            var result = await _controller.GetUserBookmark(1, 1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task GetUserBookmark_ShouldReturnNotFound_WhenMissing()
        {
            _mockService.Setup(s => s.GetUserBookmarkAsync(1, 999)).ReturnsAsync((UserBookmark?)null);

            var result = await _controller.GetUserBookmark(1, 999);

            result.Result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetUserBookmarksBySeries_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetUserBookmarksBySeriesAsync(1, 1)).ReturnsAsync(new List<UserBookmark>());

            var result = await _controller.GetUserBookmarksBySeries(1, 1);

            result.Result.Should().BeOfType<OkObjectResult>();
        }
    }
}
