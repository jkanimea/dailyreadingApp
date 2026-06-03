import { DestroyRef, Directive, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { ReadingService } from '../../core/services/reading.service';
import { DailyReading } from '../../core/models/reading.model';

export interface CalendarDay {
  day: number;
  month: number;
  year: number;
  isCompleted: boolean;
  isToday: boolean;
  hasBookmark: boolean;
  reading?: DailyReading;
}

@Directive()
export abstract class BaseCalendarPageComponent implements OnDestroy {
  /** Modern cleanup hook — prefer over destroy$ for new subscriptions */
  protected readonly destroyRef = inject(DestroyRef);
  /** @deprecated use destroyRef; kept for backward compatibility with subclasses */
  protected readonly destroy$ = new Subject<void>();

  currentMonth: number;
  currentYear: number;
  days: CalendarDay[] = [];
  loading = false;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  protected readingService = inject(ReadingService);

  constructor() {
    const now = new Date();
    this.currentMonth = now.getMonth() + 1;
    this.currentYear = now.getFullYear();
  }

  ionViewWillEnter(): void {
    this.loadMonth(this.currentMonth);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  abstract loadMonth(month: number): void;

  previousMonth(): void {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.loadMonth(this.currentMonth);
  }

  nextMonth(): void {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.loadMonth(this.currentMonth);
  }

  protected getDaysInMonth(month: number, year: number): number {
    return new Date(year, month, 0).getDate();
  }

  protected getMonthName(month: number): string {
    return this.monthNames[month - 1] ?? '';
  }
}
