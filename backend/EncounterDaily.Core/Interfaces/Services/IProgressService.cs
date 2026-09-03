using EncounterDaily.Core.DTOs.Progress;
using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IProgressService : IService<UserProgress>
    {
        Task<ProgressDto?> GetUserReadingProgressAsync(int userId, int readingId);
        Task<int> GetStreakAsync(int userId, int seriesId);
        Task<IEnumerable<ProgressDto>> GetUserProgressForSeriesAsync(int userId, int seriesId);
        Task<double> GetCompletionPercentageAsync(int userId, int seriesId);
        Task<int> GetCompletedCountAsync(int userId, int seriesId);
        Task<ProgressDto> MarkCompleteAsync(int userId, int readingId);
        Task UnmarkCompleteAsync(int userId, int readingId);
        Task<ProgressDto?> SaveNotesAsync(int userId, int readingId, string? notes);
        Task<IEnumerable<JournalEntryDto>> GetJournalAsync(int userId, int seriesId);
        Task ResetSeriesAsync(int userId, int seriesId, bool deleteNotes = false);
    }
}
