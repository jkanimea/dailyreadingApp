import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseCalendarPageComponent, CalendarDay } from '../base/base-calendar-page-component';
import { PreferencesService } from '../../core/services/preferences.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-calendar',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Calendar</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
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

      @if (loading) {
        <div style="padding: 16px 8px;">
          <div class="skeleton-shimmer" style="width:100%;height:300px;border-radius:16px;"></div>
        </div>
      }

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
      padding: 8px 4px 4px;
    }
    .month-header ion-title {
      font-size: 17px;
      font-weight: 700;
      padding: 0;
    }
    .day-names {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-weight: 700;
      font-size: 11px;
      color: var(--ion-color-medium);
      padding: 8px 4px 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      padding: 4px;
    }
    .calendar-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .calendar-cell:not(.empty):active {
      transform: scale(0.92);
    }
    .calendar-cell.today {
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.3);
    }
    .calendar-cell.completed {
      background: rgba(var(--ion-color-success-rgb, 45, 211, 111), 0.15);
      color: var(--ion-text-color);
      font-weight: 600;
    }
    .calendar-cell.bookmarked {
      box-shadow: 0 0 0 2px var(--ion-color-warning);
    }
    .calendar-cell.empty {
      pointer-events: none;
    }
  `],
  standalone: false
})
class CalendarPage extends BaseCalendarPageComponent {
  private router = inject(Router);
  private prefs = inject(PreferencesService);

  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  private seriesId = 1;

  override ionViewWillEnter(): void {
    this.seriesId = this.prefs.getSeriesId();
    super.ionViewWillEnter();
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class CalendarModule {}
