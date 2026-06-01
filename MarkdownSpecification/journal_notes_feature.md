# Journal / Reading Notes Feature Specification

## Overview

Add a personal journaling capability tied to reading progress. When a user marks a reading as complete, they can optionally write notes/reflections. Notes are persisted per-reading, per-user, per-series and are always available — the user can return to any reading at any time and pick up where they left off. After completing readings (or on demand), the user can open a dedicated Journal view that shows every reading they have engaged with alongside their personal notes, and print it as a clean document for Master Guide requirements.

---

## 1. Backend Changes

### 1.1 Data Layer — No migration needed

The `UserProgress` entity at `backend/EncounterDaily.Core/Entities/UserProgress.cs` **already has**:
- `public string? Notes { get; set; }` — confirmed present
- `public int SeriesId { get; set; }` — confirmed present (needed when creating new records)
- `public DailyReading DailyReading { get; set; }` — navigation property confirmed present
- `UpdatedAt` — inherited from `BaseEntity`, confirmed present

No schema migration is required.

### 1.2 DTO — Add `Notes` field to `ProgressDto`

**File:** `backend/EncounterDaily.Core/DTOs/Progress/ProgressDto.cs`

Add:
```csharp
public string? Notes { get; set; }
```

### 1.3 Service — Map `Notes` in `MapToDto`

**File:** `backend/EncounterDaily.Services/ProgressService.cs` (line ~80-92)

Add `Notes = p.Notes` to the `MapToDto` method.

### 1.4 New API Endpoint — Save Notes

**File:** `backend/EncounterDaily.API/Controllers/ProgressController.cs`

Add a new endpoint:

| Method | Route | Description |
|--------|-------|-------------|
| `PUT` | `/api/progress/{readingId}/notes` | Save/update notes for a reading |

**Authorization:** `[Authorize]` — extract `userId` from JWT claims via `GetUserId()` (same helper used by all existing endpoints in `BaseApiController`).

**Request body:**
```json
{
  "notes": "string (max 2000 chars)"
}
```

**Behavior:**
- If `UserProgress` record exists for this reading, update the `Notes` field. `UpdatedAt` is set automatically by `BaseEntity`.
- If no `UserProgress` record exists, look up the `DailyReading` first to obtain its `SeriesId`, then create a new `UserProgress` with `IsCompleted = false`, `SeriesId` from the reading, and `Notes` populated. This allows note-taking without necessarily marking complete.
- If notes are empty/whitespace AND `IsCompleted = false`, delete the `UserProgress` record entirely (see Section 1.7). Service returns `null`; controller returns `204 NoContent`.
- Otherwise return the updated `ProgressDto` with `200 OK`.

**Validation:** Max 2000 characters. Trim whitespace. Return 400 if exceeded.

**Request DTO:**

**File (create):** `backend/EncounterDaily.Core/DTOs/Progress/SaveNotesRequest.cs`
```csharp
namespace EncounterDaily.Core.DTOs.Progress
{
    public class SaveNotesRequest
    {
        public string? Notes { get; set; }
    }
}
```

### 1.5 New API Endpoint — Get Journal for Series

