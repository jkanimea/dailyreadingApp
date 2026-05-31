import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnDestroy } from '@angular/core';
import { BaseReadingPageComponent } from '../base/base-reading-page-component';
import { ReadingService } from '../../core/services/reading.service';
import { ProgressService } from '../../core/services/progress.service';
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
          <ion-back-button defaultHref="/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>
          {{ detail?.seriesName ?? 'Reading' }} - Series {{ detail?.seriesId }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openFeatures()">
            <ion-icon slot="icon-only" name="grid-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToAccount()">
            <ion-icon slot="icon-only" name="person-circle-outline"></ion-icon>
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
        <div class="completed-banner" *ngIf="completed">
          <ion-icon name="checkmark-circle" color="success"></ion-icon> Reading marked complete
        </div>

        <div [style.font-size]="'var(--app-font-size, 17px)'" class="ion-margin-bottom">
          <h2 class="reading-heading">{{ formatDate(detail.month, detail.day) }} — {{ cleanPageRange(detail.primaryBookPageRange) }}</h2>
        </div>

        <div class="ion-margin-bottom">
          <ng-container *ngIf="bibleSections.length > 0; else plainBible">
            <ng-container *ngFor="let section of bibleSections">
              <h3 class="bible-section-title">{{ section.title }}</h3>
              <p class="bible-text">{{ section.verses.join('\n\n') }}</p>
            </ng-container>
          </ng-container>
          <ng-template #plainBible>
            <p *ngIf="detail.fullTextBible" class="bible-text">{{ detail.fullTextBible }}</p>
          </ng-template>
        </div>

        <div [style.font-size]="'var(--app-font-size, 17px)'">
          <p><span *ngFor="let seg of getParagraphSegments(detail.fullTextPrimary)" class="egw-text"><span *ngIf="seg.isRef" class="para-ref">{{ seg.text }}</span><span *ngIf="!seg.isRef">{{ seg.text }}</span></span></p>
        </div>

        <div *ngIf="detail.fullTextSecondary" [style.font-size]="'var(--app-font-size, 17px)'" class="ion-margin-top">
          <h2>Companion: {{ detail.secondaryBookPageRange }}</h2>
          <p><span *ngFor="let seg of getParagraphSegments(detail.fullTextSecondary)" class="egw-text"><span *ngIf="seg.isRef" class="para-ref">{{ seg.text }}</span><span *ngIf="!seg.isRef">{{ seg.text }}</span></span></p>
        </div>

        <div class="ion-margin-top ion-padding-top complete-checkbox">
          <ion-checkbox [checked]="completed" (ionChange)="toggleComplete($event)">
            I have read this passage
          </ion-checkbox>
        </div>
      </div>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .bible-section-title {
      font-size: 20px;
      font-weight: 700;
      margin: 16px 0 8px;
      color: var(--ion-text-color);
    }
    .bible-text {
      font-style: italic;
      color: var(--bible-text-color, var(--ion-color-medium));
      font-size: 15px;
      line-height: 1.6;
      padding: 12px;
      background: var(--bible-text-bg, var(--ion-color-light));
      border-radius: 8px;
      white-space: pre-line;
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
    .completed-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--ion-color-success-tint, #e8f5e9);
      color: var(--ion-color-success-shade, #2e7d32);
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 12px;
    }
    .complete-checkbox {
      border-top: 1px solid var(--ion-color-light-shade);
      text-align: center;
    }
    .complete-checkbox ion-checkbox {
      --size: 24px;
      font-size: 16px;
    }
  `]
})
export class ReadingDetailPage extends BaseReadingPageComponent implements OnDestroy {
  seriesList: Series[] = [];
  private routeSub?: Subscription;
  completed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seriesService: SeriesService,
    private prefs: PreferencesService,
    private actionSheetCtrl: ActionSheetController,
    private progressService: ProgressService,
    readingService: ReadingService
  ) {
    super(readingService);
  }

  override ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    super.ngOnDestroy();
  }

  async toggleComplete(event: CustomEvent): Promise<void> {
    if (!this.detail) return;
    const checked = event.detail.checked;
    try {
      if (checked) {
        await firstValueFrom(this.progressService.markComplete(this.detail.id));
      } else {
        await firstValueFrom(this.progressService.unmarkComplete(this.detail.id));
      }
      this.completed = checked;
    } catch {
      this.completed = !checked;
    }
  }

  paraRefRegex = /\[(\d+)\.(\d+)\]/g;

  async openFeatures(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Features',
      buttons: [
        { text: 'Search', icon: 'search-outline', handler: () => this.router.navigate(['/search']) },
        { text: 'Progress', icon: 'trending-up-outline', handler: () => this.router.navigate(['/progress']) },
        { text: 'Bookmarks', icon: 'bookmark-outline', handler: () => this.router.navigate(['/bookmarks']) },
        { text: 'Calendar', icon: 'calendar-outline', handler: () => this.router.navigate(['/calendar']) },
        { text: 'Switch Series', icon: 'swap-horizontal', handler: () => this.switchSeries() },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  goToAccount(): void {
    this.router.navigate(['/account']);
  }

  goToProgress(): void {
    this.router.navigate(['/progress']);
  }

  goToBookmarks(): void {
    this.router.navigate(['/bookmarks']);
  }

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

  get bibleSections(): { title: string; verses: string[] }[] {
    const full = this.detail?.fullTextBible;
    if (!full) return [];

    const sections: { title: string; verses: string[] }[] = [];
    const blocks = full.split('\n\n');
    let current: { title: string; verses: string[] } | null = null;

    for (const block of blocks) {
      if (/^[A-Za-z0-9 ]+ \d+:\d+(?:-\d+)?$/.test(block.trim())) {
        current = { title: block, verses: [] };
        sections.push(current);
      } else if (current) {
        current.verses.push(block);
      }
    }

    return sections;
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

  protected async load(): Promise<void> {
    this.routeSub?.unsubscribe();
    this.routeSub = this.route.paramMap.subscribe(async params => {
      const id = Number(params.get('id'));
      if (id) {
        await this.loadDetail(id);
        await this.checkCompleted(id);
      }
    });
  }

  private async checkCompleted(readingId: number): Promise<void> {
    if (!this.detail?.seriesId) return;
    try {
      const allProgress = await firstValueFrom(this.progressService.getSeriesProgress(this.detail.seriesId));
      this.completed = allProgress.some(p => p.readingId === readingId && p.isCompleted);
    } catch {
      this.completed = false;
    }
  }
}

const routes: Routes = [{ path: '', component: ReadingDetailPage }];

@NgModule({
  declarations: [ReadingDetailPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class ReadingDetailModule {}
