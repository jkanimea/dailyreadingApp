import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnDestroy } from '@angular/core';
import { BaseReadingPageComponent } from '../base/base-reading-page-component';
import { ReadingService } from '../../core/services/reading.service';
import { SeriesService } from '../../core/services/series.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { ActivatedRoute } from '@angular/router';
import { Series } from '../../core/models/series.model';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-reading-detail',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today"></ion-back-button>
        </ion-buttons>
        <ion-title (click)="switchSeries()" style="cursor: pointer">
          {{ detail?.seriesName ?? 'Reading' }} - Series {{ detail?.seriesId }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="switchSeries()">
            <ion-icon slot="icon-only" name="swap-horizontal"></ion-icon>
          </ion-button>
        </ion-buttons>
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
        <div [style.font-size]="'var(--app-font-size, 17px)'" class="ion-margin-bottom">
          <h2 class="reading-heading">{{ formatDate(detail.month, detail.day) }} — {{ cleanPageRange(detail.primaryBookPageRange) }}</h2>
        </div>

        <div [style.font-size]="'var(--app-font-size, 17px)'" class="ion-margin-bottom">
          <h2>{{ detail.bibleReading }}</h2>
          <p *ngIf="detail.fullTextBible" class="bible-text">{{ detail.fullTextBible }}</p>
        </div>

        <div [style.font-size]="'var(--app-font-size, 17px)'">
          <p><span *ngFor="let seg of getParagraphSegments(detail.fullTextPrimary)" class="egw-text"><span *ngIf="seg.isRef" class="para-ref">{{ seg.text }}</span><span *ngIf="!seg.isRef">{{ seg.text }}</span></span></p>
        </div>

        <div *ngIf="detail.fullTextSecondary" [style.font-size]="'var(--app-font-size, 17px)'" class="ion-margin-top">
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
export class ReadingDetailPage extends BaseReadingPageComponent implements OnDestroy {
  seriesList: Series[] = [];
  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seriesService: SeriesService,
    private prefs: PreferencesService,
    private actionSheetCtrl: ActionSheetController,
    readingService: ReadingService
  ) {
    super(readingService);
  }

  override ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    super.ngOnDestroy();
  }

  paraRefRegex = /\[(\d+)\.(\d+)\]/g;

  async switchSeries(): Promise<void> {
    try {
      this.seriesList = await firstValueFrom(this.seriesService.getAll());
    } catch {
      return;
    }

    const buttons: any[] = this.seriesList.map(s => ({
      text: `${s.name} - Series ${s.id}`,
      handler: () => this.onSeriesSelected(s.id)
    }));
    buttons.push({ text: 'Cancel', role: 'cancel' });

    const sheet = await this.actionSheetCtrl.create({
      header: 'Select Series',
      buttons
    });
    await sheet.present();
  }

  private async onSeriesSelected(seriesId: number): Promise<void> {
    const current = this.prefs.getSeriesId();
    if (seriesId === current) return;

    await this.prefs.setSeriesId(seriesId);
    try {
      const now = new Date();
      const reading = await firstValueFrom(this.readingService.getToday(seriesId, now.getMonth() + 1, now.getDate()));
      if (reading?.id) {
        this.router.navigate(['/reading', reading.id]);
        return;
      }
    } catch {
      /* fall through to /today */
    }
    this.router.navigate(['/today']);
  }

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

  protected load(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.loadDetail(id);
      }
    });
  }
}

const routes: Routes = [{ path: '', component: ReadingDetailPage }];

@NgModule({
  declarations: [ReadingDetailPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class ReadingDetailModule {}