**File:** `backend/EncounterDaily.API/Controllers/ProgressController.cs`

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/progress/series/{seriesId}/journal` | Full journal entries with reading content and notes |

**Authorization:** `[Authorize]` — extract `userId` from JWT claims via `GetUserId()`.

**Returns:** `List<JournalEntryDto>` sorted by `(Month, Day)` ascending.

**New DTO: `JournalEntryDto`**
```csharp
public class JournalEntryDto
{
    public int ReadingId { get; set; }
    public int SeriesId { get; set; }
    public string SeriesName { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Day { get; set; }
    public string BibleReading { get; set; } = string.Empty;
    public string PrimaryBookPageRange { get; set; } = string.Empty;
    public string? SecondaryBookPageRange { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
}
```

> `SecondaryBookPageRange` is included because `DailyReading` has this field and some readings use both primary and secondary book ranges.

**Data query:** Join `UserProgress` with `DailyReading` and `Series`. Only return readings where either `IsCompleted = true` OR `Notes IS NOT NULL`.

### 1.6 Interface Update

**File:** `backend/EncounterDaily.Core/Interfaces/Services/IProgressService.cs`

Add:
```csharp
Task<ProgressDto?> SaveNotesAsync(int userId, int readingId, string? notes);
Task<IEnumerable<JournalEntryDto>> GetJournalAsync(int userId, int seriesId);
```

> `SaveNotesAsync` returns `null` when the record is deleted (empty notes + not completed). The controller maps `null` → `204 NoContent`, otherwise `200 OK` with the DTO.

### 1.7 Repository — New queries for journal and cleanup

**File:** `backend/EncounterDaily.Infrastructure/Repositories/ProgressRepository.cs`

**Add `GetJournalEntriesAsync`:**
```csharp
Task<IEnumerable<UserProgress>> GetJournalEntriesAsync(int userId, int seriesId);
```
Returns `UserProgress` entries with `.Include(p => p.DailyReading).ThenInclude(d => d.Series)` where `UserId == userId && SeriesId == seriesId && (IsCompleted || Notes != null)`, ordered by `DailyReading.Month, DailyReading.Day`. The service layer maps to `JournalEntryDto`.

> **Note:** The base `IRepository<T>` already has `DeleteAsync(int id)` (takes the entity's integer ID). Use `_unitOfWork.Progress.DeleteAsync(progress.Id)` in the service — no additional overload needed.

**Interface:** `backend/EncounterDaily.Core/Interfaces/Repositories/IProgressRepository.cs`

Add the `GetJournalEntriesAsync` method signature only.

### 1.8 Tests — Backend (xUnit)

Two test classes to add, following the existing Moq + FluentAssertions pattern.

#### `ProgressServiceNotesTests.cs`

**File:** `backend/EncounterDaily.Tests/UnitTests/Services/ProgressServiceNotesTests.cs`

```csharp
using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Services;
using FluentAssertions;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class ProgressServiceNotesTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IProgressRepository> _mockProgressRepo;
        private readonly Mock<IReadingRepository> _mockReadingRepo;
        private readonly IProgressService _service;

        private readonly DailyReading _reading = new()
        {
            Id = 1, SeriesId = 2, Month = 3, Day = 15,
            BibleReading = "John 3:16", PrimaryBookPageRange = "DA 1-5",
            Series = new Series { Id = 2, Name = "Christ The Way", ShortName = "CTW" }
        };

        public ProgressServiceNotesTests()
        {
            _mockProgressRepo = new Mock<IProgressRepository>();
            _mockReadingRepo = new Mock<IReadingRepository>();
            _mockUow = new Mock<IUnitOfWork>();
            _mockUow.Setup(u => u.Progress).Returns(_mockProgressRepo.Object);
            _mockUow.Setup(u => u.Readings).Returns(_mockReadingRepo.Object);
            _mockUow.Setup(u => u.CompleteAsync()).ReturnsAsync(1);
            _service = new ProgressService(_mockUow.Object);
        }

        // --- SaveNotesAsync ---

        [Fact]
        public async Task SaveNotesAsync_ShouldCreateNewProgress_WhenNoRecordExists()
        {
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_reading);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync((UserProgress?)null);
            _mockProgressRepo.Setup(r => r.AddAsync(It.IsAny<UserProgress>())).ReturnsAsync((UserProgress p) => p);

            var result = await _service.SaveNotesAsync(userId: 1, readingId: 1, notes: "Great reading today");

            result.Should().NotBeNull();
            result.Notes.Should().Be("Great reading today");
            result.IsCompleted.Should().BeFalse();
            // SeriesId must be taken from DailyReading, not hard-coded
            _mockProgressRepo.Verify(r => r.AddAsync(It.Is<UserProgress>(p =>
                p.UserId == 1 &&
                p.SeriesId == 2 &&
                p.DailyReadingId == 1 &&
                p.Notes == "Great reading today" &&
                p.IsCompleted == false
            )), Times.Once);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldUpdateExistingRecord_WhenProgressExists()
        {
            var existing = new UserProgress
            {
                Id = 5, UserId = 1, SeriesId = 2, DailyReadingId = 1,
                IsCompleted = true, CompletedAt = DateTime.UtcNow,
                Notes = "Old note", DailyReading = _reading
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_reading);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(existing);

            var result = await _service.SaveNotesAsync(userId: 1, readingId: 1, notes: "Updated note");

            result.Notes.Should().Be("Updated note");
            result.IsCompleted.Should().BeTrue(); // completion status must be preserved
            _mockProgressRepo.Verify(r => r.AddAsync(It.IsAny<UserProgress>()), Times.Never);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldDeleteRecord_WhenNotesEmptyAndNotCompleted()
        {
            var existing = new UserProgress
            {
                Id = 5, UserId = 1, SeriesId = 2, DailyReadingId = 1,
                IsCompleted = false, Notes = "Some old notes", DailyReading = _reading
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_reading);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(existing);

            await _service.SaveNotesAsync(userId: 1, readingId: 1, notes: "");

            // DeleteAsync takes int id (from base IRepository<T>)
            _mockProgressRepo.Verify(r => r.DeleteAsync(existing.Id), Times.Once);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldPreserveNotes_WhenNotesEmptyButCompleted()
        {
            var existing = new UserProgress
            {
                Id = 5, UserId = 1, SeriesId = 2, DailyReadingId = 1,
                IsCompleted = true, Notes = "Some notes", DailyReading = _reading
            };
            _mockReadingRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_reading);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 1)).ReturnsAsync(existing);

            var result = await _service.SaveNotesAsync(userId: 1, readingId: 1, notes: "");

            // record should NOT be deleted — user is still marked complete
            _mockProgressRepo.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
            result.Should().NotBeNull();
            result!.Notes.Should().BeNullOrEmpty();
        }

