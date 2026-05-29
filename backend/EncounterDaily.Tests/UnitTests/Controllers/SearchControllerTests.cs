using System.Security.Claims;
using EncounterDaily.API.Controllers;
using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class SearchControllerTests
    {
        private readonly Mock<ISearchService> _mockService;
        private readonly SearchController _controller;

        public SearchControllerTests()
        {
            _mockService = new Mock<ISearchService>();
            _controller = new SearchController(_mockService.Object, Mock.Of<ILogger<SearchController>>());
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
        public async Task Search_ShouldReturnOk_WithResults()
        {
            var paged = new PagedResult<SearchResultDto>
            {
                Items = new List<SearchResultDto>
                {
                    new SearchResultDto { Id = 1, BibleReading = "Mark 1:1" }
                },
                TotalCount = 1, Page = 1, PageSize = 20
            };
            _mockService.Setup(s => s.SearchAsync(1, 1, "Mark", 1, 20)).ReturnsAsync(paged);

            var result = await _controller.Search("Mark", 1, 1, 20);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task Search_ShouldReturnBadRequest_WhenQueryEmpty()
        {
            var result = await _controller.Search("", 1, 1, 20);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Search_ShouldReturnBadRequest_WhenQueryWhitespace()
        {
            var result = await _controller.Search("   ", 1, 1, 20);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Search_ShouldReturnBadRequest_WhenQueryTooShort()
        {
            var result = await _controller.Search("a", 1, 1, 20);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task SearchAll_ShouldReturnOk_WithResults()
        {
            var paged = new PagedResult<SearchResultDto>
            {
                Items = new List<SearchResultDto>
                {
                    new SearchResultDto { Id = 1, BibleReading = "Jesus wept" },
                    new SearchResultDto { Id = 2, BibleReading = "Jesus said" }
                },
                TotalCount = 2, Page = 1, PageSize = 20
            };
            _mockService.Setup(s => s.SearchAllAsync(1, "Jesus", 1, 20)).ReturnsAsync(paged);

            var result = await _controller.SearchAll("Jesus", 1, 20);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task SearchAll_ShouldReturnBadRequest_WhenQueryEmpty()
        {
            var result = await _controller.SearchAll("", 1, 20);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task SearchAll_ShouldReturnBadRequest_WhenQueryTooShort()
        {
            var result = await _controller.SearchAll("x", 1, 20);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Search_ShouldClampPageSize()
        {
            var paged = new PagedResult<SearchResultDto>
            {
                Items = new List<SearchResultDto>(),
                TotalCount = 0, Page = 1, PageSize = 100
            };
            _mockService.Setup(s => s.SearchAsync(1, 1, "Mark", 1, 100)).ReturnsAsync(paged);

            var result = await _controller.Search("Mark", 1, 1, 200);

            _mockService.Verify(s => s.SearchAsync(1, 1, "Mark", 1, 100), Times.Once);
        }
    }
}
