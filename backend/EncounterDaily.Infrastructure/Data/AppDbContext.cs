using EncounterDaily.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace EncounterDaily.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Series> Series { get; set; } = null!;
        public DbSet<Book> Books { get; set; } = null!;
        public DbSet<DailyReading> DailyReadings { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<UserProgress> UserProgress { get; set; } = null!;
        public DbSet<UserBookmark> UserBookmarks { get; set; } = null!;
        public DbSet<UserSeriesPreference> UserSeriesPreferences { get; set; } = null!;
        public DbSet<SearchHistory> SearchHistory { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Series>(entity =>
            {
                entity.HasIndex(e => e.ShortName).IsUnique();
                entity.HasOne(e => e.PrimaryBook)
                    .WithMany(b => b.PrimarySeries)
                    .HasForeignKey(e => e.PrimaryBookId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.SecondaryBook)
                    .WithMany(b => b.SecondarySeries)
                    .HasForeignKey(e => e.SecondaryBookId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<DailyReading>(entity =>
            {
                entity.HasIndex(e => new { e.SeriesId, e.Month, e.Day }).IsUnique();
                entity.HasOne(e => e.Series)
                    .WithMany(s => s.DailyReadings)
                    .HasForeignKey(e => e.SeriesId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(e => new { e.Provider, e.ProviderId }).IsUnique();
            });

            modelBuilder.Entity<UserProgress>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.SeriesId, e.DailyReadingId }).IsUnique();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserProgresses)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Series)
                    .WithMany()
                    .HasForeignKey(e => e.SeriesId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.DailyReading)
                    .WithMany(r => r.UserProgresses)
                    .HasForeignKey(e => e.DailyReadingId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<UserBookmark>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.SeriesId, e.DailyReadingId }).IsUnique();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserBookmarks)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Series)
                    .WithMany()
                    .HasForeignKey(e => e.SeriesId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.DailyReading)
                    .WithMany(r => r.UserBookmarks)
                    .HasForeignKey(e => e.DailyReadingId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<UserSeriesPreference>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.SeriesId }).IsUnique();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.SeriesPreferences)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Series)
                    .WithMany()
                    .HasForeignKey(e => e.SeriesId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<SearchHistory>(entity =>
            {
                entity.HasOne(e => e.User)
                    .WithMany(u => u.SearchHistory)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Series)
                    .WithMany()
                    .HasForeignKey(e => e.SeriesId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasIndex(e => e.Token).IsUnique();
                entity.HasIndex(e => new { e.ExpiresAt, e.IsRevoked });
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
