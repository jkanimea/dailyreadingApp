using System.Net;
using System.Net.Http;
using System.Text.Json;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class AiSummaryServiceTests
    {
        private readonly Mock<IHttpClientFactory> _mockHttpFactory;
        private readonly Mock<ILogger<AiSummaryService>> _mockLogger;
        private readonly IOptions<AiSettings> _settings;
        private readonly IAiSummaryService _service;
        private readonly Mock<HttpMessageHandler> _mockHandler;

        private const string ValidApiKey = "sk-test-key-12345678901234567890";

        public AiSummaryServiceTests()
        {
            _mockHandler = new Mock<HttpMessageHandler>();
            _mockHttpFactory = new Mock<IHttpClientFactory>();
            _mockLogger = new Mock<ILogger<AiSummaryService>>();

            var client = new HttpClient(_mockHandler.Object);
            _mockHttpFactory.Setup(f => f.CreateClient("DeepSeek")).Returns(client);

            _settings = Options.Create(new AiSettings { DeepSeekApiKey = ValidApiKey });
            _service = new AiSummaryService(_mockHttpFactory.Object, _settings, _mockLogger.Object);
        }

        [Fact]
        public async Task SummarizeAsync_ShouldUseCorrectDeepSeekModel()
        {
            var notes = "Test notes about faith and devotion.";
            _mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync((HttpRequestMessage request, CancellationToken _) =>
                {
                    var body = request.Content!.ReadAsStringAsync().Result;
                    var json = JsonDocument.Parse(body);
                    var model = json.RootElement.GetProperty("model").GetString();

                    Assert.Equal("deepseek-v4-flash", model);

                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("""{"choices":[{"message":{"content":"Test summary"}}]}""")
                    };
                });

            var result = await _service.SummarizeAsync(notes);

            result.Should().Be("Test summary");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldSendRequestToCorrectEndpoint()
        {
            var notes = "Test notes.";
            Uri? actualUri = null;
            _mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync((HttpRequestMessage request, CancellationToken _) =>
                {
                    actualUri = request.RequestUri;
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("""{"choices":[{"message":{"content":"Summary"}}]}""")
                    };
                });

            await _service.SummarizeAsync(notes);

            actualUri!.AbsoluteUri.Should().Be("https://api.deepseek.com/v1/chat/completions");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldSetBearerAuthHeader()
        {
            var notes = "Test notes.";
            string? authHeader = null;
            _mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync((HttpRequestMessage request, CancellationToken _) =>
                {
                    authHeader = request.Headers.Authorization?.ToString();
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("""{"choices":[{"message":{"content":"Summary"}}]}""")
                    };
                });

            await _service.SummarizeAsync(notes);

            authHeader.Should().Be($"Bearer {ValidApiKey}");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldReturnSummaryFromResponse()
        {
            var notes = "Some devotional notes.";
            _mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"choices":[{"message":{"content":"Concise summary of the notes."}}]}""")
                });

            var result = await _service.SummarizeAsync(notes);

            result.Should().Be("Concise summary of the notes.");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldThrow_WhenApiKeyNotConfigured()
        {
            var emptySettings = Options.Create(new AiSettings { DeepSeekApiKey = "" });
            var service = new AiSummaryService(_mockHttpFactory.Object, emptySettings, _mockLogger.Object);

            await service.Invoking(s => s.SummarizeAsync("test notes"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*AI key not configured*");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldThrow_WhenNotesEmpty()
        {
            await _service.Invoking(s => s.SummarizeAsync(""))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Notes cannot be empty*");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldThrow_WhenNotesNull()
        {
            await _service.Invoking(s => s.SummarizeAsync(null!))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Notes cannot be empty*");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldThrow_WhenDeepSeekReturnsHttpError()
        {
            var notes = "Test notes.";
            _mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.BadRequest));

            await _service.Invoking(s => s.SummarizeAsync(notes))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*AI summarization failed*");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldThrow_WhenDeepSeekReturnsEmptyResponse()
        {
            var notes = "Test notes.";
            _mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"choices":[]}""")
                });

            await _service.Invoking(s => s.SummarizeAsync(notes))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*empty response*");
        }

        [Fact]
        public async Task SummarizeAsync_ShouldThrow_WhenDeepSeekTimesOut()
        {
            var notes = "Test notes.";
            _mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ThrowsAsync(new TaskCanceledException("The operation was canceled."));

            await _service.Invoking(s => s.SummarizeAsync(notes))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*timed out*");
        }
    }
}
