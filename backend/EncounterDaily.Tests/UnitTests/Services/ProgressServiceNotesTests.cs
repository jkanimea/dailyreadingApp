using EncounterDaily.Core.DTOs.Progress;
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
    public class ProgressServiceNotesTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IProgressRepository> _mockProgressRepo;
        private readonly Mock<IReadingRepository> _mockReadingRepo;
        private readonly IProgressService _service;

        private readonly DailyReading _reading = new()
        {
            Id = 1, SeriesId = 2, Month = 3, Day = 15,
            BibleReading = "John 3:16", PrimaryBookPageRange = "DA 1-5",
            Series = new Series { Id = 2, Name = "Christ The Way", ShortName = "CTW" }
        };

        public ProgressServiceNotesTests()
        {
            _mockProgressRepo = new Mock<IProgressRepository>();
            _mockReadingRepo = new Mock<IReadingRepository>();
            _mockUow = new Mock<IUnitOfWork>();
            _mockUow.Setup(u => u.Progress).Returns(_mockProgressRepo.Object);
            _mockUow.Setup(u => u.Readings).Returns(_mockReadingRepo.Object);
            _mockUow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);
            _service = new ProgressService(_mockUow.Object);
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldCreateNewProgress_WhenNoRecordExists()
        {
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_reading);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync((UserProgress?)null);
            _mockProgressRepo.Setup(r => r.AddAsync(It.IsAny<UserProgress>())).ReturnsAsync((UserProgress p) => p);

            var result = await _service.SaveNotesAsync(userId: 1, readingId: 1, notes: "Great reading today");

            result.Should().NotBeNull();
            result.Notes.Should().Be("Great reading today");
            result.IsCompleted.Should().BeFalse();
            _mockProgressRepo.Verify(r => r.AddAsync(It.Is<UserProgress>(p =>
                p.UserId == 1 &&
                p.SeriesId == 2 &&
                p.DailyReadingId == 1 &&
                p.Notes == "Great reading today" &&
                p.IsCompleted == false
            )), Times.Once);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldUpdateExistingRecord_WhenProgressExists()
        {
            var existing = new UserProgress
            {
                Id = 5, UserId = 1, SeriesId = 2, DailyReadingId = 1,
                IsCompleted = true, CompletedAt = DateTime.UtcNow,
                Notes = "Old note", DailyReading = _reading
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_reading);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(existing);

            var result = await _service.SaveNotesAsync(userId: 1, readingId: 1, notes: "Updated note");

            result.Should().NotBeNull();
            result!.Notes.Should().Be("Updated note");
            result.IsCompleted.Should().BeTrue();
            _mockProgressRepo.Verify(r => r.AddAsync(It.IsAny<UserProgress>()), Times.Never);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldDeleteRecord_WhenNotesEmptyAndNotCompleted()
        {
            var existing = new UserProgress
            {
                Id = 5, UserId = 1, SeriesId = 2, DailyReadingId = 1,
                IsCompleted = false, Notes = "Some old notes", DailyReading = _reading
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_reading);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(existing);

            await _service.SaveNotesAsync(userId: 1, readingId: 1, notes: "");

            _mockProgressRepo.Verify(r => r.DeleteAsync(existing.Id), Times.Once);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldPreserveNotes_WhenNotesEmptyButCompleted()
        {
            var existing = new UserProgress
            {
                Id = 5, UserId = 1, SeriesId = 2, DailyReadingId = 1,
                IsCompleted = true, Notes = "Some notes", DailyReading = _reading
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_reading);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(existing);

            var result = await _service.SaveNotesAsync(userId: 1, readingId: 1, notes: "");

            _mockProgressRepo.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
            result.Should().NotBeNull();
            result!.Notes.Should().BeNullOrEmpty();
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldThrow_WhenReadingNotFound()
        {
            _mockReadingRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((DailyReading?)null);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 999)).ReturnsAsync((UserProgress?)null);

            await _service.Invoking(s => s.SaveNotesAsync(1, 999, "note"))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task GetJournalAsync_ShouldReturnEntriesWithNotesOrCompletion()
        {
            var entries = new List<UserProgress>
            {
                new() { Id = 1, UserId = 1, SeriesId = 2, DailyReadingId = 1, IsCompleted = true,
                        CompletedAt = DateTime.UtcNow, Notes = "Great insight",
                        DailyReading = new DailyReading { Id = 1, Month = 1, Day = 5, BibleReading = "Mark 1:1",
                            PrimaryBookPageRange = "DA 1-5", Series = new Series { Name = "Christ The Way" } } },
                new() { Id = 2, UserId = 1, SeriesId = 2, DailyReadingId = 2, IsCompleted = false,
                        Notes = "Just notes, not complete",
                        DailyReading = new DailyReading { Id = 2, Month = 1, Day = 10, BibleReading = "Luke 2:1",
                            PrimaryBookPageRange = "DA 6-10", Series = new Series { Name = "Christ The Way" } } }
            };
            _mockProgressRepo.Setup(r => r.GetJournalEntriesAsync(1, 2)).ReturnsAsync(entries);

            var result = (await _service.GetJournalAsync(userId: 1, seriesId: 2)).ToList();

            result.Should().HaveCount(2);
            result[0].Notes.Should().Be("Great insight");
            result[0].IsCompleted.Should().BeTrue();
            result[1].IsCompleted.Should().BeFalse();
            result[1].Notes.Should().Be("Just notes, not complete");
        }

        [Fact]
        public async Task GetJournalAsync_ShouldReturnEmpty_WhenNoEntries()
        {
            _mockProgressRepo.Setup(r => r.GetJournalEntriesAsync(1, 99)).ReturnsAsync(new List<UserProgress>());

            var result = await _service.GetJournalAsync(userId: 1, seriesId: 99);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetJournalAsync_ShouldMapSecondaryPageRange_WhenPresent()
        {
            var entries = new List<UserProgress>
            {
                new() { Id = 1, UserId = 1, SeriesId = 2, DailyReadingId = 1, IsCompleted = true,
                        DailyReading = new DailyReading
                        {
                            Id = 1, Month = 2, Day = 1, BibleReading = "Acts 1:1",
                            PrimaryBookPageRange = "AA 1-5", SecondaryBookPageRange = "GC 10-15",
                            Series = new Series { Name = "Christ The Church" }
                        } }
            };
            _mockProgressRepo.Setup(r => r.GetJournalEntriesAsync(1, 2)).ReturnsAsync(entries);

            var result = (await _service.GetJournalAsync(1, 2)).ToList();

            result[0].SecondaryBookPageRange.Should().Be("GC 10-15");
        }
    }
}
