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

        public void Dispose() { }
    }
}