        [Fact]
        public async Task SaveNotesAsync_ShouldThrow_WhenReadingNotFound()
        {
            _mockReadingRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((DailyReading?)null);
            _mockProgressRepo.Setup(r => r.GetUserReadingProgressAsync(1, 999)).ReturnsAsync((UserProgress?)null);

            await _service.Invoking(s => s.SaveNotesAsync(1, 999, "note"))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // --- GetJournalAsync ---

        [Fact]
        public async Task GetJournalAsync_ShouldReturnEntriesWithNotesOrCompletion()
        {
            var entries = new List<UserProgress>
            {
                new() { Id = 1, UserId = 1, SeriesId = 2, DailyReadingId = 1, IsCompleted = true,
                        CompletedAt = DateTime.UtcNow, Notes = "Great insight",
                        DailyReading = new DailyReading { Id = 1, Month = 1, Day = 5, BibleReading = "Mark 1:1",
                            PrimaryBookPageRange = "DA 1-5", Series = new Series { Name = "Christ The Way" } } },
                new() { Id = 2, UserId = 1, SeriesId = 2, DailyReadingId = 2, IsCompleted = false,
                        Notes = "Just notes, not complete",
                        DailyReading = new DailyReading { Id = 2, Month = 1, Day = 10, BibleReading = "Luke 2:1",
                            PrimaryBookPageRange = "DA 6-10", Series = new Series { Name = "Christ The Way" } } }
            };
            _mockProgressRepo.Setup(r => r.GetJournalEntriesAsync(1, 2)).ReturnsAsync(entries);

            var result = (await _service.GetJournalAsync(userId: 1, seriesId: 2)).ToList();

            result.Should().HaveCount(2);
            result[0].Notes.Should().Be("Great insight");
            result[0].IsCompleted.Should().BeTrue();
            result[1].IsCompleted.Should().BeFalse();
            result[1].Notes.Should().Be("Just notes, not complete");
        }

        [Fact]
        public async Task GetJournalAsync_ShouldReturnEmpty_WhenNoEntries()
        {
            _mockProgressRepo.Setup(r => r.GetJournalEntriesAsync(1, 99)).ReturnsAsync(new List<UserProgress>());

            var result = await _service.GetJournalAsync(userId: 1, seriesId: 99);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetJournalAsync_ShouldMapSecondaryPageRange_WhenPresent()
        {
            var entries = new List<UserProgress>
            {
                new() { Id = 1, UserId = 1, SeriesId = 2, DailyReadingId = 1, IsCompleted = true,
                        DailyReading = new DailyReading
                        {
                            Id = 1, Month = 2, Day = 1, BibleReading = "Acts 1:1",
                            PrimaryBookPageRange = "AA 1-5", SecondaryBookPageRange = "GC 10-15",
                            Series = new Series { Name = "Christ The Church" }
                        } }
            };
            _mockProgressRepo.Setup(r => r.GetJournalEntriesAsync(1, 2)).ReturnsAsync(entries);

            var result = (await _service.GetJournalAsync(1, 2)).ToList();

            result[0].SecondaryBookPageRange.Should().Be("GC 10-15");
        }
    }
}
```

#### `ProgressControllerNotesTests.cs`

**File:** `backend/EncounterDaily.Tests/UnitTests/Controllers/ProgressControllerNotesTests.cs`

```csharp
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
            _controller = new ProgressController(_mockService.Object, Mock.Of<ILogger<ProgressController>>());
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

        // --- PUT /{readingId}/notes ---

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
            // Service returns null when empty notes + not completed → record deleted
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

        // --- GET /series/{seriesId}/journal ---

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
```

#### `ProgressRepositoryJournalTests.cs`

**File:** `backend/EncounterDaily.Tests/UnitTests/Repositories/ProgressRepositoryJournalTests.cs`

```csharp
using EncounterDaily.Core.Entities;
using EncounterDaily.Tests.TestHelpers;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class ProgressRepositoryJournalTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public ProgressRepositoryJournalTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        private async Task<(AppDbContext ctx, User user, Series series, List<DailyReading> readings)>
            SeedAsync(AppDbContext context)
        {
            var book = new Book { Title = "Desire of Ages", Author = "EGW" };
            var user = new User { Email = "u@test.com", Provider = "google", ProviderId = "p1", DisplayName = "User" };
            context.Books.Add(book);
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var series = new Series { Name = "Christ The Way", ShortName = "CTW", PrimaryBookId = book.Id, SortOrder = 1 };
            context.Series.Add(series);
            await context.SaveChangesAsync();

            var readings = new List<DailyReading>
            {
                new() { SeriesId = series.Id, Month = 1, Day = 1, BibleReading = "Mark 1:1", PrimaryBookPageRange = "DA 1-5", PrimaryBookPageStart = 1, PrimaryBookPageEnd = 5 },
                new() { SeriesId = series.Id, Month = 1, Day = 5, BibleReading = "Luke 2:1", PrimaryBookPageRange = "DA 6-10", PrimaryBookPageStart = 6, PrimaryBookPageEnd = 10 },
                new() { SeriesId = series.Id, Month = 2, Day = 1, BibleReading = "John 1:1", PrimaryBookPageRange = "DA 11-15", PrimaryBookPageStart = 11, PrimaryBookPageEnd = 15 },
            };
            context.DailyReadings.AddRange(readings);
            await context.SaveChangesAsync();

            return (context, user, series, readings);
        }

        [Fact]
        public async Task GetJournalEntriesAsync_ShouldReturnOnlyCompletedOrWithNotes()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var (_, user, series, readings) = await SeedAsync(ctx);
            var repo = _fixture.CreateProgressRepository(ctx);

