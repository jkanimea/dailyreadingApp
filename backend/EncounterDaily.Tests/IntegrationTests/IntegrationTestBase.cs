using System.Net.Http.Json;
using System.Text.Json;
using EncounterDaily.Core.Entities;
using EncounterDaily.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;

namespace EncounterDaily.Tests.IntegrationTests;

[Trait("Category", "Integration")]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly CustomWebApplicationFactory Factory;
    protected readonly HttpClient Client;
    protected readonly HttpClient AnonymousClient;
    private readonly IServiceScope _scope;
    private readonly string _dbName;

    protected IntegrationTestBase()
    {
        _dbName = Guid.NewGuid().ToString("N");
        Factory = new CustomWebApplicationFactory(_dbName);
        Client = Factory.CreateClient(userId: 1, role: "User");
        AnonymousClient = Factory.CreateAnonymousClient();
        _scope = Factory.Services.CreateScope();
    }

    protected AppDbContext Db => _scope.ServiceProvider.GetRequiredService<AppDbContext>();

    public virtual async Task InitializeAsync()
    {
        await SeedStandardDataAsync();
    }

    public virtual Task DisposeAsync()
    {
        _scope.Dispose();
        Factory.Dispose();
        return Task.CompletedTask;
    }

    protected async Task SeedStandardDataAsync()
    {
        var db = Db;

        if (db.Books.Any(b => b.Title == "Test Book")) return;

        db.Roles.AddRange(
            new Role { Name = "Admin", Description = "Admin" },
            new Role { Name = "User", Description = "User" }
        );
        await db.SaveChangesAsync();

        var userRole = db.Roles.First(r => r.Name == "User");

        db.Users.AddRange(
            new User { Id = 1, Email = "user1@test.com", DisplayName = "User One", Provider = "test", ProviderId = "p1", SelectedSeriesId = 1, CreatedAt = DateTime.UtcNow },
            new User { Id = 2, Email = "user2@test.com", DisplayName = "User Two", Provider = "test", ProviderId = "p2", SelectedSeriesId = 1, CreatedAt = DateTime.UtcNow },
            new User { Id = 3, Email = "admin@test.com", DisplayName = "Admin User", Provider = "test", ProviderId = "p3", SelectedSeriesId = 1, CreatedAt = DateTime.UtcNow }
        );
        await db.SaveChangesAsync();

        db.UserRoles.AddRange(
            new UserRole { UserId = 1, RoleId = userRole.Id },
            new UserRole { UserId = 2, RoleId = userRole.Id }
        );

        var adminRole = db.Roles.First(r => r.Name == "Admin");
        db.UserRoles.Add(new UserRole { UserId = 3, RoleId = adminRole.Id });

        await db.SaveChangesAsync();

        db.Books.AddRange(
            new Book { Id = 1, Title = "Test Book", BookType = Core.Enums.BookType.DesireOfAges }
        );
        await db.SaveChangesAsync();

        db.Series.Add(new Series
        {
            Id = 1,
            Name = "Test Series",
            SeriesType = Core.Enums.SeriesType.ChristTheWay,
            PrimaryBookId = 1
        });
        await db.SaveChangesAsync();

        var readings = new List<DailyReading>();
        for (int i = 1; i <= 5; i++)
        {
            readings.Add(new DailyReading
            {
                Id = i,
                SeriesId = 1,
                Month = 1,
                Day = i,
                BibleReading = i == 1 ? "John 3:16" : $"Matt {i}:1-{i + 1}",
                PrimaryBookPageRange = $"p.{i * 10}-{i * 10 + 5}",
                PrimaryBookPageStart = i * 10,
                PrimaryBookPageEnd = i * 10 + 5,
                FullTextPrimary = $"Primary text for reading {i}",
                FullTextSecondary = i % 2 == 0 ? $"Secondary text for reading {i}" : null,
                SummaryPoints = i % 2 == 0 ? $"Summary {i}" : null
            });
        }
        db.DailyReadings.AddRange(readings);
        await db.SaveChangesAsync();
    }

    protected async Task<T?> DeserializeAsync<T>(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }
}
