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
    public class BookmarkControllerTests
    {
        private readonly Mock<IBookmarkService> _mockService;
        private readonly BookmarkController _controller;

        public BookmarkControllerTests()
        {
            _mockService = new Mock<IBookmarkService>();
            _controller = new BookmarkController(_mockService.Object);
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
        public async Task GetBookmarks_ShouldReturnOk()
        {
            _mockService.Setup(s => s.GetUserBookmarksAsync(1)).ReturnsAsync(new List<UserBookmark>());

            var result = await _controller.GetBookmarks();

            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task AddBookmark_ShouldReturnCreated_WhenValid()
        {
            var bookmark = new UserBookmark { Id = 1, UserId = 1, DailyReadingId = 1 };
            _mockService.Setup(s => s.AddBookmarkAsync(1, 1)).ReturnsAsync(bookmark);

            var result = await _controller.AddBookmark(1);

            var createdResult = result.Result as CreatedAtActionResult;
            createdResult.Should().NotBeNull();
            createdResult!.StatusCode.Should().Be(201);
        }

        [Fact]
        public async Task AddBookmark_ShouldReturnNotFound_WhenReadingMissing()
        {
            _mockService.Setup(s => s.AddBookmarkAsync(1, 999)).ThrowsAsync(new KeyNotFoundException("Reading 999 not found"));

            var result = await _controller.AddBookmark(999);

            result.Result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task RemoveBookmark_ShouldReturnNoContent_WhenValid()
        {
            _mockService.Setup(s => s.RemoveBookmarkAsync(1, 1)).Returns(Task.CompletedTask);

            var result = await _controller.RemoveBookmark(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task RemoveBookmark_ShouldReturnNotFound_WhenMissing()
        {
            _mockService.Setup(s => s.RemoveBookmarkAsync(1, 999)).ThrowsAsync(new KeyNotFoundException("Bookmark not found"));

            var result = await _controller.RemoveBookmark(999);

            result.Should().BeOfType<NotFoundObjectResult>();
        }
    }
}
