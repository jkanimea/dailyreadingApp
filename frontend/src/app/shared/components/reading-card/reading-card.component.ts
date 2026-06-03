import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { DailyReading } from '../../../core/models/reading.model';

@Component({
  selector: 'app-reading-card',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (reading) {
      <ion-card (click)="onClick()">
        <ion-card-header>
          <ion-card-subtitle>{{ reading.month }}/{{ reading.day }}</ion-card-subtitle>
          <ion-card-title>{{ reading.bibleReading }}</ion-card-title>
        </ion-card-header>
        @if (reading.primaryBookPageRange) {
          <ion-card-content>
            <p>{{ reading.primaryBookPageRange }}</p>
            @if (reading.secondaryBookPageRange) {
              <p>{{ reading.secondaryBookPageRange }}</p>
            }
          </ion-card-content>
        }
      </ion-card>
    }
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
