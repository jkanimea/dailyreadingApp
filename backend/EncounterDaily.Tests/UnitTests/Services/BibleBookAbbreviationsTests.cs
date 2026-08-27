using EncounterDaily.Services;

namespace EncounterDaily.Tests.UnitTests.Services
{
    [Trait("Category", "Unit")]
    public class BibleBookAbbreviationsTests
    {
        [Theory]
        [InlineData("john", "John")]
        [InlineData("JOHN", "John")]
        [InlineData("1 john", "1 John")]
        [InlineData("gen", "Genesis")]
        [InlineData("matt", "Matthew")]
        [InlineData("rev", "Revelation")]
        [InlineData("phil", "Philippians")]
        public void TryResolve_ShouldMapKnownAbbreviations(string abbreviation, string expected)
        {
            BibleBookAbbreviations.TryResolve(abbreviation, out var fullName).Should().BeTrue();
            fullName.Should().Be(expected);
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        [InlineData("   ")]
        [InlineData("notabook")]
        public void TryResolve_ShouldReturnFalse_ForUnknown(string abbreviation)
        {
            BibleBookAbbreviations.TryResolve(abbreviation, out var fullName).Should().BeFalse();
            fullName.Should().BeEmpty();
        }
    }
}