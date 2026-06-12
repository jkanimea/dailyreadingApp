using System.Security.Claims;
using EncounterDaily.API.Controllers;
using EncounterDaily.API.Services;
using EncounterDaily.Core.DTOs.Auth;
using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Middleware;

[Trait("Category", "Unit")]
public class ControllerErrorLoggingTests
{
    [Fact]
    public async Task AuthController_LogsToAppLogs_OnGoogleLoginFailure()
    {
        var appLog = new Mock<IAppLogService>();
        var auth = new Mock<IAuthService>();
        auth.Setup(a => a.LoginWithGoogleAsync(It.IsAny<string>())).ThrowsAsync(new UnauthorizedAccessException("bad token"));
        var ctrl = new AuthController(auth.Object, Mock.Of<ILogger<AuthController>>(), appLog.Object);

        var result = await ctrl.LoginWithGoogle(new LoginRequest { IdToken = "invalid" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
        appLog.Verify(s => s.SaveServerLogAsync("warn", "AuthController.LoginWithGoogle",
            It.IsAny<string>(), It.IsAny<string?>(), null, null, null), Times.Once);
    }

    [Fact]
    public async Task AuthController_LogsToAppLogs_OnFacebookLoginFailure()
    {
        var appLog = new Mock<IAppLogService>();
        var auth = new Mock<IAuthService>();
        auth.Setup(a => a.LoginWithFacebookAsync(It.IsAny<string>())).ThrowsAsync(new UnauthorizedAccessException("bad token"));
        var ctrl = new AuthController(auth.Object, Mock.Of<ILogger<AuthController>>(), appLog.Object);

        var result = await ctrl.LoginWithFacebook(new LoginRequest { IdToken = "invalid" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
        appLog.Verify(s => s.SaveServerLogAsync("warn", "AuthController.LoginWithFacebook",
            It.IsAny<string>(), It.IsAny<string?>(), null, null, null), Times.Once);
    }

    [Fact]
    public async Task AuthController_LogsToAppLogs_OnRefreshFailure()
    {
        var appLog = new Mock<IAppLogService>();
        var auth = new Mock<IAuthService>();
        auth.Setup(a => a.RefreshTokenAsync(It.IsAny<string>())).ThrowsAsync(new UnauthorizedAccessException("bad refresh"));
        var ctrl = new AuthController(auth.Object, Mock.Of<ILogger<AuthController>>(), appLog.Object);

        var result = await ctrl.Refresh(new RefreshRequest { RefreshToken = "bad" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
        appLog.Verify(s => s.SaveServerLogAsync("warn", "AuthController.Refresh",
            It.IsAny<string>(), It.IsAny<string?>(), null, null, null), Times.Once);
    }

    [Fact]
    public async Task ReadingController_LogsToAppLogs_OnTodayNotFound()
    {
        var appLog = new Mock<IAppLogService>();
        var reading = new Mock<IReadingService>();
        reading.Setup(r => r.GetTodayReadingAsync(It.IsAny<int>(), null, null)).ThrowsAsync(new KeyNotFoundException());
        var ctrl = new ReadingController(reading.Object, Mock.Of<IBibleSeedService>(), Mock.Of<ILogger<ReadingController>>(), appLog.Object);

        var result = await ctrl.GetToday(1);

        Assert.IsType<NotFoundObjectResult>(result.Result);
        appLog.Verify(s => s.SaveServerLogAsync("warn", "ReadingController.GetToday",
            It.IsAny<string>(), It.IsAny<string?>(), null, null, null), Times.Once);
    }

    [Fact]
    public async Task ReadingController_LogsToAppLogs_OnFullReadingNotFound()
    {
        var appLog = new Mock<IAppLogService>();
        var reading = new Mock<IReadingService>();
        reading.Setup(r => r.GetFullReadingAsync(It.IsAny<int>(), It.IsAny<string>())).ThrowsAsync(new KeyNotFoundException());
        var ctrl = new ReadingController(reading.Object, Mock.Of<IBibleSeedService>(), Mock.Of<ILogger<ReadingController>>(), appLog.Object);

        var result = await ctrl.GetFullReading(999);

        Assert.IsType<NotFoundResult>(result.Result);
        appLog.Verify(s => s.SaveServerLogAsync("warn", "ReadingController.GetFullReading",
            It.IsAny<string>(), It.IsAny<string?>(), null, null, null), Times.Once);
    }

    [Fact]
    public async Task ProgressController_LogsToAppLogs_OnMarkCompleteNotFound()
    {
        var appLog = new Mock<IAppLogService>();
        var progress = new Mock<IProgressService>();
        progress.Setup(p => p.MarkCompleteAsync(It.IsAny<int>(), It.IsAny<int>())).ThrowsAsync(new KeyNotFoundException("not found"));
        var ctrl = new ProgressController(progress.Object, Mock.Of<IAiSummaryService>(), Mock.Of<ILogger<ProgressController>>(), appLog.Object);
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "1") })) } };

        var result = await ctrl.MarkComplete(999);

        Assert.IsType<NotFoundObjectResult>(result.Result);
        appLog.Verify(s => s.SaveServerLogAsync("warn", "ProgressController.MarkComplete",
            It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int?>(), null, null), Times.Once);
    }

    [Fact]
    public async Task BookmarkController_LogsToAppLogs_OnAddBookmarkNotFound()
    {
        var appLog = new Mock<IAppLogService>();
        var bookmark = new Mock<IBookmarkService>();
        bookmark.Setup(b => b.AddBookmarkAsync(It.IsAny<int>(), It.IsAny<int>())).ThrowsAsync(new KeyNotFoundException("reading not found"));
        var ctrl = new BookmarkController(bookmark.Object, Mock.Of<ILogger<BookmarkController>>(), appLog.Object);
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "1") })) } };

        var result = await ctrl.AddBookmark(999);

        Assert.IsType<NotFoundObjectResult>(result.Result);
        appLog.Verify(s => s.SaveServerLogAsync("warn", "BookmarkController.AddBookmark",
            It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int?>(), null, null), Times.Once);
    }

    [Fact]
    public async Task BookmarkController_LogsToAppLogs_OnRemoveBookmarkNotFound()
    {
        var appLog = new Mock<IAppLogService>();
        var bookmark = new Mock<IBookmarkService>();
        bookmark.Setup(b => b.RemoveBookmarkAsync(It.IsAny<int>(), It.IsAny<int>())).ThrowsAsync(new KeyNotFoundException("reading not found"));
        var ctrl = new BookmarkController(bookmark.Object, Mock.Of<ILogger<BookmarkController>>(), appLog.Object);
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "1") })) } };

        var result = await ctrl.RemoveBookmark(999);

        Assert.IsType<NotFoundObjectResult>(result);
        appLog.Verify(s => s.SaveServerLogAsync("warn", "BookmarkController.RemoveBookmark",
            It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int?>(), null, null), Times.Once);
    }
}
