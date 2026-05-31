import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Series } from '../../../core/models/series.model';

@Component({
  selector: 'app-series-selector',
  template: `
    <ion-list *ngIf="series.length > 0">
      <ion-radio-group [value]="selectedId" (ionChange)="select.emit($event.detail.value)">
        <ion-item *ngFor="let s of series">
          <ion-label>{{ s.name }}</ion-label>
          <ion-radio [value]="s.id"></ion-radio>
        </ion-item>
      </ion-radio-group>
    </ion-list>
  `
})
export class SeriesSelectorComponent {
  @Input() series: Series[] = [];
  @Input() selectedId = 1;
  @Output() select = new EventEmitter<number>();
}