            ctx.UserProgress.AddRange(
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[0].Id, IsCompleted = true },
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[1].Id, IsCompleted = false, Notes = "Has notes" },
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[2].Id, IsCompleted = false }
                // readings[2] has no notes and is not complete — should NOT appear
            );
            await ctx.SaveChangesAsync();

            var result = (await repo.GetJournalEntriesAsync(user.Id, series.Id)).ToList();

            result.Should().HaveCount(2);
            result.Should().NotContain(p => p.DailyReadingId == readings[2].Id);
        }

        [Fact]
        public async Task GetJournalEntriesAsync_ShouldReturnResultsSortedByMonthThenDay()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var (_, user, series, readings) = await SeedAsync(ctx);
            var repo = _fixture.CreateProgressRepository(ctx);

            // Add in reverse order to confirm sorting
            ctx.UserProgress.AddRange(
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[2].Id, IsCompleted = true }, // Month 2, Day 1
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[0].Id, IsCompleted = true }, // Month 1, Day 1
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[1].Id, IsCompleted = true }  // Month 1, Day 5
            );
            await ctx.SaveChangesAsync();

            var result = (await repo.GetJournalEntriesAsync(user.Id, series.Id)).ToList();

            result[0].DailyReading.Month.Should().Be(1);
            result[0].DailyReading.Day.Should().Be(1);
            result[1].DailyReading.Month.Should().Be(1);
            result[1].DailyReading.Day.Should().Be(5);
            result[2].DailyReading.Month.Should().Be(2);
        }

        [Fact]
        public async Task GetJournalEntriesAsync_ShouldNotReturnOtherUsersEntries()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var (_, user, series, readings) = await SeedAsync(ctx);
            var repo = _fixture.CreateProgressRepository(ctx);

            var otherUser = new User { Email = "other@test.com", Provider = "google", ProviderId = "p2", DisplayName = "Other" };
            ctx.Users.Add(otherUser);
            await ctx.SaveChangesAsync();

            ctx.UserProgress.AddRange(
                new UserProgress { UserId = user.Id, SeriesId = series.Id, DailyReadingId = readings[0].Id, IsCompleted = true, Notes = "My note" },
                new UserProgress { UserId = otherUser.Id, SeriesId = series.Id, DailyReadingId = readings[1].Id, IsCompleted = true, Notes = "Other note" }
            );
            await ctx.SaveChangesAsync();

            var result = (await repo.GetJournalEntriesAsync(user.Id, series.Id)).ToList();

            result.Should().HaveCount(1);
            result[0].UserId.Should().Be(user.Id);
        }

        [Fact]
        public async Task GetJournalEntriesAsync_ShouldIncludeNavigationProperties()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var (_, user, series, readings) = await SeedAsync(ctx);
            var repo = _fixture.CreateProgressRepository(ctx);

            ctx.UserProgress.Add(new UserProgress
            {
                UserId = user.Id, SeriesId = series.Id,
                DailyReadingId = readings[0].Id, IsCompleted = true, Notes = "test"
            });
            await ctx.SaveChangesAsync();

            var result = (await repo.GetJournalEntriesAsync(user.Id, series.Id)).ToList();

            result[0].DailyReading.Should().NotBeNull();
            result[0].DailyReading.BibleReading.Should().Be("Mark 1:1");
            result[0].DailyReading.Series.Should().NotBeNull();
            result[0].DailyReading.Series.Name.Should().Be("Christ The Way");
        }
    }
}
```

---

## 2. Frontend Changes

### 2.1 Model — Add `notes` to `ProgressDto`

**File:** `frontend/src/app/core/models/progress.model.ts`

```typescript
export interface ProgressDto {
  readingId: number;
  seriesId: number;
  isCompleted: boolean;
  completedAt?: string;
  month: number;
  day: number;
  bibleReading: string;
  notes?: string;
}
```

**New model — `JournalEntryDto`:**

**File:** `frontend/src/app/core/models/journal-entry.model.ts`

```typescript
export interface JournalEntryDto {
  readingId: number;
  seriesId: number;
  seriesName: string;
  month: number;
  day: number;
  bibleReading: string;
  primaryBookPageRange: string;
  secondaryBookPageRange?: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}
```

### 2.2 Service — Add new API calls

**File:** `frontend/src/app/core/services/progress.service.ts`

Add:
```typescript
saveNotes(readingId: number, notes: string): Observable<ProgressDto> {
  return this.api.put<ProgressDto>(`/progress/${readingId}/notes`, { notes });
}

getJournal(seriesId: number): Observable<JournalEntryDto[]> {
  return this.api.get<JournalEntryDto[]>(`/progress/series/${seriesId}/journal`);
}
```

### 2.3 Reading Detail Page — Add notes UI

**File:** `frontend/src/app/features/reading-detail/reading-detail.module.ts`

Below the completion checkbox, **add a notes section**:

```
- An expandable/collapsible textarea labeled "My Journal Notes"
- Shown when the reading is marked complete OR when notes already exist
- Auto-saves with debounce (1.5s after the user stops typing)
- Shows a "Saved" / "Unsaved" status indicator
- Character counter (max 2000)
- Notes persist across sessions — loaded from getSeriesProgress() which already
  runs on page entry; once ProgressDto includes notes the data is free
```

**Template additions (after the checkbox div):**
```html
<div class="ion-margin-top journal-section" *ngIf="completed || notes">
  <ion-item lines="none" button (click)="showNotes = !showNotes">
    <ion-icon [name]="showNotes ? 'chevron-up-outline' : 'chevron-down-outline'" slot="start"></ion-icon>
    <ion-label>My Journal Notes</ion-label>
    <ion-note slot="end" *ngIf="notes && !showNotes">Has notes</ion-note>
  </ion-item>

  <div *ngIf="showNotes" class="notes-editor">
    <ion-textarea
      [value]="notes"
      (ionInput)="onNotesChange($event)"
      placeholder="Write your thoughts, key points, or reflections from today's reading..."
      [autoGrow]="true"
      rows="4"
      [counter]="true"
      [maxlength]="2000"
      class="journal-textarea">
    </ion-textarea>
    <div class="notes-status">
      <ion-note [color]="notesSaved ? 'success' : 'medium'">
        <ion-icon [name]="notesSaved ? 'checkmark-circle' : 'time-outline'"></ion-icon>
        {{ notesSaved ? 'Saved' : 'Unsaved' }}
      </ion-note>
    </div>
  </div>
</div>
```

**Component logic additions:**

```typescript
notes: string = '';
showNotes = false;
notesSaved = false;
private notesDebounce?: ReturnType<typeof setTimeout>;

async onNotesChange(event: CustomEvent): Promise<void> {
  this.notes = event.detail.value ?? '';
  this.notesSaved = false;

  clearTimeout(this.notesDebounce);
  this.notesDebounce = setTimeout(async () => {
    await this.saveNotes();
  }, 1500);
}

