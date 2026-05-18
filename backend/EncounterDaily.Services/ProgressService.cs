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

        public async Task<UserProgress> MarkCompleteAsync(int userId, int readingId)
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId)
                ?? throw new KeyNotFoundException($"Reading {readingId} not found");

            var progress = await _unitOfWork.Progress.GetUserReadingProgressAsync(userId, readingId);
            if (progress != null)
            {
                progress.IsCompleted = true;
                progress.CompletedAt = DateTime.UtcNow;
                await _unitOfWork.Progress.UpdateAsync(progress);
            }
            else
            {
                progress = new UserProgress
                {
                    UserId = userId,
                    SeriesId = reading.SeriesId,
                    DailyReadingId = readingId,
                    IsCompleted = true,
                    CompletedAt = DateTime.UtcNow
                };
                await _unitOfWork.Progress.AddAsync(progress);
            }

            await _unitOfWork.CompleteAsync();
            return progress;
        }

        public async Task UnmarkCompleteAsync(int userId, int readingId)
        {
            var progress = await _unitOfWork.Progress.GetUserReadingProgressAsync(userId, readingId);
            if (progress != null)
            {
                progress.IsCompleted = false;
                progress.CompletedAt = null;
                await _unitOfWork.Progress.UpdateAsync(progress);
                await _unitOfWork.CompleteAsync();
            }
        }
    }
}
