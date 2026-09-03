using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Repositories
{
    public interface IReadingRepository : IRepository<DailyReading>
    {
        Task<DailyReading?> GetBySeriesDateAsync(int seriesId, int month, int day);
        Task<DailyReading?> GetByDayNumberAsync(int seriesId, int dayNumber);
        Task<IEnumerable<DailyReading>> GetBySeriesMonthAsync(int seriesId, int month);
        Task<IEnumerable<DailyReading>> GetBySeriesYearAsync(int seriesId);
        Task<IEnumerable<DailyReading>> SearchByTextAsync(int seriesId, string searchTerm);
    }
}
