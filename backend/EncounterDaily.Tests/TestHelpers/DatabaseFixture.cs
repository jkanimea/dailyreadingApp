using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Tests.TestHelpers
{
    public class DatabaseFixture : IDisposable
    {
        public AppDbContext CreateInMemoryContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        public GenericRepository<T> CreateRepository<T>(AppDbContext context) where T : BaseEntity
        {
            return new GenericRepository<T>(context);
        }

        public SeriesRepository CreateSeriesRepository(AppDbContext context)
        {
            return new SeriesRepository(context);
        }

        public ReadingRepository CreateReadingRepository(AppDbContext context)
        {
            return new ReadingRepository(context);
        }

        public ProgressRepository CreateProgressRepository(AppDbContext context)
        {
            return new ProgressRepository(context);
        }

        public BookmarkRepository CreateBookmarkRepository(AppDbContext context)
        {
            return new BookmarkRepository(context);
        }

        public void Dispose() { }
    }
}