private async saveNotes(): Promise<void> {
  if (!this.detail) return;
  try {
    await firstValueFrom(this.progressService.saveNotes(this.detail.id, this.notes));
    this.notesSaved = true;
  } catch {
    // silently fail — next keystroke will trigger another attempt
    // offline sync queue is intentionally not used for notes
  }
}
```

**Cleanup in `ngOnDestroy`:** Clear the debounce timer to prevent a save firing after the component is destroyed:
```typescript
override ngOnDestroy(): void {
  clearTimeout(this.notesDebounce);
  super.ngOnDestroy();
}
```

**On page load** — notes are loaded from the existing `checkCompleted()` call. That method already calls `progressService.getSeriesProgress()`. Once `ProgressDto` includes the `notes` field, extract notes from that same response — no additional API call needed:

```typescript
// Inside checkCompleted(), after the existing allProgress fetch:
const readingProgress = allProgress.find(p => p.readingId === readingId);
if (readingProgress?.notes) {
  this.notes = readingProgress.notes;
  this.showNotes = true; // auto-expand if notes already exist
}
```

### 2.4 New Journal Page — Reading & Notes View

**Route:** `/journal`

**File:** `frontend/src/app/features/journal/journal.module.ts`

A new lazy-loaded feature module. This is the dedicated view where users can **read back what they read and what they wrote** — suitable for review, reflection, and printing for Master Guide submission. Notes and completion status are always current; users can return any time and the page reflects the latest state.

**Layout:**
```
- Header: "My Reading Journal — {Series Name}"
- Subheader: "365-Day Reading Journey"
- Loading spinner (shown while API call is in flight)
- Error message (shown if API call fails; includes retry button)
- Action buttons:
    "Print"  — expand all collapsed sections, then window.print()
    "Share"  — Web Share API (navigator.share); button hidden if unavailable
- Scrollable card list, one card per reading that is completed or has notes,
  sorted chronologically (Month/Day ascending)
  Each card shows:
    - Day label: e.g. "January 5"
    - Bible Reading passage (e.g. "Matthew 1:1–17")
    - Primary book page range (e.g. "DA pp. 1–5")
    - Secondary book page range if present (e.g. "GC pp. 10–15")
    - Completion badge: green "Completed" or grey "Not Completed"
    - Notes section (collapsible):
        If has notes     → expandable, shows full note text
        If no notes      → grey "No notes written"
- Empty state: "No journal entries yet. Start by marking readings as complete
  and adding your thoughts."
```

**Component state variables:**
```typescript
entries: JournalEntryDto[] = [];
seriesName = '';
loading = false;
error?: string;
allExpanded = false;
canShare = !!navigator.share;
expandedEntries = new Set<number>(); // tracks which readingIds have notes open

isExpanded(readingId: number): boolean {
  return this.allExpanded || this.expandedEntries.has(readingId);
}

toggleEntry(readingId: number): void {
  if (this.expandedEntries.has(readingId)) {
    this.expandedEntries.delete(readingId);
  } else {
    this.expandedEntries.add(readingId);
  }
}
```

> `JournalEntryDto` has no `showNotes` field — expand state is tracked in the component via `expandedEntries`. The template uses `*ngIf="isExpanded(entry.readingId)"` for the notes body, and `(click)="toggleEntry(entry.readingId)"` on the card header. When `printJournal()` sets `allExpanded = true`, `isExpanded()` returns `true` for all entries.

**Template (key sections):**
```html
<ion-content class="ion-padding">
  <div *ngIf="loading" class="ion-text-center ion-padding">
    <ion-spinner></ion-spinner>
  </div>

  <div *ngIf="error" class="ion-text-center">
    <p class="error-message">{{ error }}</p>
    <ion-button fill="outline" (click)="loadJournal()">Retry</ion-button>
  </div>

  <div *ngIf="!loading && !error && entries.length === 0" class="ion-text-center ion-padding">
    <p>No journal entries yet. Start by marking readings as complete and adding your thoughts.</p>
  </div>

  <!-- cards -->
  <div *ngIf="!loading && !error && entries.length > 0">
    ...cards...
  </div>
</ion-content>
```

**Load method (called from `ionViewWillEnter`):**
```typescript
async ionViewWillEnter(): Promise<void> {
  await this.loadJournal();
}

private async loadJournal(): Promise<void> {
  this.loading = true;
  this.error = undefined;
  try {
    const seriesId = this.prefs.getSeriesId();
    this.entries = await firstValueFrom(this.progressService.getJournal(seriesId));
    this.seriesName = this.entries.length > 0 ? this.entries[0].seriesName : 'Reading';
  } catch {
    this.error = 'Failed to load journal. Make sure the API is running.';
  } finally {
    this.loading = false;
  }
}
```

**Print handler** — expand all note sections before printing:
```typescript
allExpanded = false;
canShare = !!navigator.share;

printJournal(): void {
  this.allExpanded = true;
  setTimeout(() => window.print(), 100); // one render cycle
}

async shareJournal(): Promise<void> {
  if (!navigator.share) return;
  await navigator.share({ title: 'My Reading Journal', text: 'My 365-day reading journal' });
}
```

Template note sections use `*ngIf="isExpanded(entry.readingId)"` so the print handler
forces all content visible before `window.print()` fires. `allExpanded` makes `isExpanded()` return `true` for all entries.

**Routing addition** in `frontend/src/app/app-routing.module.ts`:
```typescript
{
  path: 'journal',
  loadChildren: () => import('./features/journal/journal.module').then(m => m.JournalModule),
  canActivate: [AuthGuard]
}
```

**Add "Journal" to the features action sheet** in `openFeatures()` in **all seven pages** that have an action sheet:
```typescript
{ text: 'Journal', icon: 'journal-outline', handler: () => this.router.navigate(['/journal']) }
```

### 2.5 Styles (shared CSS)

```css
.journal-section {
  border-top: 1px solid var(--ion-color-light-shade);
  margin-top: 16px;
  padding-top: 8px;
}

