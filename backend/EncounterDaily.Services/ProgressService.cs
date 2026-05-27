using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class ProgressService : BaseService<UserProgress>, IProgressService
    {
        public ProgressService(IUnitOfWork unitOfWork) : base(unitOfWork) { }

        public async Task<ProgressDto?> GetUserReadingProgressAsync(int userId, int readingId)
        {
            var progress = await _unitOfWork.Progress.GetUserReadingProgressAsync(userId, readingId);
            return progress == null ? null : MapToDto(progress);
        }

        public async Task<int> GetStreakAsync(int userId, int seriesId)
        {
            return await _unitOfWork.Progress.GetStreakAsync(userId, seriesId);
        }

        public async Task<IEnumerable<ProgressDto>> GetUserProgressForSeriesAsync(int userId, int seriesId)
        {
            var items = await _unitOfWork.Progress.GetUserProgressForSeriesAsync(userId, seriesId);
            return items.Select(MapToDto);
        }

        public async Task<double> GetCompletionPercentageAsync(int userId, int seriesId)
        {
            return await _unitOfWork.Progress.GetCompletionPercentageAsync(userId, seriesId);
        }

        public async Task<int> GetCompletedCountAsync(int userId, int seriesId)
        {
            return await _unitOfWork.Progress.GetCompletedCountAsync(userId, seriesId);
        }

        public async Task<ProgressDto> MarkCompleteAsync(int userId, int readingId)
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
            return MapToDto(progress);
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

        private static ProgressDto MapToDto(UserProgress p)
        {
            return new ProgressDto
            {
                ReadingId = p.DailyReadingId,
                SeriesId = p.SeriesId,
                IsCompleted = p.IsCompleted,
                CompletedAt = p.CompletedAt,
                Month = p.DailyReading?.Month ?? 0,
                Day = p.DailyReading?.Day ?? 0,
                BibleReading = p.DailyReading?.BibleReading ?? string.Empty
            };
        }
    }
}
