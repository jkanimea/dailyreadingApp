using EncounterDaily.Core.DTOs.Logs;
using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Services;
using FluentAssertions;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class AppLogServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUoW;
        private readonly Mock<IAppLogRepository> _mockLogRepo;
        private readonly AppLogService _service;

        public AppLogServiceTests()
        {
            _mockUoW = new Mock<IUnitOfWork>();
            _mockLogRepo = new Mock<IAppLogRepository>();
            _mockUoW.Setup(u => u.AppLogs).Returns(_mockLogRepo.Object);
            _service = new AppLogService(_mockUoW.Object);
        }

        [Fact]
        public async Task SaveClientLogsAsync_AddsLogForEachEntry()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "info", Message = "msg1", Source = "src1" },
                new() { Level = "error", Message = "msg2", Source = "src2", Exception = "ex" }
            };

            _mockLogRepo.Setup(r => r.AddAsync(It.IsAny<AppLog>()))
                .ReturnsAsync((AppLog l) => l);
            _mockUoW.Setup(u => u.CompleteAsync()).ReturnsAsync(2);

            await _service.SaveClientLogsAsync(entries, userId: 42, userEmail: "a@b.com", ipAddress: "127.0.0.1");

            _mockLogRepo.Verify(r => r.AddAsync(It.Is<AppLog>(l =>
                l.Origin == "client" && l.UserId == 42 && l.UserEmail == "a@b.com"
            )), Times.Exactly(2));
            _mockUoW.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveClientLogsAsync_NormalizesLogLevels()
        {
            var entries = new List<ClientLogEntry>
            {
                new() { Level = "WARNING", Message = "warn msg" },
                new() { Level = "DEBUG", Message = "debug msg" },
                new() { Level = "unknown", Message = "default" }
            };

            var captured = new List<AppLog>();
            _mockLogRepo.Setup(r => r.AddAsync(It.IsAny<AppLog>()))
                .Callback<AppLog>(l => captured.Add(l))
                .ReturnsAsync((AppLog l) => l);
            _mockUoW.Setup(u => u.CompleteAsync()).ReturnsAsync(3);

            await _service.SaveClientLogsAsync(entries, null, null, null);

            captured[0].Level.Should().Be("warn");
            captured[1].Level.Should().Be("debug");
            captured[2].Level.Should().Be("info");
        }

        [Fact]
        public async Task GetLogsAsync_ReturnsMappedPagedResult()
        {
            var logs = new List<AppLog>
            {
                new() { Id = 1, Level = "info", Message = "hello", Origin = "client", CreatedAt = DateTime.UtcNow }
            };
            _mockLogRepo.Setup(r => r.GetPagedAsync(It.IsAny<AppLogQueryDto>()))
                .ReturnsAsync(new PagedResult<AppLog>
                {
                    Items = logs,
                    TotalCount = 1,
                    Page = 1,
                    PageSize = 50
                });

            var result = await _service.GetLogsAsync(new AppLogQueryDto());

            result.TotalCount.Should().Be(1);
            result.Items.Should().HaveCount(1);
            result.Items.First().Message.Should().Be("hello");
            result.Items.First().Origin.Should().Be("client");
        }

        [Fact]
        public async Task DeleteOldLogsAsync_CallsRepositoryWithSixMonthCutoff()
        {
            _mockLogRepo.Setup(r => r.DeleteOlderThanAsync(It.IsAny<DateTime>()))
                .ReturnsAsync(5);

            var deleted = await _service.DeleteOldLogsAsync();

            deleted.Should().Be(5);
            _mockLogRepo.Verify(r => r.DeleteOlderThanAsync(
                It.Is<DateTime>(d => d <= DateTime.UtcNow.AddMonths(-6).AddMinutes(1)
                                  && d >= DateTime.UtcNow.AddMonths(-6).AddMinutes(-1))
            ), Times.Once);
        }
    }
}
