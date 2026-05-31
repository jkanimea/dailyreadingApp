import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-search-bar',
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
