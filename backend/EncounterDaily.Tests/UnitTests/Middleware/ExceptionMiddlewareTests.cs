using System.Security.Claims;
using EncounterDaily.API.Middleware;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Middleware;

[Trait("Category", "Unit")]
public class ExceptionMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_CallsSaveServerLogAsync_WhenExceptionThrown()
    {
        var appLogService = new Mock<IAppLogService>();

        var scope = new Mock<IServiceScope>();
        var scopeFactory = new Mock<IServiceScopeFactory>();
        var serviceProvider = new Mock<IServiceProvider>();

        scope.Setup(s => s.ServiceProvider).Returns(serviceProvider.Object);
        scopeFactory.Setup(f => f.CreateScope()).Returns(scope.Object);
        serviceProvider.Setup(p => p.GetService(typeof(IAppLogService))).Returns(appLogService.Object);
        serviceProvider.Setup(p => p.GetService(typeof(ILogger<ExceptionMiddleware>))).Returns(Mock.Of<ILogger<ExceptionMiddleware>>());

        appLogService.Setup(s => s.SaveServerLogAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>(),
            It.IsAny<int?>(),
            It.IsAny<string?>(),
            It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "5"),
            new Claim(ClaimTypes.Email, "user@app.com")
        }));
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("10.0.0.1");

        RequestDelegate next = _ => throw new InvalidOperationException("Test exception");

        var middleware = new ExceptionMiddleware(next,
            Mock.Of<ILogger<ExceptionMiddleware>>(),
            scopeFactory.Object);

        await middleware.InvokeAsync(httpContext);

        appLogService.Verify(s => s.SaveServerLogAsync(
            "error",
            "ExceptionMiddleware",
            It.Is<string>(m => m.Contains("failed with InvalidOperationException")),
            It.Is<string>(e => e.Contains("InvalidOperationException")),
            5,
            "user@app.com",
            "10.0.0.1"
        ), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_Returns500_WhenExceptionThrown()
    {
        var scopeFactory = new Mock<IServiceScopeFactory>();
        var scope = new Mock<IServiceScope>();
        scopeFactory.Setup(f => f.CreateScope()).Returns(scope.Object);
        scope.Setup(s => s.ServiceProvider).Returns(new Mock<IServiceProvider>().Object);

        var httpContext = new DefaultHttpContext();
        RequestDelegate next = _ => throw new Exception("Boom");

        var middleware = new ExceptionMiddleware(next,
            Mock.Of<ILogger<ExceptionMiddleware>>(),
            scopeFactory.Object);

        await middleware.InvokeAsync(httpContext);

        Assert.Equal(500, httpContext.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_DoesNotLogToAppLogs_WhenNoException()
    {
        var appLogService = new Mock<IAppLogService>();

        var scope = new Mock<IServiceScope>();
        var scopeFactory = new Mock<IServiceScopeFactory>();
        var serviceProvider = new Mock<IServiceProvider>();

        scope.Setup(s => s.ServiceProvider).Returns(serviceProvider.Object);
        scopeFactory.Setup(f => f.CreateScope()).Returns(scope.Object);
        serviceProvider.Setup(p => p.GetService(typeof(IAppLogService))).Returns(appLogService.Object);
        serviceProvider.Setup(p => p.GetService(typeof(ILogger<ExceptionMiddleware>))).Returns(Mock.Of<ILogger<ExceptionMiddleware>>());

        var httpContext = new DefaultHttpContext();
        RequestDelegate next = _ => Task.CompletedTask;

        var middleware = new ExceptionMiddleware(next,
            Mock.Of<ILogger<ExceptionMiddleware>>(),
            scopeFactory.Object);

        await middleware.InvokeAsync(httpContext);

        appLogService.Verify(s => s.SaveServerLogAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()),
            Times.Never);
    }
}
