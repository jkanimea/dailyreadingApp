import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController, AlertController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnDestroy } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { BaseReadingPageComponent } from '../base/base-reading-page-component';
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
          <app-avatar-btn></app-avatar-btn>
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

        <div class="ion-margin-top journal-section" *ngIf="completed || notes">
          <ion-item lines="none" button (click)="showNotes = !showNotes">
            <ion-icon [name]="showNotes ? 'chevron-up-outline' : 'chevron-down-outline'" slot="start"></ion-icon>
            <ion-label>My Journal Notes</ion-label>
            <ion-note slot="end" *ngIf="notes && !showNotes">Has notes</ion-note>
          </ion-item>

          <div *ngIf="showNotes" class="notes-editor">
            <ion-textarea
              [value]="notes"
              (ionInput)="onNotesChange($event)"
              placeholder="Write your thoughts, key points, or reflections from today's reading..."
              [autoGrow]="true"
              rows="4"
              [counter]="true"
              [maxlength]="2000"
              class="journal-textarea">
            </ion-textarea>
            <div class="notes-status">
              <ion-note [color]="notesSaved ? 'success' : 'medium'">
                <ion-icon [name]="notesSaved ? 'checkmark-circle' : 'time-outline'"></ion-icon>
                {{ notesSaved ? 'Saved' : 'Unsaved' }}
              </ion-note>
              <div class="summarize-actions" *ngIf="notes">
                <ion-button fill="clear" size="small" [disabled]="summarizing" (click)="onSummarize()">
                  <ion-icon slot="start" name="bulb-outline"></ion-icon>
                  {{ summarizing ? 'Summarizing...' : 'AI Summarize' }}
                </ion-button>
                <ion-spinner *ngIf="summarizing" name="dots" size="small"></ion-spinner>
              </div>
            </div>
          </div>
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
    .journal-section {
      border-top: 1px solid var(--ion-color-light-shade);
      margin-top: 16px;
      padding-top: 8px;
    }
    .journal-textarea {
      --padding-start: 0;
      font-style: normal;
      font-size: 15px;
      line-height: 1.6;
      border: 1px solid var(--ion-color-light-shade);
      border-radius: 8px;
      padding: 8px 12px;
      margin-top: 8px;
    }
    .notes-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 13px;
    }
    .summarize-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `]
})
export class ReadingDetailPage extends BaseReadingPageComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seriesService = inject(SeriesService);
  private prefs = inject(PreferencesService);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  private progressService = inject(ProgressService);

  seriesList: Series[] = [];
  private routeSub?: Subscription;
  completed = false;
  notes = '';
  showNotes = false;
  notesSaved = false;
  summarizing = false;
  private notesDebounce?: ReturnType<typeof setTimeout>;

  override ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    clearTimeout(this.notesDebounce);
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
        { text: 'Journal', icon: 'journal-outline', handler: () => this.router.navigate(['/journal']) },
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

  async onNotesChange(event: CustomEvent): Promise<void> {
    this.notes = event.detail.value ?? '';
    this.notesSaved = false;

    clearTimeout(this.notesDebounce);
    this.notesDebounce = setTimeout(async () => {
      await this.saveNotes();
    }, 1500);
  }

  private async saveNotes(): Promise<void> {
    if (!this.detail) return;
    try {
      await firstValueFrom(this.progressService.saveNotes(this.detail.id, this.notes));
      this.notesSaved = true;
    } catch {
    }
  }

  async onSummarize(): Promise<void> {
    if (!this.detail || !this.notes) return;
    this.summarizing = true;
    try {
      const result = await firstValueFrom(this.progressService.summarizeNotes(this.detail.id, this.notes));
      const alert = await this.alertCtrl.create({
        header: 'AI Summary',
        message: result.summary,
        buttons: [
          { text: 'Dismiss', role: 'cancel' },
          { text: 'Replace Notes', handler: () => this.replaceNotesWithSummary(result.summary) }
        ]
      });
      await alert.present();
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Failed to summarize notes. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.summarizing = false;
    }
  }

  private async replaceNotesWithSummary(summary: string): Promise<void> {
    this.notes = summary;
    this.notesSaved = false;
    await this.saveNotes();
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
      const readingProgress = allProgress.find(p => p.readingId === readingId);
      if (readingProgress?.notes) {
        this.notes = readingProgress.notes;
        this.showNotes = true;
      }
    } catch {
      this.completed = false;
    }
  }
}

const routes: Routes = [{ path: '', component: ReadingDetailPage }];

@NgModule({
  declarations: [ReadingDetailPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class ReadingDetailModule {}
