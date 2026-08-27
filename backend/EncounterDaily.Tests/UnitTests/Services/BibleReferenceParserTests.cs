using EncounterDaily.Services;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class BibleReferenceParserTests
    {
        [Theory]
        [InlineData("John 3:16", "John", "3", "16", "")]
        [InlineData("Matt. 11:1-2", "Matt", "11", "1", "2")]
        [InlineData("1 John 1:9", "1 John", "1", "9", "")]
        public void BibleRefRegex_ShouldMatchBibleReference(string input, string book, string chapter, string verse, string endVerse)
        {
            var match = BibleReferenceParser.BibleRefRegex.Match(input);

            match.Success.Should().BeTrue();
            BibleReferenceParser.BuildBookName(match).Should().Be(book);
            match.Groups[3].Value.Should().Be(chapter);
            match.Groups[4].Value.Should().Be(verse);
            match.Groups[5].Value.Should().Be(endVerse);
        }

        [Fact]
        public void ChapterOnlyRefRegex_ShouldMatchChapterLists()
        {
            var match = BibleReferenceParser.ChapterOnlyRefRegex.Match("Isaiah 42,44-45,48");

            match.Success.Should().BeTrue();
            BibleReferenceParser.BuildBookName(match).Should().Be("Isaiah");
            match.Groups[3].Value.Should().Be("42,44-45,48");
        }

        [Fact]
        public void ContinuationRefRegex_ShouldMatchBareRange()
        {
            var match = BibleReferenceParser.ContinuationRefRegex.Match("14:1-11");

            match.Success.Should().BeTrue();
            match.Groups[1].Value.Should().Be("14");
            match.Groups[2].Value.Should().Be("1");
            match.Groups[3].Value.Should().Be("11");
        }

        [Fact]
        public void ParseChapterSpecs_ShouldExpandCommaAndRangeLists()
        {
            var specs = BibleReferenceParser.ParseChapterSpecs("42,44-45,48").ToList();

            specs.Should().HaveCount(3);
            specs[0].Should().Be((42, 42));
            specs[1].Should().Be((44, 45));
            specs[2].Should().Be((48, 48));
        }
    }
}