using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Repositories;
using EncounterDaily.Infrastructure.Data;
using EncounterDaily.Infrastructure.Repositories;

namespace EncounterDaily.Infrastructure
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly AppDbContext _context;
        private readonly Dictionary<Type, object> _repositories = new();
        private IReadingRepository? _readings;
        private IProgressRepository? _progress;
        private IBookmarkRepository? _bookmarks;
        private ISeriesRepository? _series;
        private IUserRepository? _users;
        private IRefreshTokenRepository? _refreshTokens;

        public UnitOfWork(AppDbContext context)
        {
            _context = context;
        }

        public IReadingRepository Readings => _readings ??= new ReadingRepository(_context);
        public IProgressRepository Progress => _progress ??= new ProgressRepository(_context);
        public IBookmarkRepository Bookmarks => _bookmarks ??= new BookmarkRepository(_context);
        public ISeriesRepository Series => _series ??= new SeriesRepository(_context);
        public IUserRepository Users => _users ??= new UserRepository(_context);
        public IRefreshTokenRepository RefreshTokens => _refreshTokens ??= new RefreshTokenRepository(_context);

        public IRepository<T> Repository<T>() where T : BaseEntity
        {
            var type = typeof(T);
            if (_repositories.TryGetValue(type, out var existing))
                return (IRepository<T>)existing;

            var repo = new GenericRepository<T>(_context);
            _repositories[type] = repo;
            return repo;
        }

        public async Task<int> CompleteAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                _context.Dispose();
            }
        }
    }
}
