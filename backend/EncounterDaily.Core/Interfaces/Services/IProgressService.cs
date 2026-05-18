using EncounterDaily.Core.Entities;

namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IProgressService : IService<UserProgress>
    {
        Task<UserProgress?> GetUserReadingProgressAsync(int userId, int readingId);
        Task<int> GetStreakAsync(int userId, int seriesId);
        Task<IEnumerable<UserProgress>> GetUserProgressForSeriesAsync(int userId, int seriesId);
        Task<double> GetCompletionPercentageAsync(int userId, int seriesId);
    }
}
