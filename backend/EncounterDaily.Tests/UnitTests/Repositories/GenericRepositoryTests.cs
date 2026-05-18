using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Infrastructure.Repositories;
using EncounterDaily.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class GenericRepositoryTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public GenericRepositoryTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task AddAsync_ShouldAddEntityToDatabase()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);
            var book = new Book { Title = "Desire of Ages", Author = "Ellen G. White", PageCount = 500 };

            await repo.AddAsync(book);
            await context.SaveChangesAsync();

            var saved = await context.Books.FirstOrDefaultAsync(b => b.Title == "Desire of Ages");
            saved.Should().NotBeNull();
            saved!.Title.Should().Be("Desire of Ages");
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnEntity()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);
            var book = new Book { Title = "Acts of the Apostles", Author = "Ellen G. White", PageCount = 400 };
            await repo.AddAsync(book);
            await context.SaveChangesAsync();

            var found = await repo.GetByIdAsync(book.Id);

            found.Should().NotBeNull();
            found!.Title.Should().Be("Acts of the Apostles");
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnNullForNonExistentId()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);

            var result = await repo.GetByIdAsync(999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetAllAsync_ShouldReturnAllEntities()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);
            await repo.AddAsync(new Book { Title = "Book 1", PageCount = 100 });
            await repo.AddAsync(new Book { Title = "Book 2", PageCount = 200 });
            await repo.AddAsync(new Book { Title = "Book 3", PageCount = 300 });
            await context.SaveChangesAsync();

            var all = await repo.GetAllAsync();

            all.Should().HaveCount(3);
        }

        [Fact]
        public async Task UpdateAsync_ShouldModifyEntity()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);
            var book = new Book { Title = "Original Title", PageCount = 100 };
            await repo.AddAsync(book);
            await context.SaveChangesAsync();

            book.Title = "Updated Title";
            await repo.UpdateAsync(book);
            await context.SaveChangesAsync();

            var updated = await repo.GetByIdAsync(book.Id);
            updated!.Title.Should().Be("Updated Title");
            updated.UpdatedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task DeleteAsync_ShouldRemoveEntity()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);
            var book = new Book { Title = "To Delete", PageCount = 50 };
            await repo.AddAsync(book);
            await context.SaveChangesAsync();

            await repo.DeleteAsync(book.Id);
            await context.SaveChangesAsync();

            var deleted = await repo.GetByIdAsync(book.Id);
            deleted.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_ShouldDoNothingForNonExistentId()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);

            await repo.DeleteAsync(999);

            await context.SaveChangesAsync();
        }

        [Fact]
        public async Task ExistsAsync_ShouldReturnTrueWhenMatch()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);
            await repo.AddAsync(new Book { Title = "Find Me", PageCount = 100 });
            await context.SaveChangesAsync();

            var exists = await repo.ExistsAsync(b => b.Title == "Find Me");

            exists.Should().BeTrue();
        }

        [Fact]
        public async Task ExistsAsync_ShouldReturnFalseWhenNoMatch()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);
            await repo.AddAsync(new Book { Title = "Not This One", PageCount = 100 });
            await context.SaveChangesAsync();

            var exists = await repo.ExistsAsync(b => b.Title == "Find Me");

            exists.Should().BeFalse();
        }

        [Fact]
        public async Task AddAsync_ShouldSetCreatedAt()
        {
            using var context = _fixture.CreateInMemoryContext();
            var repo = _fixture.CreateRepository<Book>(context);
            var book = new Book { Title = "Test", PageCount = 10 };

            await repo.AddAsync(book);

            book.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        }
    }
}
