using EncounterDaily.Core.Enums;

namespace EncounterDaily.Tests.UnitTests.Core.Enums
{
    [Trait("Category", "Unit")]
    public class SeriesTypeTests
    {
        [Fact]
        public void SeriesType_ShouldHaveFiveValues()
        {
            var values = Enum.GetValues<SeriesType>();

            values.Should().HaveCount(5);
        }

        [Fact]
        public void SeriesType_ShouldHaveDefaultNone()
        {
            ((int)SeriesType.None).Should().Be(0);
        }

        [Theory]
        [InlineData(1, SeriesType.ChristTheWay)]
        [InlineData(2, SeriesType.ChristTheChurch)]
        [InlineData(3, SeriesType.ChristOurRedemption)]
        [InlineData(4, SeriesType.ChristOurHope)]
        public void SeriesType_ShouldHaveCorrectNumericValues(int expected, SeriesType type)
        {
            ((int)type).Should().Be(expected);
        }
    }
}
