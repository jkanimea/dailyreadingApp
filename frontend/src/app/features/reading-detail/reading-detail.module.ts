import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';
import { BaseReadingPageComponent } from '../base/base-reading-page-component';
import { ReadingService } from '../../core/services/reading.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-reading-detail',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ detail?.seriesName ?? 'Reading' }} - Series {{ detail?.seriesId }}</ion-title>
      </ion-toolbar>
      <ion-toolbar *ngIf="detail?.fullTextSecondary">
        <ion-segment [value]="selectedTab" (ionChange)="onTabChange($event)">
          <ion-segment-button value="primary">
            {{ reading?.primaryBookPageRange }}
          </ion-segment-button>
          <ion-segment-button value="secondary">
            {{ detail?.secondaryBookPageRange ?? 'Companion Book' }}
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="loading" class="ion-text-center">
        <ion-spinner></ion-spinner>
      </div>

      <div *ngIf="error" class="ion-text-center">
        <p class="error-message">{{ error }}</p>
      </div>

      <div *ngIf="detail && !loading">
        <div *ngIf="detail.fullTextBible" [style.font-size]="'var(--app-font-size, 17px)'" class="ion-margin-bottom">
          <h2>{{ detail.bibleReading }}</h2>
          <p class="bible-text">{{ detail.fullTextBible }}</p>
        </div>

        <div *ngIf="!detail.fullTextSecondary || selectedTab === 'primary'" [style.font-size]="'var(--app-font-size, 17px)'">
          <h2 class="reading-heading">{{ formatDate(detail.month, detail.day) }} — {{ cleanPageRange(detail.primaryBookPageRange) }}</h2>
          <p><span *ngFor="let seg of getParagraphSegments(detail.fullTextPrimary)" class="egw-text"><span *ngIf="seg.isRef" class="para-ref">{{ seg.text }}</span><span *ngIf="!seg.isRef">{{ seg.text }}</span></span></p>
        </div>

        <div *ngIf="detail.fullTextSecondary && selectedTab === 'secondary'" [style.font-size]="'var(--app-font-size, 17px)'">
          <h2>Companion: {{ detail.secondaryBookPageRange }}</h2>
          <p><span *ngFor="let seg of getParagraphSegments(detail.fullTextSecondary)" class="egw-text"><span *ngIf="seg.isRef" class="para-ref">{{ seg.text }}</span><span *ngIf="!seg.isRef">{{ seg.text }}</span></span></p>
        </div>
      </div>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .bible-text {
      font-style: italic;
      color: var(--ion-color-medium);
      line-height: 1.6;
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 8px;
    }
    .egw-text {
      line-height: 1.8;
    }
    .reading-heading {
      font-size: 18px;
      font-weight: 600;
      margin: 8px 0;
    }
    .para-ref {
      display: inline-block;
      font-size: 0.75em;
      font-weight: 600;
      color: var(--ion-color-primary);
      background: var(--ion-color-primary-contrast);
      border: 1px solid var(--ion-color-primary);
      border-radius: 4px;
      padding: 0 5px;
      margin: 0 2px;
      vertical-align: super;
      line-height: 1.4;
    }
  `]
})
class ReadingDetailPage extends BaseReadingPageComponent {
  selectedTab = 'primary';

  constructor(
    private route: ActivatedRoute,
    readingService: ReadingService
  ) {
    super(readingService);
  }

  paraRefRegex = /\[(\d+)\.(\d+)\]/g;

  monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  formatDate(month: number, day: number): string {
    return `${this.monthNames[month - 1]} ${day}`;
  }

  cleanPageRange(range: string): string {
    return range.replace(/\s*pp\.?\s*/i, ' ');
  }

  getParagraphSegments(text: string | null | undefined): { text: string; isRef: boolean }[] {
    if (!text) return [];
    const segments: { text: string; isRef: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    this.paraRefRegex.lastIndex = 0;

    while ((match = this.paraRefRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, match.index), isRef: false });
      }
      segments.push({ text: match[0], isRef: true });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), isRef: false });
    }

    return segments.length > 0 ? segments : [{ text, isRef: false }];
  }

  onTabChange(event: CustomEvent): void {
    this.selectedTab = event.detail.value;
  }

  protected load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadDetail(id);
    }
  }
}

const routes: Routes = [{ path: '', component: ReadingDetailPage }];

@NgModule({
  declarations: [ReadingDetailPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class ReadingDetailModule {}
