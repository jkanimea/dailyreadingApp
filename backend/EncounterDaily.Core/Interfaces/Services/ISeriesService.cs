using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface ISeriesService : IService<Series>
    {
        Task<IEnumerable<Series>> GetAllSeriesWithBooksAsync();
        Task<Series?> GetSeriesWithBooksAsync(int seriesId);
        Task<SeriesConfig> CreateConfigAsync(int seriesId);
    }
}
