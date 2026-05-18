using EncounterDaily.Core.DTOs.Readings;
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

        public async Task<DailyReadingDto> GetTodayReadingAsync(int seriesId)
        {
            var now = DateTime.UtcNow;
            var reading = await _unitOfWork.Readings.GetBySeriesDateAsync(seriesId, now.Month, now.Day);
            if (reading == null)
                throw new KeyNotFoundException($"No reading found for series {seriesId} on {now.Month}/{now.Day}");

            return MapToDto(reading);
        }

        public async Task<ReadingDetailDto> GetFullReadingAsync(int readingId)
        {
            var reading = await _unitOfWork.Readings.GetByIdAsync(readingId);
            if (reading == null)
                throw new KeyNotFoundException($"Reading {readingId} not found");

            return new ReadingDetailDto
            {
                Id = reading.Id,
                SeriesId = reading.SeriesId,
                SeriesName = reading.Series?.Name ?? "",
                Month = reading.Month,
                Day = reading.Day,
                BibleReading = reading.BibleReading,
                FullTextPrimary = reading.FullTextPrimary,
                FullTextSecondary = reading.FullTextSecondary,
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
