using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Services;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services;

/// <summary>
/// Verifies that journal, progress, bookmarks, and notes are strictly isolated per user.
/// User A must never see User B's data and vice versa.
/// </summary>
[Trait("Category", "Unit")]
public class UserDataIsolationTests
{
    private const int UserA = 10;
    private const int UserB = 20;
    private const int SeriesId = 1;

    // ── Progress isolation ────────────────────────────────────────────────────

    [Fact]
    public async Task Progress_UserA_DoesNotSeeUserB_CompletedReadings()
    {
        var mockProgress = new Mock<IProgressRepository>();
        var mockUow = BuildUow(progress: mockProgress);

        mockProgress.Setup(r => r.GetUserProgressForSeriesAsync(UserA, SeriesId))
            .ReturnsAsync([new UserProgress { UserId = UserA, DailyReadingId = 1, DailyReading = MakeReading(1), IsCompleted = true }]);

        mockProgress.Setup(r => r.GetUserProgressForSeriesAsync(UserB, SeriesId))
            .ReturnsAsync([new UserProgress { UserId = UserB, DailyReadingId = 2, DailyReading = MakeReading(2), IsCompleted = true }]);

        var svc = new ProgressService(mockUow.Object);
        var resultA = (await svc.GetUserProgressForSeriesAsync(UserA, SeriesId)).ToList();
        var resultB = (await svc.GetUserProgressForSeriesAsync(UserB, SeriesId)).ToList();

        resultA.Should().HaveCount(1).And.OnlyContain(p => p.ReadingId == 1);
        resultB.Should().HaveCount(1).And.OnlyContain(p => p.ReadingId == 2);
        resultA.Should().NotContain(p => p.ReadingId == 2, "User A must not see User B's completed readings");
        resultB.Should().NotContain(p => p.ReadingId == 1, "User B must not see User A's completed readings");
    }

