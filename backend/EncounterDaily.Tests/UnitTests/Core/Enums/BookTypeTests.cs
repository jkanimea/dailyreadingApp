using EncounterDaily.Core.Enums;

namespace EncounterDaily.Tests.UnitTests.Core.Enums
{
    [Trait("Category", "Unit")]
    public class BookTypeTests
    {
        [Fact]
        public void BookType_ShouldHaveSixValues()
        {
            var values = Enum.GetValues<BookType>();

            values.Should().HaveCount(6);
        }

        [Fact]
        public void BookType_ShouldHaveDefaultNone()
        {
            ((int)BookType.None).Should().Be(0);
        }
    }
}
