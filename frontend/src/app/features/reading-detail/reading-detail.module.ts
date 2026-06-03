import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController, AlertController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnDestroy } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { BaseReadingPageComponent } from '../base/base-reading-page-component';
import { ProgressService } from '../../core/services/progress.service';
import { SeriesService } from '../../core/services/series.service';
import { PreferencesService, BibleTranslation } from '../../core/services/preferences.service';
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
      @if (loading) {
        <div class="ion-text-center">
          <ion-spinner></ion-spinner>
        </div>
      }

      @if (error) {
        <div class="ion-text-center">
          <p class="error-message">{{ error }}</p>
        </div>
      }

      @if (detail && !loading) {
        <div>
          <div class="reading-header-row ion-margin-bottom">
            <div class="date-section">
              {{ formatDate(detail.month, detail.day) }} — {{ cleanPageRange(detail.primaryBookPageRange) }}
            </div>
            @if (completed) {
              <ion-badge color="success" class="completed-badge">
                <ion-icon name="checkmark-circle"></ion-icon> Done
              </ion-badge>
            }
            @if (detail.bibleReading) {
              <ion-select [value]="translation" (ionChange)="onTranslationChange($event)" interface="popover" class="version-select">
                <ion-select-option value="KJV">KJV</ion-select-option>
                <ion-select-option value="ASV">ASV</ion-select-option>
                <ion-select-option value="WEB">WEB</ion-select-option>
              </ion-select>
            }
          </div>

          @if (detail.bibleReading) {
            <div class="ion-margin-bottom">
              @if (bibleSections.length > 0) {
                @for (section of bibleSections; track section.title) {
                  <h3 class="bible-section-title">{{ section.title }}</h3>
                  <p class="bible-text">{{ section.verses.join('\n\n') }}</p>
                }
              } @else {
                @if (detail.fullTextBible) {
                  <p class="bible-text">{{ detail.fullTextBible }}</p>
                } @else {
                  <p class="empty-bible-text">
                    Bible text not available for {{ translation }}.
                    <ion-button fill="clear" size="small" (click)="onSeedBible()" [disabled]="seeding">
                      {{ seeding ? 'Downloading...' : 'Download ' + translation + ' data' }}
                    </ion-button>
                  </p>
                }
              }
            </div>
          }

          <div [style.font-size]="'var(--reading-font-size, 15px)'">
            <p>
              @for (seg of getParagraphSegments(detail.fullTextPrimary); track $index) {
                <span class="egw-text">
                  @if (seg.isRef) {
                    <span class="para-ref">{{ seg.text }}</span>
                  } @else {
                    <span>{{ seg.text }}</span>
                  }
                </span>
              }
            </p>
          </div>

          @defer {
            @if (detail.fullTextSecondary) {
              <div [style.font-size]="'var(--reading-font-size, 15px)'" class="ion-margin-top">
                <h2 class="companion-heading">Companion: {{ detail.secondaryBookPageRange }}</h2>
                <p>
                  @for (seg of getParagraphSegments(detail.fullTextSecondary); track $index) {
                    <span class="egw-text">
                      @if (seg.isRef) {
                        <span class="para-ref">{{ seg.text }}</span>
                      } @else {
                        <span>{{ seg.text }}</span>
                      }
                    </span>
                  }
                </p>
              </div>
            }
          } @placeholder {
            <ion-skeleton-text animated style="width:100%;height:60px"></ion-skeleton-text>
          }

          <div class="ion-margin-top ion-padding-top complete-checkbox">
            <ion-checkbox [checked]="completed" (ionChange)="toggleComplete($event)">
              I have read this passage
            </ion-checkbox>
          </div>

          @if (completed || notes) {
            <div class="ion-margin-top journal-section">
              <ion-item lines="none" button (click)="showNotes = !showNotes">
                <ion-icon [name]="showNotes ? 'chevron-up-outline' : 'chevron-down-outline'" slot="start"></ion-icon>
                <ion-label>My Journal Notes</ion-label>
                @if (notes && !showNotes) {
                  <ion-note slot="end">Has notes</ion-note>
                }
              </ion-item>

              @if (showNotes) {
                <div class="notes-editor">
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
                    @if (notes) {
                      <div class="summarize-actions">
                        <ion-button fill="clear" size="small" [disabled]="summarizing" (click)="onSummarize()">
                          <ion-icon slot="start" name="bulb-outline"></ion-icon>
                          {{ summarizing ? 'Summarizing...' : 'AI Summarize' }}
                        </ion-button>
                        @if (summarizing) {
                          <ion-spinner name="dots" size="small"></ion-spinner>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .bible-section-title {
      font-size: var(--subheading-font-size, 18px);
      font-weight: 700;
      margin: 16px 0 8px;
      color: var(--ion-text-color);
    }
    .bible-text {
      font-style: italic;
      color: var(--bible-text-color, var(--ion-color-medium));
      font-size: var(--reading-font-size, 15px);
      line-height: 1.6;
      padding: 12px;
      background: var(--bible-text-bg, var(--ion-color-light));
      border-radius: 8px;
      white-space: pre-line;
    }
    .egw-text {
      line-height: 1.8;
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
    .reading-header-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }
    .date-section {
      flex: 0 0 40%;
      min-width: 0;
      font-size: var(--subheading-font-size, 18px);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .completed-badge {
      flex: 0 0 30%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      font-size: calc(var(--subheading-font-size, 18px) - 2px);
      padding: 4px 6px;
      white-space: nowrap;
    }
    .version-select {
      flex: 0 0 30%;
      max-width: 30%;
      font-size: var(--subheading-font-size, 18px);
      font-weight: 600;
      --padding-top: 2px;
      --padding-bottom: 2px;
      --padding-start: 8px;
      --padding-end: 4px;
      min-height: 28px;
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
    .empty-bible-text {
      font-style: italic;
      color: var(--ion-color-medium);
      text-align: center;
      padding: 24px;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .translation-bar {
      margin-bottom: 10px;
      ion-segment {
        max-width: 220px;
        --background: var(--ion-color-light);
      }
      ion-segment-button {
        --padding-top: 4px;
        --padding-bottom: 4px;
        font-size: 12px;
        font-weight: 600;
        min-height: 32px;
      }
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
  translation: BibleTranslation = 'KJV';
  seeding = false;
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

  async onTranslationChange(event: CustomEvent): Promise<void> {
    this.translation = event.detail.value as BibleTranslation;
    await this.prefs.setTranslation(this.translation);
    if (this.detail?.id) {
      await this.loadDetail(this.detail.id, this.translation);
    }
  }

  async onSeedBible(): Promise<void> {
    this.seeding = true;
    try {
      await firstValueFrom(this.readingService.seedBible());
      if (this.detail?.id) {
        await this.loadDetail(this.detail.id, this.translation);
      }
    } catch {
    } finally {
      this.seeding = false;
    }
  }

  protected async load(): Promise<void> {
    this.translation = this.prefs.getTranslation();
    this.routeSub?.unsubscribe();
    this.routeSub = this.route.paramMap.subscribe(async params => {
      const id = Number(params.get('id'));
      if (id) {
        await this.loadDetail(id, this.translation);
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
