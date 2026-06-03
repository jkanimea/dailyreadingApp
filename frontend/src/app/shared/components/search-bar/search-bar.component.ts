import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-searchbar
      [value]="query"
      [placeholder]="placeholder"
      (ionInput)="searched.emit($event.detail.value ?? '')"
      (ionClear)="searched.emit('')"
      debounce="300"
    ></ion-searchbar>
  `
})
export class SearchBarComponent {
  @Input() query = '';
  @Input() placeholder = 'Search readings...';
  @Output() searched = new EventEmitter<string>();
}
