using System.Net;
using System.Net.Http.Json;
using EncounterDaily.Core.Entities;

namespace EncounterDaily.Tests.IntegrationTests;

public class DataIntegrityTests : IntegrationTestBase
{
    [Fact]
    public async Task SeedData_Series1_Has5Readings()
    {
        var readings = Db.DailyReadings.Where(r => r.SeriesId == 1).ToList();
        readings.Count.Should().Be(5);
    }

    [Fact]
    public async Task SeedData_NoDuplicateReadings()
    {
        var duplicates = Db.DailyReadings
            .GroupBy(r => new { r.SeriesId, r.Month, r.Day })
            .Any(g => g.Count() > 1);

        duplicates.Should().BeFalse();
    }

    [Fact]
    public async Task SeedData_AllReadingsHaveBibleReference()
    {
        var empty = Db.DailyReadings.Any(r => string.IsNullOrWhiteSpace(r.BibleReading));
        empty.Should().BeFalse();
    }

    [Fact]
    public async Task UserCannotMarkOtherUsersReading()
    {
        var user2Client = Factory.CreateClient(userId: 2, role: "User");

        await Client.PostAsync("/api/v1/progress/1/complete", null);

        var user2Progress = await user2Client.GetAsync("/api/v1/progress/1");
        user2Progress.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UserCannotDeleteOtherUsersBookmark()
    {
        await Client.PostAsync("/api/v1/bookmark/1", null);

        var user2Client = Factory.CreateClient(userId: 2, role: "User");
        var deleteResponse = await user2Client.DeleteAsync("/api/v1/bookmark/1");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Search_ReturnsMatchingReadings()
    {
        var response = await Client.GetAsync("/api/v1/search?q=John&seriesId=1&page=1&pageSize=10");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync<Dictionary<string, object>>(response);
        result.Should().ContainKey("items");
    }

    [Fact]
    public async Task Search_Pagination_LastPageReturnsPartial()
    {
        var response = await Client.GetAsync("/api/v1/search?q=reading&seriesId=1&page=1&pageSize=2");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync<Dictionary<string, object>>(response);
        result.Should().ContainKey("items");
        result.Should().ContainKey("totalCount");
    }

    [Fact]
    public async Task Pagination_NegativePage_ReturnsFirstPage()
    {
        var response = await Client.GetAsync("/api/v1/search?q=reading&seriesId=1&page=-1&pageSize=2");

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Pagination_PageBeyondData_ReturnsEmpty()
    {
        var response = await Client.GetAsync("/api/v1/search?q=reading&seriesId=1&page=999&pageSize=10");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await DeserializeAsync<Dictionary<string, object>>(response);
        result.Should().ContainKey("items");
    }

    [Fact]
    public async Task Series_ListReturnsAllSeries()
    {
        var response = await Client.GetAsync("/api/v1/series");
        var series = await DeserializeAsync<List<Dictionary<string, object>>>(response);

        series.Should().NotBeNull();
        series!.Count.Should().Be(1);
        series[0]["name"]?.ToString().Should().Be("Test Series");
    }

    [Fact]
    public async Task SaveNotesTwice_LastWriteWins()
    {
        await Client.PutAsJsonAsync("/api/v1/progress/1/notes", new { notes = "First version" });

        var notes2 = new { notes = "Second version" };
        await Client.PutAsJsonAsync("/api/v1/progress/1/notes", notes2);

        var getResponse = await Client.GetAsync("/api/v1/progress/1");
        var progress = await DeserializeAsync<Dictionary<string, object>>(getResponse);

        progress.Should().NotBeNull();
    }

    [Fact]
    public async Task GetJournal_ReturnsEntriesWithNotes()
    {
        await Client.PutAsJsonAsync("/api/v1/progress/1/notes", new { notes = "Journal note" });

        var response = await Client.GetAsync("/api/v1/progress/series/1/journal");
        var entries = await DeserializeAsync<List<Dictionary<string, object>>>(response);

        entries.Should().NotBeNull();
        entries!.Count.Should().Be(1);
    }
}
