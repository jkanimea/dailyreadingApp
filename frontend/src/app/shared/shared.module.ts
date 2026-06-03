import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AvatarButtonComponent } from './components/avatar-button/avatar-button.component';
import { CalendarDayComponent } from './components/calendar-day/calendar-day.component';
import { MarkdownViewerComponent } from './components/markdown-viewer/markdown-viewer.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { SeriesSelectorComponent } from './components/series-selector/series-selector.component';
import { ReadingCardComponent } from './components/reading-card/reading-card.component';
import { ReadingSummaryComponent } from './components/reading-summary/reading-summary.component';

const STANDALONE_COMPONENTS = [
  CalendarDayComponent,
  MarkdownViewerComponent,
  ProgressBarComponent,
  SearchBarComponent,
  SeriesSelectorComponent,
  ReadingCardComponent,
  ReadingSummaryComponent,
];

@NgModule({
  declarations: [AvatarButtonComponent],
  imports: [CommonModule, IonicModule, RouterModule, ...STANDALONE_COMPONENTS],
  exports: [AvatarButtonComponent, ...STANDALONE_COMPONENTS]
})
export class SharedModule {}
