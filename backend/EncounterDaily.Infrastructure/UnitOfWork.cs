using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Infrastructure.Repositories;

namespace EncounterDaily.Infrastructure
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly AppDbContext _context;
        private IReadingRepository? _readings;
        private IProgressRepository? _progress;
        private IBookmarkRepository? _bookmarks;
        private ISeriesRepository? _series;

        public UnitOfWork(AppDbContext context)
        {
            _context = context;
        }

        public IReadingRepository Readings => _readings ??= new ReadingRepository(_context);
        public IProgressRepository Progress => _progress ??= new ProgressRepository(_context);
        public IBookmarkRepository Bookmarks => _bookmarks ??= new BookmarkRepository(_context);
        public ISeriesRepository Series => _series ??= new SeriesRepository(_context);

        public async Task<int> CompleteAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
