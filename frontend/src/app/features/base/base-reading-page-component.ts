import { DestroyRef, Directive, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { ReadingService } from '../../core/services/reading.service';
import { DailyReading, ReadingDetail, ReadingSummary } from '../../core/models/reading.model';
import { LoggingService } from '../../core/services/logging.service';

@Directive()
export abstract class BaseReadingPageComponent implements OnDestroy {
  /** Modern cleanup hook — prefer over destroy$ for new subscriptions */
  protected readonly destroyRef = inject(DestroyRef);
  /** @deprecated use destroyRef; kept for backward compatibility with subclasses */
  protected readonly destroy$ = new Subject<void>();

  reading?: DailyReading;
  detail?: ReadingDetail;
  summary?: ReadingSummary;
  loading = false;
  error?: string;

  protected readingService = inject(ReadingService);
  protected loggingService = inject(LoggingService);

  ionViewWillEnter(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected abstract load(): void;

  protected async loadReading(seriesId: number): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const now = new Date();
      this.reading = await this.readingService.getToday(seriesId, now.getMonth() + 1, now.getDate()).toPromise();
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
