using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Repositories
{
    public interface ISeriesRepository : IRepository<Series>
    {
        Task<IEnumerable<Series>> GetAllSeriesWithBooksAsync();
        Task<Series?> GetSeriesWithBooksAsync(int seriesId);
    }
}
