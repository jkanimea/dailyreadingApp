import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ReadingSummary } from '../../../core/models/reading.model';

@Component({
  selector: 'app-reading-summary',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (summary?.summaryPoints) {
      <ion-card>
        <ion-card-header>
          <ion-card-title>Summary</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>{{ summary?.summaryPoints }}</p>
        </ion-card-content>
      </ion-card>
    }
  `
})
export class ReadingSummaryComponent {
  @Input() summary?: ReadingSummary;
}
