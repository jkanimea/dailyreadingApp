using System.Net;
using System.Net.Http.Json;
using EncounterDaily.Core.DTOs.Progress;

namespace EncounterDaily.Tests.IntegrationTests;

public class ReadingWorkflowTests : IntegrationTestBase
{
    [Fact]
    public async Task GetTodaysReading_ReturnsReadingForCorrectDate()
    {
        var response = await Client.GetAsync("/api/v1/reading/series/1/today?month=1&day=3");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await DeserializeAsync<Dictionary<string, object>>(response);
        body.Should().ContainKey("id");
    }

    [Fact]
    public async Task GetReadingByDayNumber_ReturnsRequestedSeriesPosition()
    {
        var response = await AnonymousClient.GetAsync("/api/v1/reading/series/1/day/3");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var reading = await DeserializeAsync<Dictionary<string, object>>(response);
        reading.Should().ContainKey("id");
        reading!["id"]!.ToString().Should().Be("3");
    }

    [Fact]
    public async Task ResetSeries_KeepsNotesAndRemovesCompletion()
    {
        await Client.PutAsJsonAsync("/api/v1/progress/1/notes", new { notes = "Keep this note" });
        await Client.PostAsync("/api/v1/progress/1/complete", null);

        var response = await Client.PostAsJsonAsync("/api/v1/progress/series/1/reset", new { deleteNotes = false });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var progress = await DeserializeAsync<ProgressDto>(await Client.GetAsync("/api/v1/progress/1"));
        progress!.IsCompleted.Should().BeFalse();
        progress.Notes.Should().Be("Keep this note");
    }

    [Fact]
    public async Task ResetSeriesWithDeleteNotes_RemovesProgressButKeepsBookmarks()
    {
        await Client.PutAsJsonAsync("/api/v1/progress/1/notes", new { notes = "Delete this note" });
        await Client.PostAsync("/api/v1/progress/1/complete", null);
        await Client.PostAsync("/api/v1/bookmark/1", null);

        var response = await Client.PostAsJsonAsync("/api/v1/progress/series/1/reset", new { deleteNotes = true });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Client.GetAsync("/api/v1/progress/1")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var bookmarks = await DeserializeAsync<List<object>>(await Client.GetAsync("/api/v1/bookmark"));
        bookmarks.Should().ContainSingle();
    }

    [Fact]
    public async Task GetFullReading_IncludesBibleAndEgwText()
    {
        var response = await Client.GetAsync("/api/v1/reading/1/full");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await DeserializeAsync<Dictionary<string, object>>(response);
        body.Should().ContainKey("bibleReading");
        body!["bibleReading"]?.ToString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task MarkComplete_ThenStreak_ReturnsOne()
    {
        var markResponse = await Client.PostAsync("/api/v1/progress/1/complete", null);
        markResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var streakResponse = await Client.GetAsync("/api/v1/progress/series/1/streak");
        streakResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var streak = await streakResponse.Content.ReadFromJsonAsync<int>();
        streak.Should().Be(1);
    }

    [Fact]
    public async Task MarkComplete_ThenUnmark_ProgressGone()
    {
        await Client.PostAsync("/api/v1/progress/1/complete", null);
        var deleteResponse = await Client.DeleteAsync("/api/v1/progress/1/complete");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await Client.GetAsync("/api/v1/progress/1");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var progress = await DeserializeAsync<ProgressDto>(getResponse);
        progress.Should().NotBeNull();
        progress!.IsCompleted.Should().BeFalse();
    }

    [Fact]
    public async Task CompletionPercentage_AfterHalfSeries_Returns50()
    {
        await Client.PostAsync("/api/v1/progress/1/complete", null);
        await Client.PostAsync("/api/v1/progress/2/complete", null);

        var response = await Client.GetAsync("/api/v1/progress/series/1/percentage");
        var percentage = await response.Content.ReadFromJsonAsync<double>();

        percentage.Should().Be(40.0); // 2 out of 5 readings
    }

    [Fact]
    public async Task SaveNotes_ThenRetrieve_MatchesContent()
    {
        var notes = new { notes = "My test notes content" };
        var saveResponse = await Client.PutAsJsonAsync("/api/v1/progress/1/notes", notes);
        saveResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var getResponse = await Client.GetAsync("/api/v1/progress/1");
        var progress = await DeserializeAsync<ProgressDto>(getResponse);
        progress.Should().NotBeNull();
        progress!.Notes.Should().Be("My test notes content");
    }

    [Fact]
    public async Task AddBookmark_ThenList_ContainsReading()
    {
        var addResponse = await Client.PostAsync("/api/v1/bookmark/1", null);
        addResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var listResponse = await Client.GetAsync("/api/v1/bookmark");
        var bookmarks = await DeserializeAsync<List<Dictionary<string, object>>>(listResponse);

        bookmarks.Should().NotBeNull();
        bookmarks!.Count.Should().Be(1);
    }

    [Fact]
    public async Task AddBookmark_ThenRemove_ListEmpty()
    {
        await Client.PostAsync("/api/v1/bookmark/1", null);
        var deleteResponse = await Client.DeleteAsync("/api/v1/bookmark/1");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await Client.GetAsync("/api/v1/bookmark");
        var bookmarks = await DeserializeAsync<List<object>>(listResponse);

        bookmarks.Should().BeEmpty();
    }

    [Fact]
    public async Task AddBookmarkTwice_Idempotent()
    {
        await Client.PostAsync("/api/v1/bookmark/1", null);
        await Client.PostAsync("/api/v1/bookmark/1", null);

        var listResponse = await Client.GetAsync("/api/v1/bookmark");
        var bookmarks = await DeserializeAsync<List<object>>(listResponse);

        bookmarks!.Count.Should().Be(1);
    }

    [Fact]
    public async Task MarkCompleteTwice_Idempotent()
    {
        await Client.PostAsync("/api/v1/progress/1/complete", null);
        await Client.PostAsync("/api/v1/progress/1/complete", null);

        var listResponse = await Client.GetAsync("/api/v1/progress/series/1");
        var progress = await DeserializeAsync<List<ProgressDto>>(listResponse);

        progress!.Count(p => p.IsCompleted).Should().Be(1);
    }
}
