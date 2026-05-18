using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Services;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class ProgressServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IRepository<UserProgress>> _mockRepo;
        private readonly Mock<IProgressRepository> _mockProgressRepo;
        private readonly IProgressService _service;

        public ProgressServiceTests()
        {
            _mockRepo = new Mock<IRepository<UserProgress>>();
            _mockProgressRepo = new Mock<IProgressRepository>();
            _mockUow = new Mock<IUnitOfWork>();
            _mockUow.Setup(u => u.Repository<UserProgress>()).Returns(_mockRepo.Object);
            _mockUow.Setup(u => u.Progress).Returns(_mockProgressRepo.Object);
            _service = new ProgressService(_mockUow.Object);
        }

        [Fact]
        public async Task GetUserReadingProgressAsync_ShouldReturnProgress()
        {
            var progress = new UserProgress { Id = 1, UserId = 1, DailyReadingId = 1 };
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(progress);

            var result = await _service.GetUserReadingProgressAsync(1, 1);

            result.Should().NotBeNull();
            result!.UserId.Should().Be(1);
        }

        [Fact]
        public async Task GetUserReadingProgressAsync_ShouldReturnNull_WhenNotFound()
        {
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 999)).ReturnsAsync((UserProgress?)null);

            var result = await _service.GetUserReadingProgressAsync(1, 999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetStreakAsync_ShouldReturnStreak()
        {
            _mockProgressRepo.Setup(r => r.GetStreakAsync(1, 1)).ReturnsAsync(5);

            var result = await _service.GetStreakAsync(1, 1);

            result.Should().Be(5);
        }

        [Fact]
        public async Task GetStreakAsync_ShouldReturnZero_WhenNoProgress()
        {
            _mockProgressRepo.Setup(r => r.GetStreakAsync(1, 1)).ReturnsAsync(0);

            var result = await _service.GetStreakAsync(1, 1);

            result.Should().Be(0);
        }

        [Fact]
        public async Task GetUserProgressForSeriesAsync_ShouldReturnProgressList()
        {
            var progressList = new List<UserProgress>
            {
                new UserProgress { Id = 1, UserId = 1, DailyReadingId = 1, IsCompleted = true },
                new UserProgress { Id = 2, UserId = 1, DailyReadingId = 2, IsCompleted = false }
            };
            _mockProgressRepo.Setup(r => r.GetUserProgressForSeriesAsync(1, 1)).ReturnsAsync(progressList);

            var result = await _service.GetUserProgressForSeriesAsync(1, 1);

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetCompletionPercentageAsync_ShouldReturnPercentage()
        {
            _mockProgressRepo.Setup(r => r.GetCompletionPercentageAsync(1, 1)).ReturnsAsync(50.0);

            var result = await _service.GetCompletionPercentageAsync(1, 1);

            result.Should().Be(50.0);
        }

        [Fact]
        public async Task GetCompletionPercentageAsync_ShouldReturnZero_WhenNoProgress()
        {
            _mockProgressRepo.Setup(r => r.GetCompletionPercentageAsync(1, 1)).ReturnsAsync(0.0);

            var result = await _service.GetCompletionPercentageAsync(1, 1);

            result.Should().Be(0.0);
        }
    }
}
