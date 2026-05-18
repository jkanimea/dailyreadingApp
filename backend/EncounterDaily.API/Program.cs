using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;
using EncounterDaily.Infrastructure;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

builder.Services.AddScoped<ISeriesService, SeriesService>();
builder.Services.AddScoped<IReadingService, ReadingService>();
builder.Services.AddScoped<IProgressService, ProgressService>();
builder.Services.AddScoped<IBookmarkService, BookmarkService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

app.MapControllers();

app.Run();
