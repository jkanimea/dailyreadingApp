using EncounterDaily.Core.Interfaces.Services;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EncounterDaily.Services
{
    public class AiSummaryService : IAiSummaryService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<AiSummaryService> _logger;
        private readonly AiSettings _settings;

        public AiSummaryService(IHttpClientFactory httpClientFactory, IOptions<AiSettings> settings, ILogger<AiSummaryService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _settings = settings.Value;
        }

        public async Task<string> SummarizeAsync(string notes)
        {
            if (string.IsNullOrWhiteSpace(notes))
                throw new ArgumentException("Notes cannot be empty.", nameof(notes));

            var client = _httpClientFactory.CreateClient("DeepSeek");

            var request = new DeepSeekRequest
            {
                Model = "deepseek-chat",
                Messages =
                [
                    new DeepSeekMessage { Role = "system", Content = "Summarize these devotional notes in 2-3 clear sentences. Keep the core message and key reflections. Respond with only the summary." },
                    new DeepSeekMessage { Role = "user", Content = notes }
                ],
                MaxTokens = 300,
                Temperature = 0.5
            };

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.deepseek.com/v1/chat/completions");
            httpRequest.Headers.Add("Authorization", $"Bearer {_settings.DeepSeekApiKey}");
            httpRequest.Content = JsonContent.Create(request);

            try
            {
                var response = await client.SendAsync(httpRequest);
                response.EnsureSuccessStatusCode();

                var result = await response.Content.ReadFromJsonAsync<DeepSeekResponse>();
                var summary = result?.Choices?.FirstOrDefault()?.Message?.Content?.Trim();

                if (string.IsNullOrEmpty(summary))
                    throw new InvalidOperationException("DeepSeek returned an empty response.");

                return summary;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "DeepSeek API call failed");
                throw new InvalidOperationException("AI summarization failed. Please try again.");
            }
            catch (OperationCanceledException ex)
            {
                _logger.LogError(ex, "DeepSeek API call timed out");
                throw new InvalidOperationException("AI summarization timed out. Please try again.");
            }
        }

        private class DeepSeekRequest
        {
            [JsonPropertyName("model")]
            public string Model { get; set; } = "deepseek-chat";

            [JsonPropertyName("messages")]
            public DeepSeekMessage[] Messages { get; set; } = [];

            [JsonPropertyName("max_tokens")]
            public int MaxTokens { get; set; } = 300;

            [JsonPropertyName("temperature")]
            public double Temperature { get; set; } = 0.5;
        }

        private class DeepSeekMessage
        {
            [JsonPropertyName("role")]
            public string Role { get; set; } = "";

            [JsonPropertyName("content")]
            public string Content { get; set; } = "";
        }

        private class DeepSeekResponse
        {
            [JsonPropertyName("choices")]
            public DeepSeekChoice[]? Choices { get; set; }
        }

        private class DeepSeekChoice
        {
            [JsonPropertyName("message")]
            public DeepSeekMessage? Message { get; set; }
        }
    }

    public class AiSettings
    {
        public string DeepSeekApiKey { get; set; } = "";
    }
}
