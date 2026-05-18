using EncounterDaily.Core.Enums;

namespace EncounterDaily.Tests.UnitTests.Core.Enums
{
    [Trait("Category", "Unit")]
    public class BookTypeTests
    {
        [Fact]
        public void BookType_ShouldHaveFiveValues()
        {
            var values = Enum.GetValues<BookType>();

            values.Should().HaveCount(5);
        }
    }
}