    [Fact]
    public async Task Progress_ServicePassesCorrectUserId_ToRepository()
    {
        var mockProgress = new Mock<IProgressRepository>();
        var mockUow = BuildUow(progress: mockProgress);
        mockProgress.Setup(r => r.GetUserProgressForSeriesAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync([]);

        var svc = new ProgressService(mockUow.Object);
        await svc.GetUserProgressForSeriesAsync(UserA, SeriesId);
        await svc.GetUserProgressForSeriesAsync(UserB, SeriesId);

        mockProgress.Verify(r => r.GetUserProgressForSeriesAsync(UserA, SeriesId), Times.Once,
            "Service must forward User A's id to the repository");
        mockProgress.Verify(r => r.GetUserProgressForSeriesAsync(UserB, SeriesId), Times.Once,
            "Service must forward User B's id to the repository");
        mockProgress.Verify(r => r.GetUserProgressForSeriesAsync(
            It.Is<int>(id => id != UserA && id != UserB), It.IsAny<int>()),
            Times.Never, "Service must never query with an unexpected user id");
    }

    [Fact]
    public async Task Progress_MarkComplete_StoresCorrectUserId()
    {
        var mockProgress = new Mock<IProgressRepository>();
        var mockReadings = new Mock<IReadingRepository>();
        var mockUow = BuildUow(progress: mockProgress, readings: mockReadings);

        mockReadings.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(MakeReading(5));
        mockProgress.Setup(r => r.GetUserReadingProgressAsync(UserA, 5)).ReturnsAsync((UserProgress?)null);

        UserProgress? saved = null;
        mockProgress.Setup(r => r.AddAsync(It.IsAny<UserProgress>()))
            .Callback<UserProgress>(p => saved = p)
            .ReturnsAsync((UserProgress p) => p);

        var svc = new ProgressService(mockUow.Object);
        await svc.MarkCompleteAsync(UserA, 5);

        saved.Should().NotBeNull();
        saved!.UserId.Should().Be(UserA, "Completed reading must be stored under User A");
        saved.UserId.Should().NotBe(UserB, "Must not be stored under User B");
    }

    // ── Journal isolation ─────────────────────────────────────────────────────

    [Fact]
    public async Task Journal_UserA_DoesNotSeeUserB_Entries()
    {
        var mockProgress = new Mock<IProgressRepository>();
        var mockUow = BuildUow(progress: mockProgress);

        mockProgress.Setup(r => r.GetJournalEntriesAsync(UserA, SeriesId))
            .ReturnsAsync([new UserProgress { UserId = UserA, DailyReadingId = 1, DailyReading = MakeReading(1), Notes = "User A note", IsCompleted = true }]);

        mockProgress.Setup(r => r.GetJournalEntriesAsync(UserB, SeriesId))
            .ReturnsAsync([new UserProgress { UserId = UserB, DailyReadingId = 2, DailyReading = MakeReading(2), Notes = "User B note", IsCompleted = true }]);

        var svc = new ProgressService(mockUow.Object);
        var journalA = (await svc.GetJournalAsync(UserA, SeriesId)).ToList();
        var journalB = (await svc.GetJournalAsync(UserB, SeriesId)).ToList();

        journalA.Should().HaveCount(1).And.OnlyContain(j => j.Notes == "User A note");
        journalB.Should().HaveCount(1).And.OnlyContain(j => j.Notes == "User B note");
        journalA.Should().NotContain(j => j.Notes == "User B note", "User A must not see User B's journal");
        journalB.Should().NotContain(j => j.Notes == "User A note", "User B must not see User A's journal");
    }

    [Fact]
    public async Task Journal_ServicePassesCorrectUserId_ToRepository()
    {
        var mockProgress = new Mock<IProgressRepository>();
        var mockUow = BuildUow(progress: mockProgress);
        mockProgress.Setup(r => r.GetJournalEntriesAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync([]);

        var svc = new ProgressService(mockUow.Object);
        await svc.GetJournalAsync(UserA, SeriesId);
        await svc.GetJournalAsync(UserB, SeriesId);

        mockProgress.Verify(r => r.GetJournalEntriesAsync(UserA, SeriesId), Times.Once);
        mockProgress.Verify(r => r.GetJournalEntriesAsync(UserB, SeriesId), Times.Once);
        mockProgress.Verify(r => r.GetJournalEntriesAsync(
            It.Is<int>(id => id != UserA && id != UserB), It.IsAny<int>()),
            Times.Never, "Journal query must never use an unexpected user id");
    }

    [Fact]
    public async Task Notes_SavedForUserA_DoNotOverwriteUserB_Progress()
    {
        var mockProgress = new Mock<IProgressRepository>();
        var mockReadings = new Mock<IReadingRepository>();
        var mockUow = BuildUow(progress: mockProgress, readings: mockReadings);

        mockReadings.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(MakeReading(3));
        var progressA = new UserProgress { Id = 1, UserId = UserA, DailyReadingId = 3, DailyReading = MakeReading(3) };
        mockProgress.Setup(r => r.GetUserReadingProgressAsync(UserA, 3)).ReturnsAsync(progressA);
        mockProgress.Setup(r => r.GetUserReadingProgressAsync(UserB, 3)).ReturnsAsync((UserProgress?)null);

        var svc = new ProgressService(mockUow.Object);
        await svc.SaveNotesAsync(UserA, 3, "Private note from A");

        progressA.Notes.Should().Be("Private note from A");

        // The service must only have looked up User A's record, never User B's
        mockProgress.Verify(r => r.GetUserReadingProgressAsync(UserA, 3), Times.Once);
        mockProgress.Verify(r => r.GetUserReadingProgressAsync(UserB, 3), Times.Never,
            "Saving notes for User A must never touch User B's progress record");
    }

    // ── Bookmark isolation ────────────────────────────────────────────────────

    [Fact]
    public async Task Bookmarks_UserA_DoesNotSeeUserB_Bookmarks()
    {
        var mockBookmarks = new Mock<IBookmarkRepository>();
        var mockUow = BuildUow(bookmarks: mockBookmarks);

        mockBookmarks.Setup(r => r.GetUserBookmarksAsync(UserA))
            .ReturnsAsync([new UserBookmark { UserId = UserA, DailyReadingId = 1, SeriesId = SeriesId, DailyReading = MakeReading(1) }]);

        mockBookmarks.Setup(r => r.GetUserBookmarksAsync(UserB))
            .ReturnsAsync([new UserBookmark { UserId = UserB, DailyReadingId = 2, SeriesId = SeriesId, DailyReading = MakeReading(2) }]);

        var svc = new BookmarkService(mockUow.Object);
        var bookmarksA = (await svc.GetUserBookmarksAsync(UserA)).ToList();
        var bookmarksB = (await svc.GetUserBookmarksAsync(UserB)).ToList();

        bookmarksA.Should().HaveCount(1).And.OnlyContain(b => b.ReadingId == 1);
        bookmarksB.Should().HaveCount(1).And.OnlyContain(b => b.ReadingId == 2);
        bookmarksA.Should().NotContain(b => b.ReadingId == 2, "User A must not see User B's bookmarks");
        bookmarksB.Should().NotContain(b => b.ReadingId == 1, "User B must not see User A's bookmarks");
    }

    [Fact]
    public async Task Bookmarks_ServicePassesCorrectUserId_ToRepository()
    {
        var mockBookmarks = new Mock<IBookmarkRepository>();
        var mockUow = BuildUow(bookmarks: mockBookmarks);
        mockBookmarks.Setup(r => r.GetUserBookmarksAsync(It.IsAny<int>())).ReturnsAsync([]);

        var svc = new BookmarkService(mockUow.Object);
        await svc.GetUserBookmarksAsync(UserA);
        await svc.GetUserBookmarksAsync(UserB);

        mockBookmarks.Verify(r => r.GetUserBookmarksAsync(UserA), Times.Once);
        mockBookmarks.Verify(r => r.GetUserBookmarksAsync(UserB), Times.Once);
        mockBookmarks.Verify(r => r.GetUserBookmarksAsync(It.Is<int>(id => id != UserA && id != UserB)),
            Times.Never, "Bookmark query must never use an unexpected user id");
    }

    [Fact]
    public async Task Bookmarks_AddBookmark_StoresCorrectUserId()
    {
        var mockBookmarks = new Mock<IBookmarkRepository>();
        var mockReadings = new Mock<IReadingRepository>();
        var mockUow = BuildUow(bookmarks: mockBookmarks, readings: mockReadings);

        mockReadings.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(MakeReading(7));
        mockBookmarks.Setup(r => r.GetUserBookmarkAsync(UserA, 7)).ReturnsAsync((UserBookmark?)null);

        UserBookmark? saved = null;
        mockBookmarks.Setup(r => r.AddAsync(It.IsAny<UserBookmark>()))
            .Callback<UserBookmark>(b => saved = b)
            .ReturnsAsync((UserBookmark b) => b);

        var svc = new BookmarkService(mockUow.Object);
        await svc.AddBookmarkAsync(UserA, 7);

        saved.Should().NotBeNull();
        saved!.UserId.Should().Be(UserA, "Bookmark must be stored under User A");
        saved.UserId.Should().NotBe(UserB, "Bookmark must not be stored under User B");
    }

    // ── Streak isolation ──────────────────────────────────────────────────────

    [Fact]
    public async Task Streak_IsCalculatedPerUser_NotShared()
    {
        var mockProgress = new Mock<IProgressRepository>();
        var mockUow = BuildUow(progress: mockProgress);

        mockProgress.Setup(r => r.GetStreakAsync(UserA, SeriesId)).ReturnsAsync(7);
        mockProgress.Setup(r => r.GetStreakAsync(UserB, SeriesId)).ReturnsAsync(2);

        var svc = new ProgressService(mockUow.Object);
        var streakA = await svc.GetStreakAsync(UserA, SeriesId);
        var streakB = await svc.GetStreakAsync(UserB, SeriesId);

        streakA.Should().Be(7);
        streakB.Should().Be(2);
        streakA.Should().NotBe(streakB, "Each user must have their own independent streak");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static DailyReading MakeReading(int id) => new()
    {
        Id = id, SeriesId = SeriesId, Month = 1, Day = id,
        BibleReading = $"John {id}:1", PrimaryBookPageRange = $"pp. {id}"
    };

    private static Mock<IUnitOfWork> BuildUow(
        Mock<IProgressRepository>? progress = null,
        Mock<IBookmarkRepository>? bookmarks = null,
        Mock<IReadingRepository>? readings = null)
    {
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.Progress).Returns((progress ?? new Mock<IProgressRepository>()).Object);
        uow.Setup(u => u.Bookmarks).Returns((bookmarks ?? new Mock<IBookmarkRepository>()).Object);
        uow.Setup(u => u.Readings).Returns((readings ?? new Mock<IReadingRepository>()).Object);
        uow.Setup(u => u.Repository<UserProgress>()).Returns(new Mock<IRepository<UserProgress>>().Object);
        uow.Setup(u => u.Repository<UserBookmark>()).Returns(new Mock<IRepository<UserBookmark>>().Object);
        uow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);
        return uow;
    }
}
