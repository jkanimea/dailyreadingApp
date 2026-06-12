using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using System.Threading.RateLimiting;
using EncounterDaily.API.Middleware;
using EncounterDaily.API.Services;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Infrastructure;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.Debug()
    .WriteTo.File("logs/encounterdaily-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 14)
    .CreateLogger();

builder.Host.UseSerilog();

var bypassAuth = builder.Configuration.GetValue<bool>("DevMode:BypassAuth");

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<AiSettings>(builder.Configuration.GetSection("Ai"));

if (!bypassAuth)
{
    builder.Services.AddControllers(options =>
    {
        options.Filters.Add(new AuthorizeFilter());
    });

    var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
    var rsa = RSA.Create(2048);

    if (!string.IsNullOrEmpty(jwtSettings.RsaPrivateKey))
    {
        // Production: use key from config
        rsa.ImportFromPem(jwtSettings.RsaPrivateKey.ToCharArray());
    }
    else if (builder.Environment.IsDevelopment())
    {
        // Development: persist a local key so tokens survive backend restarts
        var keyPath = Path.Combine(builder.Environment.ContentRootPath, "dev-rsa-key.pem");
        if (File.Exists(keyPath))
        {
            rsa.ImportFromPem(File.ReadAllText(keyPath));
        }
        else
        {
            File.WriteAllText(keyPath, rsa.ExportRSAPrivateKeyPem());
        }
    }

    builder.Services.AddSingleton(rsa);

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                IssuerSigningKey = new RsaSecurityKey(rsa),
                ClockSkew = TimeSpan.Zero,
                RoleClaimType = "role"
            };
        });

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("RequireAdminRole", policy => policy.RequireRole("Admin"));
    });
}
else
{
    builder.Services.AddControllers();
    builder.Services.AddSingleton(RSA.Create());
    builder.Services.AddAuthentication(DevAuthHandlerDefaults.AuthenticationScheme)
        .AddScheme<DevAuthSchemeOptions, DevAuthHandler>(DevAuthHandlerDefaults.AuthenticationScheme, _ => { });
    builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();
        options.AddPolicy("RequireAdminRole", policy => policy.RequireAssertion(_ => true));
    });
    Console.WriteLine("  [DevMode] Auth bypass enabled — all endpoints are anonymous.");
}

var mobileOrigins = new[] { "capacitor://localhost", "http://localhost", "https://localhost", "http://192.168.1.147:8101", "https://192.168.1.147:8101" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowMobileApp", policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
        if (builder.Environment.IsDevelopment())
            policy.WithOrigins(mobileOrigins).SetIsOriginAllowed(_ => true);
        else
            policy.WithOrigins(mobileOrigins);
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("PerIp", context =>
    {
        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ipAddress, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 1000,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });

    options.AddPolicy("PerUser", context =>
    {
        var partitionKey = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? context.Connection.RemoteIpAddress?.ToString()
                           ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });
});

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

