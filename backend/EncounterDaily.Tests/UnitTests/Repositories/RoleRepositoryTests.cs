using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Repositories;
using EncounterDaily.Tests.TestHelpers;
using FluentAssertions;

namespace EncounterDaily.Tests.UnitTests.Repositories
{
    [Trait("Category", "Unit")]
    public class RoleRepositoryTests
    {
        private readonly DatabaseFixture _fixture = new();

        private static Role MakeRole(string name) => new() { Name = name, Description = $"{name} role" };

        // ── GetByNameAsync ────────────────────────────────────────────────────

        [Fact]
        public async Task GetByNameAsync_ReturnsRole_WhenExists()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            ctx.Roles.Add(MakeRole("Admin"));
            await ctx.SaveChangesAsync();

            var repo = new RoleRepository(ctx);
            var result = await repo.GetByNameAsync("Admin");

            result.Should().NotBeNull();
            result!.Name.Should().Be("Admin");
        }

        [Fact]
        public async Task GetByNameAsync_ReturnsNull_WhenNotFound()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new RoleRepository(ctx);

            var result = await repo.GetByNameAsync("NonExistent");

            result.Should().BeNull();
        }

        // ── GetUserRoleNameAsync ──────────────────────────────────────────────

        [Fact]
        public async Task GetUserRoleNameAsync_ReturnsRoleName_WhenAssigned()
        {
            using var ctx = _fixture.CreateInMemoryContext();

            var role = MakeRole("Admin");
            ctx.Roles.Add(role);
            var user = new User { Email = "a@b.com", Provider = "google", ProviderId = "1", DisplayName = "A" };
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();

            ctx.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            await ctx.SaveChangesAsync();

            var repo = new RoleRepository(ctx);
            var name = await repo.GetUserRoleNameAsync(user.Id);

            name.Should().Be("Admin");
        }

        [Fact]
        public async Task GetUserRoleNameAsync_ReturnsUser_WhenNoRoleAssigned()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new RoleRepository(ctx);

            // User with no UserRole row
            var name = await repo.GetUserRoleNameAsync(999);

            name.Should().Be("User");
        }

        // ── AssignRoleToUserAsync ─────────────────────────────────────────────

        [Fact]
        public async Task AssignRoleToUserAsync_CreatesUserRole_WhenNotYetAssigned()
        {
            using var ctx = _fixture.CreateInMemoryContext();

            var role = MakeRole("User");
            ctx.Roles.Add(role);
            var user = new User { Email = "b@b.com", Provider = "google", ProviderId = "2", DisplayName = "B" };
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();

            var repo = new RoleRepository(ctx);
            await repo.AssignRoleToUserAsync(user.Id, role.Id);
            await ctx.SaveChangesAsync();

            ctx.UserRoles.Should().ContainSingle(ur => ur.UserId == user.Id && ur.RoleId == role.Id);
        }

        [Fact]
        public async Task AssignRoleToUserAsync_DoesNotDuplicate_WhenAlreadyAssigned()
        {
            using var ctx = _fixture.CreateInMemoryContext();

            var role = MakeRole("User");
            ctx.Roles.Add(role);
            var user = new User { Email = "c@b.com", Provider = "google", ProviderId = "3", DisplayName = "C" };
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();

            ctx.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            await ctx.SaveChangesAsync();

            var repo = new RoleRepository(ctx);
            await repo.AssignRoleToUserAsync(user.Id, role.Id); // second call
            await ctx.SaveChangesAsync();

            ctx.UserRoles.Count(ur => ur.UserId == user.Id).Should().Be(1);
        }

        // ── UserHasRoleAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task UserHasRoleAsync_ReturnsTrue_WhenUserHasRole()
        {
            using var ctx = _fixture.CreateInMemoryContext();

            var role = MakeRole("Admin");
            ctx.Roles.Add(role);
            var user = new User { Email = "d@b.com", Provider = "google", ProviderId = "4", DisplayName = "D" };
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();

            ctx.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            await ctx.SaveChangesAsync();

            var repo = new RoleRepository(ctx);
            var result = await repo.UserHasRoleAsync(user.Id, "Admin");

            result.Should().BeTrue();
        }

        [Fact]
        public async Task UserHasRoleAsync_ReturnsFalse_WhenUserDoesNotHaveRole()
        {
            using var ctx = _fixture.CreateInMemoryContext();

            var userRole = MakeRole("User");
            ctx.Roles.Add(userRole);
            var user = new User { Email = "e@b.com", Provider = "google", ProviderId = "5", DisplayName = "E" };
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();

            ctx.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = userRole.Id });
            await ctx.SaveChangesAsync();

            var repo = new RoleRepository(ctx);
            var result = await repo.UserHasRoleAsync(user.Id, "Admin");

            result.Should().BeFalse();
        }

        [Fact]
        public async Task UserHasRoleAsync_ReturnsFalse_WhenUserHasNoRoles()
        {
            using var ctx = _fixture.CreateInMemoryContext();
            var repo = new RoleRepository(ctx);

            var result = await repo.UserHasRoleAsync(999, "Admin");

            result.Should().BeFalse();
        }
    }
}
