using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class SeriesService : BaseService<Series>, ISeriesService
    {
        public SeriesService(IUnitOfWork unitOfWork) : base(unitOfWork) { }

        public override async Task<Series?> GetByIdAsync(int id)
        {
            return await _unitOfWork.Series.GetSeriesWithBooksAsync(id);
        }

        public override async Task<IEnumerable<Series>> GetAllAsync()
        {
            return await _unitOfWork.Series.GetAllSeriesWithBooksAsync();
        }

        public async Task<IEnumerable<Series>> GetAllSeriesWithBooksAsync()
        {
            return await _unitOfWork.Series.GetAllSeriesWithBooksAsync();
        }

        public async Task<Series?> GetSeriesWithBooksAsync(int seriesId)
        {
            return await _unitOfWork.Series.GetSeriesWithBooksAsync(seriesId);
        }
    }
}