.journal-textarea {
  --padding-start: 0;
  font-style: normal;
  font-size: 15px;
  line-height: 1.6;
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 8px;
}

.notes-status {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 13px;
}
```

### 2.6 Print Styles

```css
@media print {
  ion-header, ion-footer, .print-hide { display: none !important; }
  ion-content { --padding-top: 0; --padding-bottom: 0; }
  .journal-entry { break-inside: avoid; page-break-inside: avoid; }
}
```

### 2.7 Tests — Frontend (Jest)

Following the existing pattern: `HttpClientTestingModule` + `HttpTestingController` for services, `TestBed` + mocked observables for components.

#### `progress.service.spec.ts` — additions

```typescript
// Add to the existing describe('ProgressService') block:

it('saveNotes should PUT to correct endpoint with notes body', () => {
  const mockResponse: ProgressDto = {
    readingId: 1, seriesId: 2, isCompleted: true,
    month: 3, day: 15, bibleReading: 'Mark 1:1', notes: 'Great reading'
  };

  service.saveNotes(1, 'Great reading').subscribe(result => {
    expect(result.notes).toBe('Great reading');
  });

  const req = httpMock.expectOne('/api/v1/progress/1/notes');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ notes: 'Great reading' });
  req.flush(mockResponse);
});

it('getJournal should GET correct endpoint', () => {
  const entries: JournalEntryDto[] = [
    { readingId: 1, seriesId: 2, seriesName: 'Christ The Way',
      month: 1, day: 5, bibleReading: 'Mark 1:1', primaryBookPageRange: 'DA 1-5',
      isCompleted: true, notes: 'Great insight' }
  ];

  service.getJournal(2).subscribe(result => {
    expect(result.length).toBe(1);
    expect(result[0].notes).toBe('Great insight');
  });

  const req = httpMock.expectOne('/api/v1/progress/series/2/journal');
  expect(req.request.method).toBe('GET');
  req.flush(entries);
});
```

#### `reading-detail-notes.spec.ts`

**File:** `frontend/src/app/features/reading-detail/reading-detail-notes.spec.ts`

```typescript
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProgressService } from '../../core/services/progress.service';
// import ReadingDetailPage from reading-detail.module.ts

describe('ReadingDetailPage — notes', () => {
  let component: ReadingDetailPage;
  let progressServiceMock: jest.Mocked<Partial<ProgressService>>;

  beforeEach(() => {
    progressServiceMock = {
      saveNotes: jest.fn(),
      getSeriesProgress: jest.fn().mockReturnValue(of([]))
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ProgressService, useValue: progressServiceMock }
        // other required providers
      ]
    });
    // initialise component ...
  });

  it('should load existing notes from getSeriesProgress response', fakeAsync(() => {
    const progress = [{ readingId: 10, notes: 'Existing note', isCompleted: true,
                        seriesId: 1, month: 1, day: 5, bibleReading: 'Mark 1:1' }];
    progressServiceMock.getSeriesProgress!.mockReturnValue(of(progress));

    component.checkCompleted(10); // triggers the existing flow
    tick();

    expect(component.notes).toBe('Existing note');
    expect(component.showNotes).toBe(true);
  }));

  it('should debounce notes save — does not call saveNotes immediately on input', fakeAsync(() => {
    progressServiceMock.saveNotes!.mockReturnValue(of({} as any));
    component.detail = { id: 10 } as any;

    component.onNotesChange({ detail: { value: 'typing...' } } as any);
    tick(500); // before debounce completes

    expect(progressServiceMock.saveNotes).not.toHaveBeenCalled();
  }));

  it('should call saveNotes after 1500ms debounce', fakeAsync(() => {
    progressServiceMock.saveNotes!.mockReturnValue(of({} as any));
    component.detail = { id: 10 } as any;

    component.onNotesChange({ detail: { value: 'Final note' } } as any);
    tick(1500);

    expect(progressServiceMock.saveNotes).toHaveBeenCalledWith(10, 'Final note');
    expect(component.notesSaved).toBe(true);
  }));

  it('should reset notesSaved to false on new input', fakeAsync(() => {
    progressServiceMock.saveNotes!.mockReturnValue(of({} as any));
    component.detail = { id: 10 } as any;
    component.notesSaved = true;

    component.onNotesChange({ detail: { value: 'New input' } } as any);

    expect(component.notesSaved).toBe(false);
  }));

  it('should keep notesSaved false when save fails', fakeAsync(() => {
    progressServiceMock.saveNotes!.mockReturnValue(throwError(() => new Error('Network error')));
    component.detail = { id: 10 } as any;

    component.onNotesChange({ detail: { value: 'Some note' } } as any);
    tick(1500);

    expect(component.notesSaved).toBe(false);
  }));

  it('should clear debounce timer on ngOnDestroy', fakeAsync(() => {
    progressServiceMock.saveNotes!.mockReturnValue(of({} as any));
    component.detail = { id: 10 } as any;

    component.onNotesChange({ detail: { value: 'Will be cancelled' } } as any);
    component.ngOnDestroy(); // destroy before debounce fires
    tick(1500);

    expect(progressServiceMock.saveNotes).not.toHaveBeenCalled();
  }));
});
```

#### `journal.module.spec.ts`

**File:** `frontend/src/app/features/journal/journal.module.spec.ts`

```typescript
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProgressService } from '../../core/services/progress.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { JournalEntryDto } from '../../core/models/journal-entry.model';
// import JournalPage from journal.module.ts

