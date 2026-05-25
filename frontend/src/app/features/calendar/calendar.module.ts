import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { BaseCalendarPageComponent, CalendarDay } from '../base/base-calendar-page-component';
import { ReadingService } from '../../core/services/reading.service';
import { PreferencesService } from '../../core/services/preferences.service';

@Component({
  selector: 'app-calendar',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title><ion-icon name="calendar-outline"></ion-icon> Calendar</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSearch()">
            <ion-icon slot="icon-only" name="search-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToProgress()">
            <ion-icon slot="icon-only" name="trending-up-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToBookmarks()">
            <ion-icon slot="icon-only" name="bookmark-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="month-header">
        <ion-button fill="clear" (click)="previousMonth()">
          <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
        </ion-button>
        <ion-title size="small">{{ getMonthName(currentMonth) }} {{ currentYear }}</ion-title>
        <ion-button fill="clear" (click)="nextMonth()">
          <ion-icon slot="icon-only" name="chevron-forward"></ion-icon>
        </ion-button>
      </div>

      <div class="day-names">
        <span *ngFor="let name of dayNames">{{ name }}</span>
      </div>

      <div *ngIf="loading" class="ion-text-center ion-padding">
        <ion-spinner></ion-spinner>
      </div>

      <div class="calendar-grid" *ngIf="!loading">
        <div *ngFor="let day of days"
             class="calendar-cell"
             [class.completed]="day.isCompleted"
             [class.today]="day.isToday"
             [class.bookmarked]="day.hasBookmark"
             [class.empty]="!day.day"
             (click)="day.day && onDaySelected(day)">
          <span *ngIf="day.day">{{ day.day }}</span>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .month-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 4px;
    }
    .day-names {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-weight: 600;
      font-size: 12px;
      color: var(--ion-color-medium);
      padding: 4px 0;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
      padding: 4px;
    }
    .calendar-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }
    .calendar-cell.today {
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
      font-weight: 700;
    }
    .calendar-cell.completed {
      background: var(--ion-color-success-tint, #d4edda);
    }
    .calendar-cell.bookmarked {
      border: 2px solid var(--ion-color-warning);
    }
    .calendar-cell.empty {
      pointer-events: none;
    }
  `],
  standalone: false
})
class CalendarPage extends BaseCalendarPageComponent {
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  private seriesId = 1;

  constructor(
    readingService: ReadingService,
    private router: Router,
    private prefs: PreferencesService
  ) {
    super(readingService);
  }

  override ionViewWillEnter(): void {
    this.seriesId = this.prefs.getSeriesId();
    super.ionViewWillEnter();
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  goToProgress(): void {
    this.router.navigate(['/progress']);
  }

  goToBookmarks(): void {
    this.router.navigate(['/bookmarks']);
  }

  setSeriesId(id: number): void {
    this.seriesId = id;
    this.loadMonth(this.currentMonth);
  }

  override loadMonth(month: number): void {
    if (!month) month = this.currentMonth;
    this.loading = true;

    const daysInMonth = this.getDaysInMonth(month, this.currentYear);
    const firstDay = new Date(this.currentYear, month - 1, 1).getDay();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    this.days = [];

    for (let i = 0; i < firstDay; i++) {
      this.days.push({ day: 0, month, year: this.currentYear, isCompleted: false, isToday: false, hasBookmark: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${this.currentYear}-${month}-${d}`;
      this.days.push({
        day: d,
        month,
        year: this.currentYear,
        isCompleted: false,
        isToday: dayStr === todayStr,
        hasBookmark: false
      });
    }

    this.readingService.getByMonth(this.seriesId, month)
      .pipe(takeUntil(this.destroy$))
      .subscribe(readings => {
        if (readings) {
          for (const r of readings) {
            const cell = this.days.find(c => c.day === r.day);
            if (cell) {
              cell.reading = r;
            }
          }
        }
        this.loading = false;
      });
  }

  onDaySelected(day: CalendarDay): void {
    if (day.reading?.id) {
      this.router.navigate(['/reading', day.reading.id]);
    }
  }
}

const routes: Routes = [{ path: '', component: CalendarPage }];

@NgModule({
  declarations: [CalendarPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class CalendarModule {}
