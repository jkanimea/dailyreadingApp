using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Services;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class BaseServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IRepository<Book>> _mockRepo;
        private readonly TestBookService _service;

        public BaseServiceTests()
        {
            _mockRepo = new Mock<IRepository<Book>>();
            _mockUow = new Mock<IUnitOfWork>();
            _mockUow.Setup(u => u.Repository<Book>()).Returns(_mockRepo.Object);
            _service = new TestBookService(_mockUow.Object);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnEntity_WhenFound()
        {
            var book = new Book { Id = 1, Title = "Test Book" };
            _mockRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(book);

            var result = await _service.GetByIdAsync(1);

            result.Should().NotBeNull();
            result!.Id.Should().Be(1);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnNull_WhenNotFound()
        {
            _mockRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Book?)null);

            var result = await _service.GetByIdAsync(999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetAllAsync_ShouldReturnAllEntities()
        {
            var books = new List<Book>
            {
                new Book { Id = 1, Title = "Book 1" },
                new Book { Id = 2, Title = "Book 2" }
            };
            _mockRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(books);

            var result = await _service.GetAllAsync();

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task AddAsync_ShouldAddAndCallCompleteAsync()
        {
            var book = new Book { Title = "New Book" };
            _mockRepo.Setup(r => r.AddAsync(book)).ReturnsAsync(book);

            var result = await _service.AddAsync(book);

            result.Should().NotBeNull();
            _mockRepo.Verify(r => r.AddAsync(book), Times.Once);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_ShouldUpdateAndCallCompleteAsync()
        {
            var book = new Book { Id = 1, Title = "Updated" };

            await _service.UpdateAsync(book);

            _mockRepo.Verify(r => r.UpdateAsync(book), Times.Once);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task DeleteAsync_ShouldDelete_WhenEntityExists()
        {
            var book = new Book { Id = 1, Title = "To Delete" };
            _mockRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(book);

            await _service.DeleteAsync(1);

            _mockRepo.Verify(r => r.DeleteAsync(1), Times.Once);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task DeleteAsync_ShouldNotDelete_WhenEntityNotFound()
        {
            _mockRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Book?)null);

            await _service.DeleteAsync(999);

            _mockRepo.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Never);
        }

        private class TestBookService : BaseService<Book>
        {
            public TestBookService(IUnitOfWork unitOfWork) : base(unitOfWork) { }
        }
    }
}