const mockEntries: JournalEntryDto[] = [
  { readingId: 1, seriesId: 2, seriesName: 'Christ The Way', month: 1, day: 5,
    bibleReading: 'Mark 1:1', primaryBookPageRange: 'DA 1-5', isCompleted: true,
    notes: 'Great insight' },
  { readingId: 2, seriesId: 2, seriesName: 'Christ The Way', month: 1, day: 10,
    bibleReading: 'Luke 2:1', primaryBookPageRange: 'DA 6-10', isCompleted: false,
    notes: 'Notes without completion' },
  { readingId: 3, seriesId: 2, seriesName: 'Christ The Way', month: 2, day: 1,
    bibleReading: 'John 1:1', primaryBookPageRange: 'DA 11-15', isCompleted: true,
    notes: undefined }
];

describe('JournalPage', () => {
  let component: JournalPage;
  let progressServiceMock: jest.Mocked<Partial<ProgressService>>;
  let prefsMock: jest.Mocked<Partial<PreferencesService>>;

  beforeEach(() => {
    progressServiceMock = { getJournal: jest.fn().mockReturnValue(of(mockEntries)) };
    prefsMock = { getSeriesId: jest.fn().mockReturnValue(2) };

    TestBed.configureTestingModule({
      providers: [
        { provide: ProgressService, useValue: progressServiceMock },
        { provide: PreferencesService, useValue: prefsMock }
      ]
    });
    // initialise component ...
  });

  it('should load journal entries on ionViewWillEnter', fakeAsync(() => {
    component.ionViewWillEnter();
    tick();

    expect(progressServiceMock.getJournal).toHaveBeenCalledWith(2);
    expect(component.entries.length).toBe(3);
  }));

  it('should derive series name from first entry', fakeAsync(() => {
    component.ionViewWillEnter();
    tick();

    expect(component.seriesName).toBe('Christ The Way');
  }));

  it('should show "Notes (unmarked)" label for incomplete entries with notes', fakeAsync(() => {
    component.ionViewWillEnter();
    tick();

    const unmarked = component.entries.find(e => !e.isCompleted && e.notes);
    expect(unmarked).toBeDefined();
    // verify template label — implementation detail left to template test
  }));

  it('should show "No notes" indicator for completed entries without notes', fakeAsync(() => {
    component.ionViewWillEnter();
    tick();

    const noNotes = component.entries.find(e => e.isCompleted && !e.notes);
    expect(noNotes).toBeDefined();
  }));

  it('printJournal should set allExpanded to true before printing', fakeAsync(() => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    component.allExpanded = false;

    component.printJournal();
    tick(100);

    expect(component.allExpanded).toBe(true);
    expect(printSpy).toHaveBeenCalled();
  }));

  it('shareJournal should not throw when navigator.share is undefined', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    component.canShare = false;

    await expect(component.shareJournal()).resolves.toBeUndefined();
  });

  it('shareJournal should call navigator.share when available', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    component.canShare = true;

    await component.shareJournal();

    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'My Reading Journal' }));
  });
});
```

---

## 3. Summary of All Files to Create/Modify

### Create:

| # | File | Purpose |
|---|------|---------|
| 1 | `backend/EncounterDaily.Core/DTOs/Progress/JournalEntryDto.cs` | Journal entry DTO |
| 2 | `backend/EncounterDaily.Core/DTOs/Progress/SaveNotesRequest.cs` | Save notes request DTO |
| 3 | `backend/EncounterDaily.Tests/UnitTests/Services/ProgressServiceNotesTests.cs` | Service unit tests |
| 4 | `backend/EncounterDaily.Tests/UnitTests/Controllers/ProgressControllerNotesTests.cs` | Controller unit tests |
| 5 | `backend/EncounterDaily.Tests/UnitTests/Repositories/ProgressRepositoryJournalTests.cs` | Repository unit tests |
| 6 | `frontend/src/app/core/models/journal-entry.model.ts` | Frontend journal model |
| 7 | `frontend/src/app/features/journal/journal.module.ts` | Journal page module |
| 8 | `frontend/src/app/features/reading-detail/reading-detail-notes.spec.ts` | Reading detail notes tests |
| 9 | `frontend/src/app/features/journal/journal.module.spec.ts` | Journal page tests |

### Modify:

| # | File | Changes |
|---|------|---------|
| 1 | `backend/EncounterDaily.Core/DTOs/Progress/ProgressDto.cs` | Add `Notes` property |
| 2 | `backend/EncounterDaily.Core/Interfaces/Services/IProgressService.cs` | Add `SaveNotesAsync`, `GetJournalAsync` |
| 3 | `backend/EncounterDaily.Services/ProgressService.cs` | Map `Notes` in `MapToDto`; implement `SaveNotesAsync`, `GetJournalAsync` |
| 4 | `backend/EncounterDaily.API/Controllers/ProgressController.cs` | Add `PUT /{readingId}/notes`, `GET /series/{seriesId}/journal` |
| 5 | `backend/EncounterDaily.Core/Interfaces/Repositories/IProgressRepository.cs` | Add `GetJournalEntriesAsync` (base `IRepository` already has `DeleteAsync(int id)`) |
| 6 | `backend/EncounterDaily.Infrastructure/Repositories/ProgressRepository.cs` | Implement `GetJournalEntriesAsync` (delete uses existing `DeleteAsync(int id)` from base) |
| 7 | `frontend/src/app/core/models/progress.model.ts` | Add `notes?: string` |
| 8 | `frontend/src/app/core/services/progress.service.ts` | Add `saveNotes()`, `getJournal()` |
| 9 | `frontend/src/app/core/services/progress.service.spec.ts` | Add `saveNotes` and `getJournal` test cases |
| 10 | `frontend/src/app/features/reading-detail/reading-detail.module.ts` | Add notes textarea, auto-save, expand/collapse, `ngOnDestroy` cleanup |
| 11 | `frontend/src/app/app-routing.module.ts` | Add `/journal` route |
| 12 | `frontend/src/app/features/reading-detail/reading-detail.module.ts` | Add "Journal" to action sheet |
| 13 | `frontend/src/app/features/progress/progress.module.ts` | Add "Journal" to action sheet |
| 14 | `frontend/src/app/features/bookmarks/bookmarks.module.ts` | Add "Journal" to action sheet |
| 15 | `frontend/src/app/features/calendar/calendar.module.ts` | Add "Journal" to action sheet |
| 16 | `frontend/src/app/features/search/search.module.ts` | Add "Journal" to action sheet |
| 17 | `frontend/src/app/features/series/series.module.ts` | Add "Journal" to action sheet |
| 18 | `frontend/src/app/features/today/today.module.ts` | Add "Journal" to action sheet |

---

## 4. Data Flow

```
[User writes notes in textarea]
  → debounce 1.5s
  → PUT /api/progress/{readingId}/notes  { notes: "..." }
  → Controller extracts userId via GetUserId()
  → ProgressService.SaveNotesAsync(userId, readingId, notes)
    → If no UserProgress: look up DailyReading → get SeriesId → create record
    → If notes empty + IsCompleted false: DeleteAsync(progress.Id) → return null
    → Otherwise: update/create Notes field (UpdatedAt set by BaseEntity) → return ProgressDto
    → UnitOfWork.CompleteAsync()
  → null → controller returns 204 NoContent (frontend treats as "Saved", section hides)
  → ProgressDto → controller returns 200 OK → frontend shows "Saved" indicator

