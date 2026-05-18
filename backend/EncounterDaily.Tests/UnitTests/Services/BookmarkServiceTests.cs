using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Services;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class BookmarkServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IRepository<UserBookmark>> _mockRepo;
        private readonly Mock<IBookmarkRepository> _mockBookmarkRepo;
        private readonly Mock<IReadingRepository> _mockReadingRepo;
        private readonly IBookmarkService _service;

        public BookmarkServiceTests()
        {
            _mockRepo = new Mock<IRepository<UserBookmark>>();
            _mockBookmarkRepo = new Mock<IBookmarkRepository>();
            _mockReadingRepo = new Mock<IReadingRepository>();
            _mockUow = new Mock<IUnitOfWork>();
            _mockUow.Setup(u => u.Repository<UserBookmark>()).Returns(_mockRepo.Object);
            _mockUow.Setup(u => u.Bookmarks).Returns(_mockBookmarkRepo.Object);
            _mockUow.Setup(u => u.Readings).Returns(_mockReadingRepo.Object);
            _service = new BookmarkService(_mockUow.Object);
        }

        [Fact]
        public async Task GetUserBookmarksAsync_ShouldReturnBookmarks()
        {
            var bookmarks = new List<UserBookmark>
            {
                new UserBookmark { Id = 1, UserId = 1, DailyReadingId = 1 },
                new UserBookmark { Id = 2, UserId = 1, DailyReadingId = 2 }
            };
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarksAsync(1)).ReturnsAsync(bookmarks);

            var result = await _service.GetUserBookmarksAsync(1);

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetUserBookmarksAsync_ShouldReturnEmpty_WhenNoBookmarks()
        {
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarksAsync(1)).ReturnsAsync(new List<UserBookmark>());

            var result = await _service.GetUserBookmarksAsync(1);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetUserBookmarkAsync_ShouldReturnBookmark()
        {
            var bookmark = new UserBookmark { Id = 1, UserId = 1, DailyReadingId = 1 };
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarkAsync(1, 1)).ReturnsAsync(bookmark);

            var result = await _service.GetUserBookmarkAsync(1, 1);

            result.Should().NotBeNull();
            result!.Id.Should().Be(1);
        }

        [Fact]
        public async Task GetUserBookmarkAsync_ShouldReturnNull_WhenNotFound()
        {
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarkAsync(1, 999)).ReturnsAsync((UserBookmark?)null);

            var result = await _service.GetUserBookmarkAsync(1, 999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetUserBookmarksBySeriesAsync_ShouldReturnBookmarks()
        {
            var bookmarks = new List<UserBookmark>
            {
                new UserBookmark { Id = 1, UserId = 1, SeriesId = 1 }
            };
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarksBySeriesAsync(1, 1)).ReturnsAsync(bookmarks);

            var result = await _service.GetUserBookmarksBySeriesAsync(1, 1);

            result.Should().HaveCount(1);
        }

        [Fact]
        public async Task AddBookmarkAsync_ShouldCreateNew_WhenNotExists()
        {
            var reading = new DailyReading { Id = 1, SeriesId = 1, BibleReading = "John 3:16", PrimaryBookPageRange = "DA 1-5" };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(reading);
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarkAsync(1, 1)).ReturnsAsync((UserBookmark?)null);
            _mockBookmarkRepo.Setup(r => r.AddAsync(It.IsAny<UserBookmark>())).ReturnsAsync((UserBookmark b) => b);
            _mockUow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);

            var result = await _service.AddBookmarkAsync(1, 1);

            result.Should().NotBeNull();
            result.UserId.Should().Be(1);
            result.DailyReadingId.Should().Be(1);
        }

        [Fact]
        public async Task AddBookmarkAsync_ShouldReturnExisting_WhenAlreadyBookmarked()
        {
            var reading = new DailyReading { Id = 1, SeriesId = 1, BibleReading = "John 3:16", PrimaryBookPageRange = "DA 1-5" };
            var existing = new UserBookmark { Id = 1, UserId = 1, DailyReadingId = 1 };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(reading);
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarkAsync(1, 1)).ReturnsAsync(existing);

            var result = await _service.AddBookmarkAsync(1, 1);

            result.Id.Should().Be(1);
        }

        [Fact]
        public async Task AddBookmarkAsync_ShouldThrow_WhenReadingNotFound()
        {
            _mockReadingRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((DailyReading?)null);

            await _service.Invoking(s => s.AddBookmarkAsync(1, 999))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task RemoveBookmarkAsync_ShouldDelete_WhenExists()
        {
            var bookmark = new UserBookmark { Id = 1, UserId = 1, DailyReadingId = 1 };
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarkAsync(1, 1)).ReturnsAsync(bookmark);
            _mockUow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);

            await _service.RemoveBookmarkAsync(1, 1);
        }

        [Fact]
        public async Task RemoveBookmarkAsync_ShouldThrow_WhenNotFound()
        {
            _mockBookmarkRepo.Setup(r => r.GetUserBookmarkAsync(1, 999)).ReturnsAsync((UserBookmark?)null);

            await _service.Invoking(s => s.RemoveBookmarkAsync(1, 999))
                .Should().ThrowAsync<KeyNotFoundException>();
        }
    }
}