builder.Services.AddScoped<ISeriesService, SeriesService>();
builder.Services.AddScoped<IReadingService, ReadingService>();
builder.Services.AddScoped<ISeriesFactory, SeriesFactory>();
builder.Services.AddScoped<IProgressService, ProgressService>();
builder.Services.AddScoped<IBookmarkService, BookmarkService>();
builder.Services.AddHttpClient("FacebookGraph", client =>
{
    client.BaseAddress = new Uri("https://graph.facebook.com");
});
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IAppLogService, AppLogService>();
builder.Services.AddScoped<IAiSummaryService, AiSummaryService>();
builder.Services.AddHttpClient("DeepSeek", client =>
{
    client.BaseAddress = new Uri("https://api.deepseek.com");
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddSingleton<BibleSeedService>();
builder.Services.AddSingleton<IBibleSeedService>(sp => sp.GetRequiredService<BibleSeedService>());
builder.Services.AddSingleton<IHostedService>(sp => sp.GetRequiredService<BibleSeedService>());
builder.Services.AddHostedService<LogCleanupService>();
builder.Services.AddHostedService<SeedDataService>();

var app = builder.Build();

// Ensure all tables exist (EnsureCreatedAsync only works on a brand-new DB;
// EnsureSchemaAsync adds any missing tables safely to an existing DB).
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    await EnsureSchemaAsync(dbContext);
    await SeedRolesAsync(dbContext);
    await SeedDevUserAsync(dbContext);
}

app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowMobileApp");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers()
   .RequireRateLimiting("PerIp");

app.Run();

// Creates any tables that exist in the EF model but are missing from the database.
// Safe to run on an existing DB — uses IF NOT EXISTS so nothing is dropped or altered.
static async Task EnsureSchemaAsync(AppDbContext context)
{
    await context.Database.ExecuteSqlRawAsync(@"
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Roles')
        CREATE TABLE Roles (
            Id          INT IDENTITY(1,1) PRIMARY KEY,
            Name        NVARCHAR(50)  NOT NULL,
            Description NVARCHAR(200) NOT NULL DEFAULT '',
            CreatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt   DATETIME2     NULL
        );

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Roles_Name' AND object_id = OBJECT_ID('Roles'))
        CREATE UNIQUE INDEX IX_Roles_Name ON Roles(Name);

        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserRoles')
        CREATE TABLE UserRoles (
            Id        INT IDENTITY(1,1) PRIMARY KEY,
            UserId    INT NOT NULL REFERENCES Users(Id)  ON DELETE CASCADE,
            RoleId    INT NOT NULL REFERENCES Roles(Id)  ON DELETE CASCADE,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NULL
        );

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserRoles_UserId_RoleId' AND object_id = OBJECT_ID('UserRoles'))
        CREATE UNIQUE INDEX IX_UserRoles_UserId_RoleId ON UserRoles(UserId, RoleId);

        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppLogs')
        CREATE TABLE AppLogs (
            Id         INT IDENTITY(1,1) PRIMARY KEY,
            Level      NVARCHAR(20)  NOT NULL,
            Message    NVARCHAR(MAX) NOT NULL,
            Source     NVARCHAR(200) NULL,
            Exception  NVARCHAR(MAX) NULL,
            UserId     INT           NULL,
            UserEmail  NVARCHAR(255) NULL,
            IpAddress  NVARCHAR(50)  NULL,
            Origin     NVARCHAR(20)  NOT NULL,
            CreatedAt  DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt  DATETIME2     NULL
        );

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AppLogs_CreatedAt' AND object_id = OBJECT_ID('AppLogs'))
        CREATE INDEX IX_AppLogs_CreatedAt ON AppLogs(CreatedAt);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AppLogs_Level' AND object_id = OBJECT_ID('AppLogs'))
        CREATE INDEX IX_AppLogs_Level ON AppLogs(Level);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AppLogs_Origin' AND object_id = OBJECT_ID('AppLogs'))
        CREATE INDEX IX_AppLogs_Origin ON AppLogs(Origin);
    ");
}

static async Task SeedRolesAsync(AppDbContext context)
{
    var roleNames = new[] { "Admin", "User" };
    foreach (var name in roleNames)
    {
        if (!context.Roles.Any(r => r.Name == name))
        {
            context.Roles.Add(new Role
            {
                Name = name,
                Description = name == "Admin" ? "Full administrative access" : "Standard authenticated user"
            });
        }
    }
    await context.SaveChangesAsync();
}

static async Task SeedDevUserAsync(AppDbContext context)
{
    if (!context.Users.Any(u => u.Id == 1))
    {
        var user = new User
        {
            Email = "dev@encounterdaily.local",
            DisplayName = "Dev User",
            Provider = "dev",
            ProviderId = "dev-user",
            SelectedSeriesId = 1,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var userRole = context.Roles.FirstOrDefault(r => r.Name == "User");
        if (userRole != null)
        {
            context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = userRole.Id
            });
            await context.SaveChangesAsync();
        }
    }
}

public static class DevAuthHandlerDefaults
{
    public const string AuthenticationScheme = "DevBypass";
}

public class DevAuthSchemeOptions : AuthenticationSchemeOptions { }

public class DevAuthHandler : AuthenticationHandler<DevAuthSchemeOptions>
{
    public DevAuthHandler(IOptionsMonitor<DevAuthSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "2"),
            new Claim(ClaimTypes.Name, "Jack Kanimea"),
            new Claim(ClaimTypes.Email, "jkanimea@gmail.com"),
            new Claim("role", "User")
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
