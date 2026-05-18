using EncounterDaily.Core.DTOs.Readings;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface ISeriesFactory
    {
        Task<SeriesConfig> CreateConfigAsync(int seriesId);
    }
}
