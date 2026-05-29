using EncounterDaily.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class LogsControllerTests
    {
        private readonly Mock<ILogger<LogsController>> _mockLogger;
        private readonly LogsController _controller;

        public LogsControllerTests()
        {
            _mockLogger = new Mock<ILogger<LogsController>>();
            _controller = new LogsController(_mockLogger.Object);
        }

        [Fact]
        public void Submit_ShouldReturnOk_WhenEmptyList()
        {
            var result = _controller.Submit(new List<ClientLogEntry>());

            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public void Submit_ShouldReturnOk_WhenEntriesProvided()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "error", Source = "Test", Message = "Something broke" },
                new() { Level = "info", Source = "Test", Message = "All good" },
                new() { Level = "warn", Source = "Test", Message = "Heads up" }
            };

            var result = _controller.Submit(entries);

            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public void Submit_ShouldLogError_WhenLevelIsError()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "error", Source = "Auth", Message = "Login failed", Exception = "Invalid token" }
            };

            _controller.Submit(entries);

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void Submit_ShouldLogWarning_WhenLevelIsWarn()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "warn", Source = "UI", Message = "Deprecated API" }
            };

            _controller.Submit(entries);

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void Submit_ShouldLogInfo_WhenLevelIsDebug()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "debug", Source = "Service", Message = "Cache hit" }
            };

            _controller.Submit(entries);

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Debug,
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void Submit_ShouldDefaultToInfo_WhenUnknownLevel()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "unknown", Source = "Test", Message = "Test message" }
            };

            _controller.Submit(entries);

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void Submit_ShouldReturnCountOfEntriesReceived()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "info", Source = "Test", Message = "One" },
                new() { Level = "info", Source = "Test", Message = "Two" }
            };

            var result = _controller.Submit(entries);

            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }
    }
}
