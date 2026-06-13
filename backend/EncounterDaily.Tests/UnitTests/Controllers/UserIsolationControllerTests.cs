using System.Security.Claims;
using EncounterDaily.API.Controllers;
using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers;

/// <summary>
/// Verifies that controllers correctly scope all data operations to the
/// authenticated user's ID, and that missing/wrong identity claims are rejected.
/// These tests catch regressions like BYPASS_AUTH being re-enabled or
/// GetUserId() silently falling back to a hardcoded user.
/// </summary>
[Trait("Category", "Unit")]
public class UserIsolationControllerTests
{
    // ── GetUserId throws when no identity claim ───────────────────────────────

    [Fact]
    public async Task Progress_GetSeriesProgress_Throws_WhenNoIdentityClaim()
    {
        var controller = MakeProgressController(userId: null);

        var act = async () => await controller.GetSeriesProgress(1);

        await act.Should().ThrowAsync<UnauthorizedAccessException>(
            "GetUserId must throw — not fall back to a hardcoded user — when the JWT has no identity claim");
    }

    [Fact]
    public async Task Progress_MarkComplete_Throws_WhenNoIdentityClaim()
    {
        var controller = MakeProgressController(userId: null);

        var act = async () => await controller.MarkComplete(1);

        await act.Should().ThrowAsync<UnauthorizedAccessException>(
            "Completing a reading must not silently use a hardcoded user when the JWT claim is missing");
    }

    [Fact]
    public async Task Bookmark_GetBookmarks_Throws_WhenNoIdentityClaim()
    {
        var controller = MakeBookmarkController(userId: null);

        var act = async () => await controller.GetBookmarks();

        await act.Should().ThrowAsync<UnauthorizedAccessException>(
            "Fetching bookmarks must not silently use a hardcoded user when the JWT claim is missing");
    }

    [Fact]
    public async Task Progress_GetJournal_Throws_WhenNoIdentityClaim()
    {
        var controller = MakeProgressController(userId: null);

        var act = async () => await controller.GetJournal(1);

        await act.Should().ThrowAsync<UnauthorizedAccessException>(
            "Fetching journal must not silently use a hardcoded user when the JWT claim is missing");
    }

    // ── Controllers forward the correct userId to services ───────────────────

