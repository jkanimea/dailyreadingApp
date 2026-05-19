using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public class SummarizeCommand
{
    private readonly string _connectionString;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly int _delayMs;
    private readonly bool _dryRun;
    private readonly int? _seriesFilter;

    private static readonly HttpClient _http = new();
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private int _totalProcessed;
    private int _totalErrors;

    public SummarizeCommand(string connectionString, string apiKey, string model, int delayMs, bool dryRun, int? seriesFilter)
    {
        _connectionString = connectionString;
        _apiKey = apiKey;
        _model = model;
        _delayMs = delayMs;
        _dryRun = dryRun;
        _seriesFilter = seriesFilter;
    }

    public async Task<int> ExecuteAsync()
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(_connectionString);
        using var context = new AppDbContext(optionsBuilder.Options);

        var query = context.Set<DailyReading>()
            .Include(r => r.Series)
            .Where(r => string.IsNullOrEmpty(r.SummaryPoints));

        if (_seriesFilter.HasValue)
            query = query.Where(r => r.SeriesId == _seriesFilter.Value);

        var readings = await query.OrderBy(r => r.SeriesId).ThenBy(r => r.Month).ThenBy(r => r.Day).ToListAsync();

        if (readings.Count == 0)
        {
            Console.WriteLine("No readings found needing summaries (all SummaryPoints are populated).");
            return 0;
        }

        Console.WriteLine($"Found {readings.Count} readings needing summaries.");
        if (_seriesFilter.HasValue)
            Console.WriteLine($"  Series filter: {_seriesFilter.Value}");
        Console.WriteLine($"  Model: {_model}");
        Console.WriteLine($"  Delay between calls: {_delayMs}ms");
        Console.WriteLine($"  Dry run: {_dryRun}");
        Console.WriteLine();

        if (_dryRun)
        {
            foreach (var r in readings)
                Console.WriteLine($"  Would summarize: Series {r.SeriesId} ({r.Series.Name}) - Day {r.Month}/{r.Day} - \"{r.PrimaryBookPageRange}\"");
            Console.WriteLine($"\nDry-run complete. {readings.Count} readings would be processed.");
            return 0;
        }

        var rng = new Random();

        for (int i = 0; i < readings.Count; i++)
        {
            var reading = readings[i];
            try
            {
                Console.Write($"[{i + 1}/{readings.Count}] Series {reading.SeriesId} - {reading.Month}/{reading.Day}... ");

                var bullets = await CallLlmWithRetryAsync(reading);
                reading.SummaryPoints = string.Join("\n", bullets.Select(b => $"- {b}"));
                await context.SaveChangesAsync();

                _totalProcessed++;
                Console.WriteLine($"OK ({bullets.Count} bullet points)");

                if (i < readings.Count - 1)
                    await Task.Delay(_delayMs + rng.Next(-100, 101));
            }
            catch (Exception ex)
            {
                _totalErrors++;
                Console.Error.WriteLine($"ERROR: {ex.Message}");
            }
        }

        Console.WriteLine($"\nDone. Processed: {_totalProcessed}, Errors: {_totalErrors}");
        return _totalErrors;
    }

    private async Task<List<string>> CallLlmWithRetryAsync(DailyReading reading, int maxRetries = 3)
    {
        int attempt = 0;
        while (true)
        {
            attempt++;
            try
            {
                return await CallLlmOnceAsync(reading);
            }
            catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests && attempt <= maxRetries)
            {
                int backoff = (int)Math.Pow(2, attempt) * 1000 + new Random().Next(0, 1000);
                Console.Write($"429 (rate limit), backing off {backoff / 1000}s... ");
                await Task.Delay(backoff);
            }
            catch (JsonException) when (attempt <= maxRetries)
            {
                Console.Write($"JSON parse error (attempt {attempt}), retrying... ");
                await Task.Delay(1000);
            }
        }
    }

    private async Task<List<string>> CallLlmOnceAsync(DailyReading reading)
    {
        string seriesType = reading.Series.SeriesType.ToString();
        bool hasSecondary = !string.IsNullOrEmpty(reading.FullTextSecondary);

        var systemPrompt = new StringBuilder();
        systemPrompt.AppendLine("You are an expert devotional editor. Summarize the provided devotional reading.");
        systemPrompt.AppendLine("You MUST output a JSON object containing a single array of strings named \"bullets\".");
        systemPrompt.AppendLine("Rules:");
        systemPrompt.AppendLine("1. The \"bullets\" array MUST contain between 3 and 6 items.");
        systemPrompt.AppendLine("2. Each bullet point MUST be a single, standalone sentence between 10 and 25 words.");
        systemPrompt.AppendLine("3. Do NOT include markdown, bullet characters (- or *), or conversational text.");
        systemPrompt.AppendLine("Format example:");
        systemPrompt.AppendLine("{");
        systemPrompt.AppendLine("  \"bullets\": [");
        systemPrompt.AppendLine("    \"Jesus displays true humility by washing His disciples' feet during the Passover supper.\",");
        systemPrompt.AppendLine("    \"The disciples are challenged to replicate this example of selfless service in their daily walk.\",");
        systemPrompt.AppendLine("    \"True greatness in God's kingdom is defined by our willingness to serve the lowest among us.\"");
        systemPrompt.AppendLine("  ]");
        systemPrompt.AppendLine("}");

        var userPrompt = new StringBuilder();
        userPrompt.AppendLine($"Series: {reading.Series.Name} ({seriesType})");
        userPrompt.AppendLine($"Reading: {reading.PrimaryBookPageRange}");
        userPrompt.AppendLine($"Bible Reference: {reading.BibleReading}");
        userPrompt.AppendLine();
        userPrompt.AppendLine("Primary Text:");
        userPrompt.AppendLine(reading.FullTextPrimary ?? "(no text)");

        if (hasSecondary)
        {
            userPrompt.AppendLine();
            userPrompt.AppendLine("Companion Text (synthesize both primary and companion together):");
            userPrompt.AppendLine(reading.FullTextSecondary);
        }

        userPrompt.AppendLine();
        userPrompt.AppendLine("Generate 3-6 bullet points summarizing the key themes, lessons, and applications from these passages.");

        var requestBody = new
        {
            model = _model,
            messages = new[]
            {
                new { role = "system", content = systemPrompt.ToString() },
                new { role = "user", content = userPrompt.ToString() }
            },
            response_format = new { type = "json_object" },
            temperature = 0.3,
            max_tokens = 500
        };

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://openrouter.ai/api/v1/chat/completions")
        {
            Headers = { { "Authorization", $"Bearer {_apiKey}" } },
            Content = JsonContent.Create(requestBody)
        };

        var response = await _http.SendAsync(httpRequest);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<OpenRouterResponse>(_jsonOptions);
        var content = body?.choices?[0]?.message?.content;
        if (string.IsNullOrEmpty(content))
            throw new JsonException("Empty response from LLM");

        var parsed = JsonSerializer.Deserialize<BulletsResponse>(content, _jsonOptions);
        if (parsed?.bullets == null || parsed.bullets.Count == 0)
            throw new JsonException("Response missing 'bullets' array");

        var validated = parsed.bullets
            .Where(b => b.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length >= 5)
            .Take(6)
            .ToList();

        if (validated.Count < 1)
            throw new JsonException("No valid bullets after word-count validation");

        return validated;
    }

    private class BulletsResponse
    {
        public List<string>? bullets { get; set; }
    }

    private class OpenRouterResponse
    {
        public List<OpenRouterChoice>? choices { get; set; }
    }

    private class OpenRouterChoice
    {
        public OpenRouterMessage? message { get; set; }
    }

    private class OpenRouterMessage
    {
        public string? content { get; set; }
    }
}
