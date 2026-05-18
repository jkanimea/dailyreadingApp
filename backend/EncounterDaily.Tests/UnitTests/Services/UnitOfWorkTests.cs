using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Infrastructure.Repositories;
using EncounterDaily.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class UnitOfWorkTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public UnitOfWorkTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public void UnitOfWork_ShouldCreateRepositoriesOnDemand()
        {
            using var context = _fixture.CreateInMemoryContext();
            using var uow = new UnitOfWork(context);

            uow.Readings.Should().NotBeNull();
            uow.Progress.Should().NotBeNull();
            uow.Bookmarks.Should().NotBeNull();
            uow.Series.Should().NotBeNull();
        }

        [Fact]
        public void UnitOfWork_ShouldReturnSameInstancePerRepository()
        {
            using var context = _fixture.CreateInMemoryContext();
            using var uow = new UnitOfWork(context);

            var readings1 = uow.Readings;
            var readings2 = uow.Readings;

            readings1.Should().BeSameAs(readings2);
        }

        [Fact]
        public async Task CompleteAsync_ShouldSaveChanges()
        {
            using var context = _fixture.CreateInMemoryContext();
            using var uow = new UnitOfWork(context);

            var reading = new DailyReading
            {
                SeriesId = 1,
                Month = 1,
                Day = 1,
                BibleReading = "Mark 1:1",
                PrimaryBookPageRange = "DA 19-21",
                PrimaryBookPageStart = 19,
                PrimaryBookPageEnd = 21
            };

            await uow.Readings.AddAsync(reading);
            var result = await uow.CompleteAsync();

            result.Should().BeGreaterThan(0);
        }
    }
}