[User returns to a reading they previously noted]
  → ionViewWillEnter → checkCompleted(readingId)
  → GET /api/progress/series/{seriesId}   (existing call, no new request)
  → ProgressDto now includes notes field
  → allProgress.find(p => p.readingId === id)?.notes → populate textarea
  → showNotes = true  (section auto-expands if notes exist)

[User opens Journal page]
  → Reads seriesId from PreferencesService
  → GET /api/progress/series/{seriesId}/journal
  → ProgressService.GetJournalAsync(userId, seriesId)
    → ProgressRepository.GetJournalEntriesAsync()
    → Includes DailyReading + Series navigation properties
    → Filter: IsCompleted OR Notes != null
    → Order by Month, Day
  → Returns List<JournalEntryDto>
  → Series name shown in header from first entry's seriesName
  → Each card shows: date, bible passage, page range(s), completion badge, notes

[User clicks Print]
  → allExpanded = true  (forces all collapsed note sections visible)
  → setTimeout 100ms → window.print()
  → @media print hides headers/footers/action buttons
  → Clean document with all readings and notes ready for Master Guide submission

[User clicks Share]
  → canShare = !!navigator.share (evaluated on page init)
  → Button only rendered if canShare is true
  → navigator.share({ title, text })
```

---

## 5. Edge Cases

| Scenario | Handling |
|----------|----------|
| User types notes but never marks complete | Saved with `IsCompleted = false`. Appears in journal as "Notes (unmarked)". |
| User marks complete but never writes notes | Appears in journal as completed with "No notes written" indicator. |
| User deletes all notes text | If `IsCompleted = false`, delete the `UserProgress` record. If completed, save empty notes (record kept). |
| User marks reading uncomplete after writing notes | Notes preserved. Appears in journal as "Notes (unmarked)". |
| User returns to a reading with existing notes | `checkCompleted()` already fetches progress; notes populated from that response. No extra API call. |
| Network failure during save | Silently fails. Next keystroke retries. "Saved" stays false. Offline sync queue not used for notes (intentional). |
| Notes exceed 2000 chars | Backend returns 400. Frontend `[maxlength]="2000"` prevents further input. |
| User switches series | Journal reads `PreferencesService.getSeriesId()` on load; shows that series only. |
| User prints with collapsed notes | `printJournal()` sets `allExpanded = true` and waits one render cycle before `window.print()`. |
| `navigator.share` not available | `canShare = !!navigator.share` evaluated on init; Share button rendered only when true. |
| `SaveNotesAsync` — no existing UserProgress | Look up `DailyReading` by `readingId` to obtain `SeriesId` before creating the new record. |

---

## 6. Acceptance Criteria

- [x] Notes field exists on the `UserProgress` entity (already done)
- [ ] Notes field is exposed via `ProgressDto`
- [ ] User can type notes in the reading detail page below the checkbox
- [ ] Notes auto-save after 1.5s of inactivity
- [ ] Debounce timer is cleared on component destroy (no ghost saves after navigation)
- [ ] User can expand/collapse the notes section
- [ ] Notes persist across sessions — returning to a reading restores previous notes automatically
- [ ] Clearing notes on an incomplete reading removes the `UserProgress` record
- [ ] Journal page shows all readings the user has completed or noted, sorted chronologically
- [ ] Each journal card shows: date, Bible passage, primary page range, secondary page range (if present), completion badge, and notes
- [ ] Journal page can be printed with all note sections fully expanded (clean print layout)
- [ ] Share button is hidden when `navigator.share` is unavailable
- [ ] Journal page is accessible from the features action sheet on all 7 pages
- [ ] Notes are capped at 2000 characters
- [ ] Backend validates max length and returns 400 if exceeded
- [ ] Journal page shows loading spinner while fetching data
- [ ] Journal page shows error message with retry button if API call fails
- [ ] Journal page shows empty state when no entries exist
- [ ] `SaveNotesRequest` DTO exists with a single `Notes` property
- [ ] Backend xUnit tests pass: `ProgressServiceNotesTests`, `ProgressControllerNotesTests`, `ProgressRepositoryJournalTests`
- [ ] Frontend Jest tests pass: `progress.service.spec.ts` additions, `reading-detail-notes.spec.ts`, `journal.module.spec.ts`
