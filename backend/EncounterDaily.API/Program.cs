using System.Security.Cryptography;
using System.Threading.RateLimiting;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Infrastructure;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

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

if (!bypassAuth)
{
    builder.Services.AddControllers(options =>
    {
        options.Filters.Add(new AuthorizeFilter());
    });

    builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));

    var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
    var rsa = RSA.Create();
    if (!string.IsNullOrEmpty(jwtSettings.RsaPrivateKey))
    {
        rsa.ImportFromPem(jwtSettings.RsaPrivateKey.ToCharArray());
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
                ClockSkew = TimeSpan.Zero
            };
        });
}
else
{
    builder.Services.AddControllers();
    builder.Services.AddSingleton(RSA.Create());
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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowMobileApp");

app.UseRateLimiter();

if (!bypassAuth)
{
    app.UseAuthentication();
    app.UseAuthorization();
}

app.MapControllers()
   .RequireRateLimiting("PerIp");

app.Run();
