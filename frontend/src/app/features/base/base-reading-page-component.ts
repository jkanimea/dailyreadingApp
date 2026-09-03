import { DestroyRef, Directive, inject } from '@angular/core';
import { ReadingService } from '../../core/services/reading.service';
import { DailyReading, ReadingDetail, ReadingSummary } from '../../core/models/reading.model';
import { LoggingService } from '../../core/services/logging.service';
import { PreferencesService } from '../../core/services/preferences.service';

@Directive()
export abstract class BaseReadingPageComponent {
  protected readonly destroyRef = inject(DestroyRef);

  reading?: DailyReading;
  detail?: ReadingDetail;
  summary?: ReadingSummary;
  loading = false;
  error?: string;

  protected readingService = inject(ReadingService);
  protected loggingService = inject(LoggingService);
  protected preferences = inject(PreferencesService);

  ionViewWillEnter(): void {
    this.load();
  }

  protected abstract load(): void;

  protected async loadReading(seriesId: number): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const now = new Date();
      const mode = await this.preferences.getSeriesMode(seriesId);
      const startDate = await this.preferences.getSeriesStartDate(seriesId);
      this.reading = await this.readingService.getForMode(seriesId, mode, startDate, undefined, now).toPromise();
    } catch (e: unknown) {
      this.loggingService.error('BaseReadingPageComponent', 'loadReading', String(e));
      this.error = 'Failed to load reading';
    } finally {
      this.loading = false;
    }
  }

  protected async loadDetail(readingId: number, translation = 'KJV'): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      this.detail = await this.readingService.getFullReading(readingId, translation).toPromise();
      if (this.detail) {
        this.summary = await this.readingService.getSummary(readingId).toPromise();
      }
    } catch (e: unknown) {
      this.loggingService.error('BaseReadingPageComponent', 'loadDetail', String(e));
      this.error = 'Failed to load reading details';
    } finally {
      this.loading = false;
    }
  }
}