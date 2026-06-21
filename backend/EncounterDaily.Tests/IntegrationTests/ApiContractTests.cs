using System.Net;
using System.Net.Http.Json;

namespace EncounterDaily.Tests.IntegrationTests;

public class ApiContractTests : IntegrationTestBase
{
    [Fact]
    public async Task Health_Returns200()
    {
        var response = await AnonymousClient.GetAsync("/api/v1/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await DeserializeAsync<Dictionary<string, object>>(response);
        body.Should().ContainKey("status");
        body!["status"]?.ToString().Should().Be("healthy");
    }

    [Fact]
    public async Task Unauthenticated_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/v1/reading/1/full");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task NonAdmin_CannotAccessAdminEndpoint()
    {
        var response = await Client.GetAsync("/api/v1/logs");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Admin_CanAccessAdminEndpoint()
    {
        var adminClient = Factory.CreateClient(userId: 3, role: "Admin");
        var response = await adminClient.GetAsync("/api/v1/logs");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetReadingFull_WithInvalidId_Returns404()
    {
        var response = await Client.GetAsync("/api/v1/reading/9999/full");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task MarkComplete_ForNonExistentReading_Returns404()
    {
        var response = await Client.PostAsync("/api/v1/progress/9999/complete", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetTodayReading_WithOutOfRangeMonth_Returns400()
    {
        var response = await Client.GetAsync("/api/v1/reading/series/1/today?month=13&day=1");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Search_WithEmptyQuery_Returns400()
    {
        var response = await Client.GetAsync("/api/v1/search?q=");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