    [Fact]
    public async Task Progress_GetSeriesProgress_ForwardsCorrectUserId()
    {
        var mockService = new Mock<IProgressService>();
        mockService.Setup(s => s.GetUserProgressForSeriesAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(Enumerable.Empty<ProgressDto>());

        var controllerA = MakeProgressController(userId: 10, service: mockService);
        var controllerB = MakeProgressController(userId: 20, service: mockService);

        await controllerA.GetSeriesProgress(1);
        await controllerB.GetSeriesProgress(1);

        mockService.Verify(s => s.GetUserProgressForSeriesAsync(10, 1), Times.Once,
            "Controller for user 10 must call the service with userId=10");
        mockService.Verify(s => s.GetUserProgressForSeriesAsync(20, 1), Times.Once,
            "Controller for user 20 must call the service with userId=20");
        mockService.Verify(s => s.GetUserProgressForSeriesAsync(
            It.Is<int>(id => id != 10 && id != 20), It.IsAny<int>()),
            Times.Never, "Controller must never substitute a hardcoded user id");
    }

    [Fact]
    public async Task Progress_GetJournal_ForwardsCorrectUserId()
    {
        var mockService = new Mock<IProgressService>();
        mockService.Setup(s => s.GetJournalAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(Enumerable.Empty<JournalEntryDto>());

        var controllerA = MakeProgressController(userId: 10, service: mockService);
        var controllerB = MakeProgressController(userId: 20, service: mockService);

        await controllerA.GetJournal(1);
        await controllerB.GetJournal(1);

        mockService.Verify(s => s.GetJournalAsync(10, 1), Times.Once);
        mockService.Verify(s => s.GetJournalAsync(20, 1), Times.Once);
        mockService.Verify(s => s.GetJournalAsync(
            It.Is<int>(id => id != 10 && id != 20), It.IsAny<int>()),
            Times.Never, "Journal must never be fetched using a hardcoded user id");
    }

    [Fact]
    public async Task Bookmark_GetBookmarks_ForwardsCorrectUserId()
    {
        var mockService = new Mock<IBookmarkService>();
        mockService.Setup(s => s.GetUserBookmarksAsync(It.IsAny<int>()))
            .ReturnsAsync(Enumerable.Empty<BookmarkDto>());

        var controllerA = MakeBookmarkController(userId: 10, service: mockService);
        var controllerB = MakeBookmarkController(userId: 20, service: mockService);

        await controllerA.GetBookmarks();
        await controllerB.GetBookmarks();

        mockService.Verify(s => s.GetUserBookmarksAsync(10), Times.Once);
        mockService.Verify(s => s.GetUserBookmarksAsync(20), Times.Once);
        mockService.Verify(s => s.GetUserBookmarksAsync(
            It.Is<int>(id => id != 10 && id != 20)),
            Times.Never, "Bookmarks must never be fetched using a hardcoded user id");
    }

    [Fact]
    public async Task Progress_MarkComplete_ForwardsCorrectUserId()
    {
        var mockService = new Mock<IProgressService>();
        mockService.Setup(s => s.MarkCompleteAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(new ProgressDto());

        var controllerA = MakeProgressController(userId: 10, service: mockService);
        var controllerB = MakeProgressController(userId: 20, service: mockService);

        await controllerA.MarkComplete(5);
        await controllerB.MarkComplete(5);

        mockService.Verify(s => s.MarkCompleteAsync(10, 5), Times.Once,
            "Marking complete for user 10 must use userId=10, not any other id");
        mockService.Verify(s => s.MarkCompleteAsync(20, 5), Times.Once,
            "Marking complete for user 20 must use userId=20, not any other id");
        mockService.Verify(s => s.MarkCompleteAsync(
            It.Is<int>(id => id != 10 && id != 20), It.IsAny<int>()),
            Times.Never);
    }

    // ── Two users with the same seriesId get independent results ─────────────

    [Fact]
    public async Task Progress_TwoUsers_SameSeriesId_GetDifferentResults()
    {
        var mockService = new Mock<IProgressService>();
        var progressA = new List<ProgressDto> { new ProgressDto { ReadingId = 1 } };
        var progressB = new List<ProgressDto> { new ProgressDto { ReadingId = 2 } };

        mockService.Setup(s => s.GetUserProgressForSeriesAsync(10, 1)).ReturnsAsync(progressA);
        mockService.Setup(s => s.GetUserProgressForSeriesAsync(20, 1)).ReturnsAsync(progressB);

        var controllerA = MakeProgressController(userId: 10, service: mockService);
        var controllerB = MakeProgressController(userId: 20, service: mockService);

        var resultA = (await controllerA.GetSeriesProgress(1)).Result as OkObjectResult;
        var resultB = (await controllerB.GetSeriesProgress(1)).Result as OkObjectResult;

        var dataA = resultA!.Value as IEnumerable<ProgressDto>;
        var dataB = resultB!.Value as IEnumerable<ProgressDto>;

        dataA.Should().NotBeEquivalentTo(dataB,
            "Two different users must receive different progress data for the same series");
        dataA!.Should().OnlyContain(p => p.ReadingId == 1);
        dataB!.Should().OnlyContain(p => p.ReadingId == 2);
    }

    [Fact]
    public async Task Journal_TwoUsers_SameSeriesId_GetDifferentEntries()
    {
        var mockService = new Mock<IProgressService>();
        var journalA = new List<JournalEntryDto> { new JournalEntryDto { Notes = "User A note" } };
        var journalB = new List<JournalEntryDto> { new JournalEntryDto { Notes = "User B note" } };

        mockService.Setup(s => s.GetJournalAsync(10, 1)).ReturnsAsync(journalA);
        mockService.Setup(s => s.GetJournalAsync(20, 1)).ReturnsAsync(journalB);

        var controllerA = MakeProgressController(userId: 10, service: mockService);
        var controllerB = MakeProgressController(userId: 20, service: mockService);

        var resultA = (await controllerA.GetJournal(1)).Result as OkObjectResult;
        var resultB = (await controllerB.GetJournal(1)).Result as OkObjectResult;

        var dataA = resultA!.Value as IEnumerable<JournalEntryDto>;
        var dataB = resultB!.Value as IEnumerable<JournalEntryDto>;

        dataA!.Should().OnlyContain(j => j.Notes == "User A note");
        dataB!.Should().OnlyContain(j => j.Notes == "User B note");
        dataA.Should().NotContain(j => j.Notes == "User B note",
            "User A's journal must never contain User B's notes");
        dataB.Should().NotContain(j => j.Notes == "User A note",
            "User B's journal must never contain User A's notes");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ProgressController MakeProgressController(
        int? userId,
        Mock<IProgressService>? service = null)
    {
        var ctrl = new ProgressController(
            (service ?? new Mock<IProgressService>()).Object,
            Mock.Of<IAiSummaryService>(),
            Mock.Of<ILogger<ProgressController>>(),
            Mock.Of<IAppLogService>());

        ctrl.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = MakePrincipal(userId) }
        };
        return ctrl;
    }

    private static BookmarkController MakeBookmarkController(
        int? userId,
        Mock<IBookmarkService>? service = null)
    {
        var ctrl = new BookmarkController(
            (service ?? new Mock<IBookmarkService>()).Object,
            Mock.Of<ILogger<BookmarkController>>(),
            Mock.Of<IAppLogService>());

        ctrl.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = MakePrincipal(userId) }
        };
        return ctrl;
    }

    private static ClaimsPrincipal MakePrincipal(int? userId)
    {
        if (userId == null)
            return new ClaimsPrincipal(new ClaimsIdentity()); // no claims — unauthenticated

        return new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString())
        }));
    }
}
