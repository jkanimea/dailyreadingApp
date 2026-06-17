using EncounterDaily.API.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class HealthControllerTests
    {
        private readonly HealthController _controller;

        public HealthControllerTests()
        {
            _controller = new HealthController();
        }

        [Fact]
        public async Task GetHealth_ShouldReturnOk()
        {
            var result = await Task.FromResult(_controller.GetHealth());

            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task GetHealth_ShouldReturnHealthyStatus()
        {
            var result = await Task.FromResult(_controller.GetHealth());

            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            var value = okResult!.Value;
            value.Should().NotBeNull();

            var dict = value!.GetType().GetProperties()
                .ToDictionary(p => p.Name, p => p.GetValue(value)?.ToString());

            dict.Should().ContainKey("status");
            dict["status"].Should().Be("healthy");
            dict.Should().ContainKey("timestamp");
        }
    }
}
