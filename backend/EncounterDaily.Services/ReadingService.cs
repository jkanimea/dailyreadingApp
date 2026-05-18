using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class ReadingService : BaseService<DailyReading>, IReadingService
    {
        public ReadingService(IUnitOfWork unitOfWork) : base(unitOfWork) { }

        public async Task<DailyReading?> GetBySeriesDateAsync(int seriesId, int month, int day)
        {
            return await _unitOfWork.Readings.GetBySeriesDateAsync(seriesId, month, day);
        }

        public async Task<IEnumerable<DailyReading>> GetBySeriesMonthAsync(int seriesId, int month)
        {
            return await _unitOfWork.Readings.GetBySeriesMonthAsync(seriesId, month);
        }

        public async Task<IEnumerable<DailyReading>> GetBySeriesYearAsync(int seriesId)
        {
            return await _unitOfWork.Readings.GetBySeriesYearAsync(seriesId);
        }

        public async Task<IEnumerable<DailyReading>> SearchByTextAsync(int seriesId, string searchTerm)
        {
            return await _unitOfWork.Readings.SearchByTextAsync(seriesId, searchTerm);
        }
    }
}
