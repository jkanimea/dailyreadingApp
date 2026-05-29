using EncounterDaily.Core.DTOs.Logs;
using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Repositories;
using EncounterDaily.Tests.TestHelpers;
using FluentAssertions;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class AppLogRepositoryTests
    {
        private readonly DatabaseFixture _fixture = new();

        private static AppLog MakeLog(string level = "info", string origin = "client", DateTime? createdAt = null)
        {
            var log = new AppLog
            {
                Level = level,
                Message = "Test message",
                Source = "TestSource",
                Origin = origin
            };
            if (createdAt.HasValue)
                log.CreatedAt = createdAt.Value;
            return log;
        }

        [Fact]
        public async Task GetPagedAsync_ReturnsAllLogs_WhenNoFilters()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new AppLogRepository(ctx);

            ctx.AppLogs.AddRange(MakeLog(), MakeLog("error"), MakeLog("warn"));
            await ctx.SaveChangesAsync();

            var result = await repo.GetPagedAsync(new AppLogQueryDto { Page = 1, PageSize = 50 });

            result.TotalCount.Should().Be(3);
            result.Items.Should().HaveCount(3);
        }

        [Fact]
        public async Task GetPagedAsync_FiltersBy_Level()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new AppLogRepository(ctx);

            ctx.AppLogs.AddRange(MakeLog("info"), MakeLog("error"), MakeLog("error"));
            await ctx.SaveChangesAsync();

            var result = await repo.GetPagedAsync(new AppLogQueryDto { Level = "error", Page = 1, PageSize = 50 });

            result.TotalCount.Should().Be(2);
            result.Items.Should().AllSatisfy(l => l.Level.Should().Be("error"));
        }

        [Fact]
        public async Task GetPagedAsync_FiltersBy_Origin()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new AppLogRepository(ctx);

            ctx.AppLogs.AddRange(MakeLog("info", "client"), MakeLog("info", "server"), MakeLog("info", "server"));
            await ctx.SaveChangesAsync();

            var result = await repo.GetPagedAsync(new AppLogQueryDto { Origin = "server", Page = 1, PageSize = 50 });

            result.TotalCount.Should().Be(2);
        }

        [Fact]
        public async Task GetPagedAsync_FiltersBy_DateRange()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new AppLogRepository(ctx);

            var old = MakeLog(); old.CreatedAt = DateTime.UtcNow.AddDays(-10);
            var recent = MakeLog(); recent.CreatedAt = DateTime.UtcNow.AddDays(-1);
            ctx.AppLogs.AddRange(old, recent);
            await ctx.SaveChangesAsync();

            var result = await repo.GetPagedAsync(new AppLogQueryDto
            {
                From = DateTime.UtcNow.AddDays(-3),
                Page = 1,
                PageSize = 50
            });

            result.TotalCount.Should().Be(1);
        }

        [Fact]
        public async Task GetPagedAsync_PaginatesCorrectly()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new AppLogRepository(ctx);

            for (int i = 0; i < 10; i++)
                ctx.AppLogs.Add(MakeLog());
            await ctx.SaveChangesAsync();

            var page1 = await repo.GetPagedAsync(new AppLogQueryDto { Page = 1, PageSize = 4 });
            var page2 = await repo.GetPagedAsync(new AppLogQueryDto { Page = 2, PageSize = 4 });

            page1.Items.Should().HaveCount(4);
            page1.TotalCount.Should().Be(10);
            page1.TotalPages.Should().Be(3);
            page2.Items.Should().HaveCount(4);
        }

        [Fact]
        public async Task DeleteOlderThanAsync_RemovesOldEntries()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new AppLogRepository(ctx);

            var old = MakeLog(); old.CreatedAt = DateTime.UtcNow.AddMonths(-7);
            var recent = MakeLog(); recent.CreatedAt = DateTime.UtcNow.AddDays(-1);
            ctx.AppLogs.AddRange(old, recent);
            await ctx.SaveChangesAsync();

            var cutoff = DateTime.UtcNow.AddMonths(-6);
            var deleted = await repo.DeleteOlderThanAsync(cutoff);

            deleted.Should().Be(1);
            ctx.AppLogs.Should().HaveCount(1);
        }

        [Fact]
        public async Task DeleteOlderThanAsync_ReturnsZero_WhenNothingToDelete()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new AppLogRepository(ctx);

            ctx.AppLogs.Add(MakeLog());
            await ctx.SaveChangesAsync();

            var cutoff = DateTime.UtcNow.AddMonths(-6);
            var deleted = await repo.DeleteOlderThanAsync(cutoff);

            deleted.Should().Be(0);
        }
    }
}
