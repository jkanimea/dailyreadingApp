using EncounterDaily.Core.DTOs.Search;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Services;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class SearchServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<ISearchRepository> _mockSearchRepo;
        private readonly ISearchService _service;
        private readonly Series _series;
        private readonly DailyReading _exodusReading;
        private readonly DailyReading _markReading;

        public SearchServiceTests()
        {
            _series = new Series { Id = 1, Name = "Daily Audio Bible" };
            _exodusReading = new DailyReading
            {
                Id = 1, SeriesId = 1, Series = _series, Month = 1, Day = 15,
                BibleReading = "Exodus 15:1-21", SortOrder = 15
            };
            _markReading = new DailyReading
            {
                Id = 2, SeriesId = 1, Series = _series, Month = 1, Day = 16,
                BibleReading = "Mark 1:1-20", SortOrder = 16,
                FullTextPrimary = "The beginning of the gospel of Jesus Christ"
            };
            _mockSearchRepo = new Mock<ISearchRepository>();
            _mockUow = new Mock<IUnitOfWork>();
            _mockUow.Setup(u => u.Search).Returns(_mockSearchRepo.Object);
            _service = new SearchService(_mockUow.Object);
        }

        [Fact]
        public async Task SearchAsync_ShouldReturnMatchingResults()
        {
            var paged = new PagedResult<DailyReading>
            {
                Items = new List<DailyReading> { _exodusReading },
                TotalCount = 1, Page = 1, PageSize = 20
            };
            _mockSearchRepo.Setup(r => r.SearchAsync(1, "Exodus", 1, 20)).ReturnsAsync(paged);

            var result = await _service.SearchAsync(1, "Exodus", 1, 20);

            result.Should().NotBeNull();
            result.Items.Should().HaveCount(1);
            result.Items.First().BibleReading.Should().Contain("Exodus");
            result.TotalCount.Should().Be(1);
        }

        [Fact]
        public async Task SearchAsync_ShouldReturnEmpty_WhenNoMatch()
        {
            var paged = new PagedResult<DailyReading>
            {
                Items = new List<DailyReading>(),
                TotalCount = 0, Page = 1, PageSize = 20
            };
            _mockSearchRepo.Setup(r => r.SearchAsync(1, "NonExistent", 1, 20)).ReturnsAsync(paged);

            var result = await _service.SearchAsync(1, "NonExistent", 1, 20);

            result.Items.Should().BeEmpty();
            result.TotalCount.Should().Be(0);
        }

        [Fact]
        public async Task SearchAsync_ShouldMapSeriesName()
        {
            var paged = new PagedResult<DailyReading>
            {
                Items = new List<DailyReading> { _markReading },
                TotalCount = 1, Page = 1, PageSize = 20
            };
            _mockSearchRepo.Setup(r => r.SearchAsync(1, "Mark", 1, 20)).ReturnsAsync(paged);

            var result = await _service.SearchAsync(1, "Mark", 1, 20);

            result.Items.First().SeriesName.Should().Be("Daily Audio Bible");
        }

        [Fact]
        public async Task SearchAsync_ShouldRespectPagination()
        {
            var allItems = Enumerable.Range(1, 50).Select(i => new DailyReading
            {
                Id = i, SeriesId = 1, Series = _series,
                BibleReading = $"Reading {i}", SortOrder = i
            }).ToList();

            var paged = new PagedResult<DailyReading>
            {
                Items = allItems.Skip(0).Take(10).ToList(),
                TotalCount = 50, Page = 1, PageSize = 10
            };
            _mockSearchRepo.Setup(r => r.SearchAsync(1, "Reading", 1, 10)).ReturnsAsync(paged);

            var result = await _service.SearchAsync(1, "Reading", 1, 10);

            result.Items.Should().HaveCount(10);
            result.TotalCount.Should().Be(50);
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(10);
        }

        [Fact]
        public async Task SearchAllAsync_ShouldReturnResultsFromAllSeries()
        {
            var series2 = new Series { Id = 2, Name = "New Testament" };
            var reading2 = new DailyReading
            {
                Id = 3, SeriesId = 2, Series = series2, Month = 3, Day = 1,
                BibleReading = "Jesus wept", SortOrder = 1
            };
            var paged = new PagedResult<DailyReading>
            {
                Items = new List<DailyReading> { _markReading, reading2 },
                TotalCount = 2, Page = 1, PageSize = 20
            };
            _mockSearchRepo.Setup(r => r.SearchAllAsync("Jesus", 1, 20)).ReturnsAsync(paged);

            var result = await _service.SearchAllAsync("Jesus", 1, 20);

            result.Items.Should().HaveCount(2);
            result.TotalCount.Should().Be(2);
        }

        [Fact]
        public async Task SearchAllAsync_ShouldReturnEmpty_WhenNoMatch()
        {
            var paged = new PagedResult<DailyReading>
            {
                Items = new List<DailyReading>(),
                TotalCount = 0, Page = 1, PageSize = 20
            };
            _mockSearchRepo.Setup(r => r.SearchAllAsync("NonExistent", 1, 20)).ReturnsAsync(paged);

            var result = await _service.SearchAllAsync("NonExistent", 1, 20);

            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task SearchAsync_ShouldMapFullTextPrimary()
        {
            var paged = new PagedResult<DailyReading>
            {
                Items = new List<DailyReading> { _markReading },
                TotalCount = 1, Page = 1, PageSize = 20
            };
            _mockSearchRepo.Setup(r => r.SearchAsync(1, "gospel", 1, 20)).ReturnsAsync(paged);

            var result = await _service.SearchAsync(1, "gospel", 1, 20);

            var item = result.Items.First();
            item.FullTextPrimary.Should().Contain("gospel");
        }

        [Fact]
        public async Task SearchAsync_ShouldMapMonthAndDay()
        {
            var paged = new PagedResult<DailyReading>
            {
                Items = new List<DailyReading> { _exodusReading },
                TotalCount = 1, Page = 1, PageSize = 20
            };
            _mockSearchRepo.Setup(r => r.SearchAsync(1, "Exodus", 1, 20)).ReturnsAsync(paged);

            var result = await _service.SearchAsync(1, "Exodus", 1, 20);

            var item = result.Items.First();
            item.Month.Should().Be(1);
            item.Day.Should().Be(15);
        }
    }
}
