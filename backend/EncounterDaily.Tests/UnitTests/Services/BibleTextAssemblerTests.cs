using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Enums;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class BibleTextAssemblerTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly BibleTextAssembler _assembler;

        public BibleTextAssemblerTests()
        {
            _mockUow = new Mock<IUnitOfWork>();
            _assembler = new BibleTextAssembler(_mockUow.Object, Mock.Of<ILogger<BibleTextAssembler>>());
        }

        [Fact]
        public async Task ResolveReferencesAsync_ShouldReturnSingleVerseGroup()
        {
            var dbId = Guid.NewGuid().ToString();
            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbId).Options);
            ctx.Set<BibleBook>().Add(new BibleBook { Id = 43, Name = "John", Abbreviation = "john" });
            ctx.Set<BibleVerse>().Add(new BibleVerse { BookId = 43, Chapter = 3, Verse = 16, Text = "For God so loved the world." });
            await ctx.SaveChangesAsync();
            SetupBibleRepos(ctx);

            var groups = await _assembler.ResolveReferencesAsync("John 3:16");

            groups.Should().HaveCount(1);
            groups[0].Reference.Should().Be("John 3:16");
            groups[0].Verses.Should().HaveCount(1);
            groups[0].Verses[0].Verse.Should().Be(16);
            groups[0].Verses[0].Text.Should().Be("For God so loved the world.");
        }

        [Fact]
        public async Task ResolveReferencesAsync_ShouldGroupSemicolonRefs()
        {
            var dbId = Guid.NewGuid().ToString();
            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbId).Options);
            ctx.Set<BibleBook>().AddRange(
                new BibleBook { Id = 44, Name = "Acts", Abbreviation = "acts" },
                new BibleBook { Id = 48, Name = "Galatians", Abbreviation = "gal" });
            ctx.Set<BibleVerse>().AddRange(
                new BibleVerse { BookId = 44, Chapter = 17, Verse = 26, Text = "God made the world." },
                new BibleVerse { BookId = 48, Chapter = 3, Verse = 28, Text = "There is neither Jew nor Greek." });
            await ctx.SaveChangesAsync();
            SetupBibleRepos(ctx);

            var groups = await _assembler.ResolveReferencesAsync("Acts 17:26; Galatians 3:28");

            groups.Should().HaveCount(2);
            groups[0].Reference.Should().Be("Acts 17:26");
            groups[1].Reference.Should().Be("Galatians 3:28");
            groups[1].Verses[0].Book.Should().Be("Galatians");
        }

        [Fact]
        public async Task ResolveReferencesAsync_ShouldIgnoreUnknownAbbreviation()
        {
            var dbId = Guid.NewGuid().ToString();
            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbId).Options);
            ctx.Set<BibleBook>().Add(new BibleBook { Id = 43, Name = "John", Abbreviation = "john" });
            await ctx.SaveChangesAsync();
            SetupBibleRepos(ctx);

            var groups = await _assembler.ResolveReferencesAsync("Zzz 3:16");

            groups.Should().BeEmpty();
        }

        [Fact]
        public async Task LookupBibleTextAsync_ShouldBuildChapterOnlyText()
        {
            var dbId = Guid.NewGuid().ToString();
            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbId).Options);
            ctx.Set<BibleBook>().Add(new BibleBook { Id = 23, Name = "Isaiah", Abbreviation = "isa" });
            ctx.Set<BibleVerse>().AddRange(
                new BibleVerse { BookId = 23, Chapter = 42, Verse = 1, Text = "Behold my servant." },
                new BibleVerse { BookId = 23, Chapter = 44, Verse = 1, Text = "Yet now hear." });
            await ctx.SaveChangesAsync();
            SetupBibleRepos(ctx);

            var text = await _assembler.LookupBibleTextAsync("Isaiah 42,44");

            text.Should().Contain("Isaiah 42");
            text.Should().Contain("42:1 Behold my servant.");
            text.Should().Contain("Isaiah 44");
            text.Should().Contain("44:1 Yet now hear.");
        }

        [Fact]
        public async Task AssembleEgwTextAsync_ShouldJoinPagesInOrder()
        {
            var dbId = Guid.NewGuid().ToString();
            using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbId).Options);
            ctx.EgwPages.AddRange(
                new EgwPage { BookId = 10, PageNumber = 1, Text = "Page one." },
                new EgwPage { BookId = 10, PageNumber = 2, Text = "Page two." });
            await ctx.SaveChangesAsync();
            var mockEgwRepo = new Mock<IRepository<EgwPage>>();
            mockEgwRepo.Setup(r => r.Query()).Returns(ctx.EgwPages);
            _mockUow.Setup(u => u.Repository<EgwPage>()).Returns(mockEgwRepo.Object);

            var text = await _assembler.AssembleEgwTextAsync(10, 1, 2);

            text.Should().Be("Page one. Page two.");
        }

        [Fact]
        public async Task AssembleEgwTextAsync_ShouldReturnEmpty_WhenStartAfterEnd()
        {
            var text = await _assembler.AssembleEgwTextAsync(10, 5, 1);

            text.Should().BeEmpty();
        }

        private void SetupBibleRepos(AppDbContext ctx)
        {
            var mockBibleBookRepo = new Mock<IRepository<BibleBook>>();
            mockBibleBookRepo.Setup(r => r.Query()).Returns(ctx.Set<BibleBook>());
            _mockUow.Setup(u => u.Repository<BibleBook>()).Returns(mockBibleBookRepo.Object);

            var mockBibleVerseRepo = new Mock<IRepository<BibleVerse>>();
            mockBibleVerseRepo.Setup(r => r.Query()).Returns(ctx.Set<BibleVerse>());
            _mockUow.Setup(u => u.Repository<BibleVerse>()).Returns(mockBibleVerseRepo.Object);
        }
    }
}