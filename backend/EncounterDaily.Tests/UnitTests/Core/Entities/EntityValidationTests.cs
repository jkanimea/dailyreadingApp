using System.ComponentModel.DataAnnotations;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Enums;

namespace EncounterDaily.Tests.UnitTests.Core.Entities
{
    [Trait("Category", "Unit")]
    public class EntityValidationTests
    {
        private static IList<ValidationResult> ValidateModel(object model)
        {
            var results = new List<ValidationResult>();
            var context = new ValidationContext(model);
            Validator.TryValidateObject(model, context, results, validateAllProperties: true);
            return results;
        }

        [Fact]
        public void Series_ShouldRequireName()
        {
            var series = new Series { ShortName = "SN", Name = null! };

            var results = ValidateModel(series);

            results.Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        [Fact]
        public void Series_ShouldRequireShortName()
        {
            var series = new Series { Name = "Series Name", ShortName = null! };

            var results = ValidateModel(series);

            results.Should().Contain(r => r.MemberNames.Contains("ShortName"));
        }

        [Fact]
        public void Book_ShouldRequireTitle()
        {
            var book = new Book { Title = null! };

            var results = ValidateModel(book);

            results.Should().Contain(r => r.MemberNames.Contains("Title"));
        }

        [Fact]
        public void Book_ShouldRequireAuthor()
        {
            var book = new Book { Title = "Test", Author = null! };

            var results = ValidateModel(book);

            results.Should().Contain(r => r.MemberNames.Contains("Author"));
        }

        [Fact]
        public void Book_ShouldHaveDefaultAuthor()
        {
            var book = new Book { Title = "Test" };

            book.Author.Should().Be("Ellen G. White");
        }

        [Fact]
        public void DailyReading_ShouldRequireBibleReading()
        {
            var reading = new DailyReading
            {
                SeriesId = 1,
                Month = 1,
                Day = 1,
                BibleReading = null!,
                PrimaryBookPageRange = "DA 1-5",
                PrimaryBookPageStart = 1,
                PrimaryBookPageEnd = 5
            };

            var results = ValidateModel(reading);

            results.Should().Contain(r => r.MemberNames.Contains("BibleReading"));
        }

        [Fact]
        public void DailyReading_ShouldRequirePrimaryBookPageRange()
        {
            var reading = new DailyReading
            {
                SeriesId = 1,
                Month = 1,
                Day = 1,
                BibleReading = "Mark 1:1",
                PrimaryBookPageRange = null!,
                PrimaryBookPageStart = 1,
                PrimaryBookPageEnd = 5
            };

            var results = ValidateModel(reading);

            results.Should().Contain(r => r.MemberNames.Contains("PrimaryBookPageRange"));
        }

        [Fact]
        public void User_ShouldRequireEmail()
        {
            var user = new User { Email = null!, Provider = "google", ProviderId = "id1", DisplayName = "User" };

            var results = ValidateModel(user);

            results.Should().Contain(r => r.MemberNames.Contains("Email"));
        }

        [Fact]
        public void User_ShouldRequireProvider()
        {
            var user = new User { Email = "a@b.com", Provider = null!, ProviderId = "id1", DisplayName = "User" };

            var results = ValidateModel(user);

            results.Should().Contain(r => r.MemberNames.Contains("Provider"));
        }

        [Fact]
        public void User_ShouldRequireProviderId()
        {
            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = null!, DisplayName = "User" };

            var results = ValidateModel(user);

            results.Should().Contain(r => r.MemberNames.Contains("ProviderId"));
        }

        [Fact]
        public void User_ShouldRequireDisplayName()
        {
            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = "id1", DisplayName = null! };

            var results = ValidateModel(user);

            results.Should().Contain(r => r.MemberNames.Contains("DisplayName"));
        }

        [Fact]
        public void SearchHistory_ShouldRequireSearchTerm()
        {
            var history = new SearchHistory { UserId = 1, SeriesId = 1, SearchTerm = null! };

            var results = ValidateModel(history);

            results.Should().Contain(r => r.MemberNames.Contains("SearchTerm"));
        }

        [Fact]
        public void Series_DefaultSeriesTypeShouldBeNone()
        {
            var series = new Series();

            series.SeriesType.Should().Be(SeriesType.None);
        }

        [Fact]
        public void Book_DefaultBookTypeShouldBeNone()
        {
            var book = new Book();

            book.BookType.Should().Be(BookType.None);
        }
    }
}
