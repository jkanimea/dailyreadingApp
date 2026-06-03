using System.Security.Claims;
using EncounterDaily.API.Controllers;
using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Interfaces.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class ProgressControllerNotesTests
    {
        private readonly Mock<IProgressService> _mockService;
        private readonly ProgressController _controller;

        public ProgressControllerNotesTests()
        {
            _mockService = new Mock<IProgressService>();
            _controller = new ProgressController(_mockService.Object, Mock.Of<IAiSummaryService>(), Mock.Of<ILogger<ProgressController>>());
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "1")
                    }))
                }
            };
        }

        [Fact]
        public async Task GetProgress_ShouldReturnOk_WhenFound()
        {
            var dto = new ProgressDto { ReadingId = 1, Notes = "Existing note", IsCompleted = true };
            _mockService.Setup(s => s.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(dto);

            var result = await _controller.GetProgress(1);

            var ok = result.Result as OkObjectResult;
            ok.Should().NotBeNull();
            ok!.StatusCode.Should().Be(200);
            (ok.Value as ProgressDto)!.Notes.Should().Be("Existing note");
        }

        [Fact]
        public async Task GetProgress_ShouldReturnNotFound_WhenNoProgress()
        {
            _mockService.Setup(s => s.GetUserReadingProgressAsync(1, 999)).ReturnsAsync((ProgressDto?)null);

            var result = await _controller.GetProgress(999);

            result.Result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task SaveNotes_ShouldReturnOk_WhenValid()
        {
            var dto = new ProgressDto { ReadingId = 1, Notes = "Saved note" };
            _mockService.Setup(s => s.SaveNotesAsync(1, 1, "Saved note")).ReturnsAsync(dto);

            var result = await _controller.SaveNotes(1, new SaveNotesRequest { Notes = "Saved note" });

            var ok = result.Result as OkObjectResult;
            ok.Should().NotBeNull();
            ok!.StatusCode.Should().Be(200);
            (ok.Value as ProgressDto)!.Notes.Should().Be("Saved note");
        }

        [Fact]
        public async Task SaveNotes_ShouldReturnNoContent_WhenRecordDeleted()
        {
            _mockService.Setup(s => s.SaveNotesAsync(1, 1, "")).ReturnsAsync((ProgressDto?)null);

            var result = await _controller.SaveNotes(1, new SaveNotesRequest { Notes = "" });

            result.Result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task SaveNotes_ShouldReturnBadRequest_WhenNotesExceed2000Chars()
        {
            var longNotes = new string('x', 2001);

            var result = await _controller.SaveNotes(1, new SaveNotesRequest { Notes = longNotes });

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task SaveNotes_ShouldReturnNotFound_WhenReadingMissing()
        {
            _mockService.Setup(s => s.SaveNotesAsync(1, 999, It.IsAny<string?>()))
                .ThrowsAsync(new KeyNotFoundException("Reading 999 not found"));

            var result = await _controller.SaveNotes(999, new SaveNotesRequest { Notes = "note" });

            result.Result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task GetJournal_ShouldReturnOk_WithEntries()
        {
            var entries = new List<JournalEntryDto>
            {
                new() { ReadingId = 1, Month = 1, Day = 5, BibleReading = "Mark 1:1",
                        PrimaryBookPageRange = "DA 1-5", IsCompleted = true, Notes = "Great insight" },
                new() { ReadingId = 2, Month = 1, Day = 10, BibleReading = "Luke 2:1",
                        PrimaryBookPageRange = "DA 6-10", IsCompleted = false, Notes = "Notes only" }
            };
            _mockService.Setup(s => s.GetJournalAsync(1, 2)).ReturnsAsync(entries);

            var result = await _controller.GetJournal(2);

            var ok = result.Result as OkObjectResult;
            ok.Should().NotBeNull();
            (ok!.Value as IEnumerable<JournalEntryDto>).Should().HaveCount(2);
        }

        [Fact]
        public async Task GetJournal_ShouldReturnOk_WithEmptyList_WhenNoEntries()
        {
            _mockService.Setup(s => s.GetJournalAsync(1, 99)).ReturnsAsync(new List<JournalEntryDto>());

            var result = await _controller.GetJournal(99);

            var ok = result.Result as OkObjectResult;
            ok.Should().NotBeNull();
            (ok!.Value as IEnumerable<JournalEntryDto>).Should().BeEmpty();
        }
    }
}
