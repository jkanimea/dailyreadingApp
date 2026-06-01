namespace EncounterDaily.Core.Interfaces.Services
{
    public interface IAiSummaryService
    {
        Task<string> SummarizeAsync(string notes);
    }
}
