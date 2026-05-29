using System.Reflection;
using System.Security.Claims;
using EncounterDaily.API.Controllers;
using EncounterDaily.Core.DTOs.Logs;
using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Interfaces.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class LogsControllerTests
    {
        private readonly Mock<IAppLogService> _mockLogService;
        private readonly LogsController _controller;

        public LogsControllerTests()
        {
            _mockLogService = new Mock<IAppLogService>();
            _controller = new LogsController(
                Mock.Of<ILogger<LogsController>>(),
                _mockLogService.Object
            );
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };

            _mockLogService
                .Setup(s => s.SaveClientLogsAsync(
                    It.IsAny<IEnumerable<ClientLogEntry>>(),
                    It.IsAny<int?>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>()))
                .Returns(Task.CompletedTask);
        }

        [Fact]
        public async Task Submit_ShouldReturnOk_WhenEmptyList()
        {
            var result = await _controller.Submit(new List<ClientLogEntry>());

            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task Submit_ShouldReturnCountOfEntries()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "info", Source = "Test", Message = "One" },
                new() { Level = "error", Source = "Test", Message = "Two" }
            };

            var result = await _controller.Submit(entries);

            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            _mockLogService.Verify(s => s.SaveClientLogsAsync(
                It.Is<IEnumerable<ClientLogEntry>>(e => e.Count() == 2),
                It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Once);
        }

        [Fact]
        public async Task Submit_PassesUserIdAndEmailFromClaims()
        {
            var httpContext = new DefaultHttpContext();
            httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "42"),
                new Claim(ClaimTypes.Email, "admin@app.com")
            }));
            _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

            int? capturedUserId = null;
            string? capturedEmail = null;
            _mockLogService
                .Setup(s => s.SaveClientLogsAsync(
                    It.IsAny<IEnumerable<ClientLogEntry>>(),
                    It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()))
                .Callback<IEnumerable<ClientLogEntry>, int?, string?, string?>(
                    (_, uid, email, _) => { capturedUserId = uid; capturedEmail = email; })
                .Returns(Task.CompletedTask);

            await _controller.Submit(new List<ClientLogEntry> { new() { Message = "x" } });

            capturedUserId.Should().Be(42);
            capturedEmail.Should().Be("admin@app.com");
        }

        [Fact]
        public async Task GetLogs_ShouldReturnPagedResult()
        {
            _mockLogService.Setup(s => s.GetLogsAsync(It.IsAny<AppLogQueryDto>()))
                .ReturnsAsync(new PagedResult<AppLogDto>
                {
                    Items = new[] { new AppLogDto { Id = 1, Message = "log entry" } },
                    TotalCount = 1, Page = 1, PageSize = 50
                });

            var result = await _controller.GetLogs(new AppLogQueryDto());

            var ok = result as OkObjectResult;
            ok.Should().NotBeNull();
            ok!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task DeleteOldLogs_ShouldReturnDeletedCount()
        {
            _mockLogService.Setup(s => s.DeleteOldLogsAsync()).ReturnsAsync(8);

            var result = await _controller.DeleteOldLogs();

            var ok = result as OkObjectResult;
            ok.Should().NotBeNull();
            ok!.StatusCode.Should().Be(200);
        }

        [Fact]
        public void SubmitEndpoint_ShouldHaveAllowAnonymousAttribute()
        {
            var method = typeof(LogsController).GetMethod("Submit");
            var attr = method?.GetCustomAttribute<AllowAnonymousAttribute>();
            attr.Should().NotBeNull();
        }

        [Fact]
        public void GetLogsEndpoint_ShouldRequireAdminPolicy()
        {
            var method = typeof(LogsController).GetMethod("GetLogs");
            var attr = method?.GetCustomAttribute<AuthorizeAttribute>();
            attr.Should().NotBeNull();
            attr!.Policy.Should().Be("RequireAdminRole");
        }

        [Fact]
        public void DeleteOldLogsEndpoint_ShouldRequireAdminPolicy()
        {
            var method = typeof(LogsController).GetMethod("DeleteOldLogs");
            var attr = method?.GetCustomAttribute<AuthorizeAttribute>();
            attr.Should().NotBeNull();
            attr!.Policy.Should().Be("RequireAdminRole");
        }
    }
}
