using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class ProgressService : BaseService<UserProgress>, IProgressService
    {
        public ProgressService(IUnitOfWork unitOfWork) : base(unitOfWork) { }

        public async Task<UserProgress?> GetUserReadingProgressAsync(int userId, int readingId)
        {
            return await _unitOfWork.Progress.GetUserReadingProgressAsync(userId, readingId);
        }

        public async Task<int> GetStreakAsync(int userId, int seriesId)
        {
            return await _unitOfWork.Progress.GetStreakAsync(userId, seriesId);
        }

        public async Task<IEnumerable<UserProgress>> GetUserProgressForSeriesAsync(int userId, int seriesId)
        {
            return await _unitOfWork.Progress.GetUserProgressForSeriesAsync(userId, seriesId);
        }

        public async Task<double> GetCompletionPercentageAsync(int userId, int seriesId)
        {
            return await _unitOfWork.Progress.GetCompletionPercentageAsync(userId, seriesId);
        }
    }
}
