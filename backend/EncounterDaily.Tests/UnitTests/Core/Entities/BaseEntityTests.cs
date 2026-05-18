using EncounterDaily.Core.Entities;

namespace EncounterDaily.Tests.UnitTests.Core.Entities
{
    [Trait("Category", "Unit")]
    public class BaseEntityTests
    {
        [Fact]
        public void NewEntity_ShouldHaveDefaultCreatedAt()
        {
            var entity = new TestEntity();

            entity.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        }

        [Fact]
        public void NewEntity_ShouldHaveNullUpdatedAt()
        {
            var entity = new TestEntity();

            entity.UpdatedAt.Should().BeNull();
        }

        [Fact]
        public void NewEntity_ShouldHaveZeroId()
        {
            var entity = new TestEntity();

            entity.Id.Should().Be(0);
        }

        private class TestEntity : BaseEntity { }
    }
}
