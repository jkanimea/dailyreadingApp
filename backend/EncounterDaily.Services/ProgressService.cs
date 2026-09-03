using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;
using System.ComponentModel.DataAnnotations;

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

        public async Task<ProgressDto?> SaveNotesAsync(int userId, int readingId, string? notes)
        {
            notes = notes?.Trim();
            if (notes?.Length > 2000)
                throw new ValidationException("Notes must be 2000 characters or fewer.");

            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId)
                ?? throw new KeyNotFoundException($"Reading {readingId} not found");

            var progress = await _unitOfWork.Progress.GetUserReadingProgressAsync(userId, readingId);

            if (string.IsNullOrWhiteSpace(notes))
            {
                if (progress != null && !progress.IsCompleted)
                {
                    await _unitOfWork.Progress.DeleteAsync(progress.Id);
                    await _unitOfWork.CompleteAsync();
                    return null;
                }
                if (progress != null)
                {
                    progress.Notes = null;
                    await _unitOfWork.Progress.UpdateAsync(progress);
                    await _unitOfWork.CompleteAsync();
                    return MapToDto(progress);
                }
                return null;
            }

            if (progress != null)
            {
                progress.Notes = notes;
                await _unitOfWork.Progress.UpdateAsync(progress);
            }
            else
            {
                progress = new UserProgress
                {
                    UserId = userId,
                    SeriesId = reading.SeriesId,
                    DailyReadingId = readingId,
                    IsCompleted = false,
                    Notes = notes
                };
                await _unitOfWork.Progress.AddAsync(progress);
            }

            await _unitOfWork.CompleteAsync();
            return MapToDto(progress);
        }

        public async Task<IEnumerable<JournalEntryDto>> GetJournalAsync(int userId, int seriesId)
        {
            var entries = await _unitOfWork.Progress.GetJournalEntriesAsync(userId, seriesId);
            return entries.Select(e => new JournalEntryDto
            {
                ReadingId = e.DailyReadingId,
                SeriesId = e.SeriesId,
                SeriesName = e.DailyReading?.Series?.Name ?? string.Empty,
                Month = e.DailyReading?.Month ?? 0,
                Day = e.DailyReading?.Day ?? 0,
                BibleReading = e.DailyReading?.BibleReading ?? string.Empty,
                PrimaryBookPageRange = e.DailyReading?.PrimaryBookPageRange ?? string.Empty,
                SecondaryBookPageRange = e.DailyReading?.SecondaryBookPageRange,
                IsCompleted = e.IsCompleted,
                CompletedAt = e.CompletedAt,
                Notes = e.Notes
            }).OrderBy(j => j.Month).ThenBy(j => j.Day);
        }

        public async Task ResetSeriesAsync(int userId, int seriesId, bool deleteNotes = false)
        {
            await _unitOfWork.Progress.ResetSeriesAsync(userId, seriesId, deleteNotes);
            await _unitOfWork.CompleteAsync();
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
                BibleReading = p.DailyReading?.BibleReading ?? string.Empty,
                Notes = p.Notes
            };
        }
    }
}
