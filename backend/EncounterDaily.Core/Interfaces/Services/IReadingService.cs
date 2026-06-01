using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IReadingService : IService<DailyReading>
    {
        Task<DailyReading?> GetBySeriesDateAsync(int seriesId, int month, int day);
        Task<IEnumerable<DailyReading>> GetBySeriesMonthAsync(int seriesId, int month);
        Task<IEnumerable<DailyReading>> GetBySeriesYearAsync(int seriesId);
        Task<IEnumerable<DailyReading>> SearchByTextAsync(int seriesId, string searchTerm);
        Task<DailyReadingDto> GetTodayReadingAsync(int seriesId, int? month = null, int? day = null);
        Task<ReadingDetailDto> GetFullReadingAsync(int readingId, string translation = "KJV");
        Task<SummaryDto> GetSummaryAsync(int readingId);
        Task<object> GetBibleStatusAsync();
    }
}
