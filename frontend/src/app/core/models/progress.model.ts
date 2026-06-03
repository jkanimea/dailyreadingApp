export interface ProgressDto {
  readingId: number;
  seriesId: number;
  isCompleted: boolean;
  completedAt?: string;
  month: number;
  day: number;
  bibleReading: string;
  notes?: string;
}

export function isProgressDto(value: unknown): value is ProgressDto {
  return typeof value === 'object' && value !== null
    && typeof (value as ProgressDto).readingId === 'number'
    && typeof (value as ProgressDto).isCompleted === 'boolean';
}

export function isProgressDtoArray(value: unknown): value is ProgressDto[] {
  return Array.isArray(value) && value.every(isProgressDto);
}
