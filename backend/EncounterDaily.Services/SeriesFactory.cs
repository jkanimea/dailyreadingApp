using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class SeriesFactory : ISeriesFactory
    {
        private readonly IUnitOfWork _unitOfWork;

        public SeriesFactory(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<SeriesConfig> CreateConfigAsync(int seriesId)
        {
            var series = await _unitOfWork.Series.GetSeriesWithBooksAsync(seriesId);

            return new SeriesConfig
            {
                SeriesId = seriesId,
                PrimaryBookTitle = series?.PrimaryBook?.Title ?? "Unknown",
                SecondaryBookTitle = series?.SecondaryBook?.Title,
                HasSecondaryReading = series?.SecondaryBookId.HasValue ?? false,
                DateRangeStart = "01-01"
            };
        }
    }
}
