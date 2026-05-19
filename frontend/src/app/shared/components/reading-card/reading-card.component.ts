import { Component, Input } from '@angular/core';
import { DailyReading } from '../../core/models/reading.model';

@Component({
  selector: 'app-reading-card',
  template: `
    <ion-card *ngIf="reading" (click)="onClick()">
      <ion-card-header>
        <ion-card-subtitle>{{ reading.month }}/{{ reading.day }}</ion-card-subtitle>
        <ion-card-title>{{ reading.bibleReading }}</ion-card-title>
      </ion-card-header>
      <ion-card-content *ngIf="reading.primaryBookPageRange">
        <p>{{ reading.primaryBookPageRange }}</p>
        <p *ngIf="reading.secondaryBookPageRange">{{ reading.secondaryBookPageRange }}</p>
      </ion-card-content>
    </ion-card>
  `
})
export class ReadingCardComponent {
  @Input() reading?: DailyReading;
  @Input() clickable = true;

  onClick(): void {
    if (this.clickable && this.reading) {
    }
  }
}
