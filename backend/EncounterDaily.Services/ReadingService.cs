using EncounterDaily.Core.DTOs.Readings;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces;
using EncounterDaily.Core.Interfaces.Services;

namespace EncounterDaily.Services
{
    public class ReadingService : BaseService<DailyReading>, IReadingService
    {
        private readonly BibleTextAssembler _bibleTextAssembler;

        public ReadingService(IUnitOfWork unitOfWork, BibleTextAssembler bibleTextAssembler) : base(unitOfWork)
        {
            _bibleTextAssembler = bibleTextAssembler;
        }

        public async Task<DailyReading?> GetBySeriesDateAsync(int seriesId, int month, int day)
        {
            return await _unitOfWork.Readings.GetBySeriesDateAsync(seriesId, month, day);
        }

        public async Task<DailyReading?> GetByDayNumberAsync(int seriesId, int dayNumber)
        {
            return await _unitOfWork.Readings.GetByDayNumberAsync(seriesId, dayNumber);
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

        public async Task<DailyReadingDto> GetTodayReadingAsync(int seriesId, int? month = null, int? day = null)
        {
            var now = month.HasValue && day.HasValue
                ? new DateTime(DateTime.Now.Year, month.Value, day.Value)
                : DateTime.Now;
            var reading = await _unitOfWork.Readings.GetBySeriesDateAsync(seriesId, now.Month, now.Day);
            if (reading == null)
                throw new KeyNotFoundException($"No reading found for series {seriesId} on {now.Month}/{now.Day}");

            return MapToDto(reading);
        }

        public async Task<ReadingDetailDto> GetFullReadingAsync(int readingId, string translation = "KJV")
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId);
            if (reading == null)
                throw new KeyNotFoundException($"Reading {readingId} not found");

            var bibleText = await _bibleTextAssembler.LookupBibleTextAsync(reading.BibleReading, translation);
            var primaryText = await _bibleTextAssembler.AssembleEgwTextAsync(
                reading.Series?.PrimaryBookId, reading.PrimaryBookPageStart, reading.PrimaryBookPageEnd);
            var secondaryText = await _bibleTextAssembler.AssembleEgwTextAsync(
                reading.Series?.SecondaryBookId, reading.SecondaryBookPageStart, reading.SecondaryBookPageEnd);

            return new ReadingDetailDto
            {
                Id = reading.Id,
                SeriesId = reading.SeriesId,
                SeriesName = reading.Series?.Name ?? "",
                Month = reading.Month,
                Day = reading.Day,
                BibleReading = reading.BibleReading,
                FullTextBible = bibleText,
                FullTextPrimary = string.IsNullOrEmpty(primaryText) ? (reading.FullTextPrimary ?? "") : primaryText,
                FullTextSecondary = string.IsNullOrEmpty(secondaryText) ? (reading.FullTextSecondary ?? "") : secondaryText,
                PrimaryBookPageRange = reading.PrimaryBookPageRange,
                SecondaryBookPageRange = reading.SecondaryBookPageRange,
                HasSecondaryReading = reading.SecondaryBookPageRange != null
            };
        }

        public async Task<SummaryDto> GetSummaryAsync(int readingId)
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId);
            if (reading == null)
                throw new KeyNotFoundException($"Reading {readingId} not found");

            return new SummaryDto
            {
                Id = reading.Id,
                SummaryPoints = reading.SummaryPoints
            };
        }

        public async Task<BibleLookupResponse> LookupBibleVersesAsync(string refs, string translation = "KJV")
        {
            var groups = await _bibleTextAssembler.ResolveReferencesAsync(refs, translation);
            return new BibleLookupResponse { Reference = refs, Groups = groups };
        }

        private static DailyReadingDto MapToDto(DailyReading reading)
        {
            return new DailyReadingDto
            {
                Id = reading.Id,
                SeriesId = reading.SeriesId,
                SeriesName = reading.Series?.Name ?? "",
                Month = reading.Month,
                Day = reading.Day,
                BibleReading = reading.BibleReading,
                PrimaryBookPageRange = reading.PrimaryBookPageRange,
                SecondaryBookPageRange = reading.SecondaryBookPageRange,
                HasSecondaryReading = reading.SecondaryBookPageRange != null,
                SortOrder = reading.SortOrder
            };
        }
    }
}