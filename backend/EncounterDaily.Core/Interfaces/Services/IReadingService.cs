using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IReadingService : IService<DailyReading>
    {
        Task<DailyReading?> GetBySeriesDateAsync(int seriesId, int month, int day);
        Task<IEnumerable<DailyReading>> GetBySeriesMonthAsync(int seriesId, int month);
        Task<IEnumerable<DailyReading>> GetBySeriesYearAsync(int seriesId);
        Task<IEnumerable<DailyReading>> SearchByTextAsync(int seriesId, string searchTerm);
    }
}
