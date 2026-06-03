import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Series } from '../../../core/models/series.model';

@Component({
  selector: 'app-series-selector',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (series.length > 0) {
      <ion-list>
        <ion-radio-group [value]="selectedId" (ionChange)="seriesSelected.emit($event.detail.value)">
          @for (s of series; track s.id) {
            <ion-item>
              <ion-label>{{ s.name }}</ion-label>
              <ion-radio [value]="s.id"></ion-radio>
            </ion-item>
          }
        </ion-radio-group>
      </ion-list>
    }
  `
})
export class SeriesSelectorComponent {
  @Input() series: Series[] = [];
  @Input() selectedId = 1;
  @Output() seriesSelected = new EventEmitter<number>();
}
