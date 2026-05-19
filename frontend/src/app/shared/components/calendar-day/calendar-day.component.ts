import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface CalendarDayData {
  day: number;
  month: number;
  isCompleted?: boolean;
  isToday?: boolean;
  hasBookmark?: boolean;
}

@Component({
  selector: 'app-calendar-day',
  template: `
    <div
      class="calendar-day"
      [class.completed]="day?.isCompleted"
      [class.today]="day?.isToday"
      [class.bookmarked]="day?.hasBookmark"
      (click)="select.emit(day)"
    >
      <span class="day-number">{{ day?.day }}</span>
      <span *ngIf="day?.isCompleted" class="check-mark">✓</span>
    </div>
  `,
  styles: [`
    .calendar-day { display: flex; flex-direction: column; align-items: center; padding: 4px; cursor: pointer; }
    .calendar-day.today { background: var(--ion-color-primary-tint); border-radius: 8px; }
    .calendar-day.completed .check-mark { color: var(--ion-color-success); }
    .calendar-day.bookmarked { border: 1px solid var(--ion-color-warning); border-radius: 8px; }
  `]
})
export class CalendarDayComponent {
  @Input() day?: CalendarDayData;
  @Output() select = new EventEmitter<CalendarDayData>();
}
