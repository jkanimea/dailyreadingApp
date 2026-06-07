import { NgModule, Component, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController, AlertController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
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
          <ion-back-button defaultHref="/tabs/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>
          {{ detail?.seriesName ?? 'Reading' }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content #pageContent class="ion-padding" [scrollEvents]="true" (ionScroll)="onReadingScroll($event)">
      @if (loading) {
        <div class="skeleton-container">
          <div class="skeleton-shimmer loading-line" style="width: 60%; height: 16px;"></div>
          <div class="skeleton-shimmer loading-line" style="width: 40%; height: 14px; margin-top: 8px;"></div>
          <div class="skeleton-shimmer loading-block" style="margin-top: 20px; height: 120px;"></div>
          <div class="skeleton-shimmer loading-line" style="width: 90%; height: 14px; margin-top: 16px;"></div>
          <div class="skeleton-shimmer loading-line" style="width: 75%; height: 14px; margin-top: 8px;"></div>
          <div class="skeleton-shimmer loading-line" style="width: 85%; height: 14px; margin-top: 8px;"></div>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error }}</p>
        </div>
      }

      @if (detail && !loading) {
        <div class="reading-content">
          <!-- Header info row -->
          <div class="reading-meta">
            <div class="meta-primary">
              <span class="meta-date">{{ formatDate(detail.month, detail.day) }}</span>
            </div>
            <div class="meta-actions">
              @if (completed) {
                <ion-badge color="success" class="completed-badge">
                  <ion-icon name="checkmark-circle"></ion-icon> Done
                </ion-badge>
              }
            </div>
          </div>

          <!-- Bible reading card -->
          @if (detail.bibleReading) {
            <div class="section-card">
              <div class="section-header" (click)="bibleExpanded = !bibleExpanded">
                <ion-icon [name]="bibleExpanded ? 'chevron-up-outline' : 'chevron-down-outline'" class="section-chevron"></ion-icon>
                <span class="section-header-title">{{ detail.bibleReading }}</span>
              </div>
              @if (bibleExpanded) {
                <div class="section-body">
                  @if (bibleSections.length > 0) {
                    @for (section of bibleSections; track section.title) {
                      <div class="bible-text">{{ section.verses.join('\n\n') }}</div>
                    }
                  } @else {
                    @if (detail.fullTextBible) {
                      <div class="bible-text">{{ detail.fullTextBible }}</div>
                    } @else {
                      <div class="empty-bible-text">
                        <p>Bible text not available for {{ translation }}.</p>
                        <ion-button fill="outline" size="small" (click)="onSeedBible()" [disabled]="seeding">
                          {{ seeding ? 'Downloading...' : 'Download ' + translation + ' data' }}
                        </ion-button>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }

          <!-- Primary EGW reading card -->
          @if (detail.primaryBookPageRange) {
          <div class="section-card">
            <div class="section-header" (click)="egwExpanded = !egwExpanded">
              <ion-icon [name]="egwExpanded ? 'chevron-up-outline' : 'chevron-down-outline'" class="section-chevron"></ion-icon>
              <span class="egw-heading">{{ detail.primaryBookPageRange }}</span>
            </div>
            @if (egwExpanded) {
              <div class="section-body">
                <div class="bible-text">
                  @for (seg of getParagraphSegments(detail.fullTextPrimary); track $index) {
                    @if (seg.isRef) {
                      <span class="para-ref">{{ seg.text }}</span>
                    } @else {
                      <span>{{ seg.text }}</span>
                    }
                  }
                </div>
              </div>
            }
          </div>
          }

          <!-- Secondary reading card -->
          @defer {
            @if (detail.fullTextSecondary) {
              <div class="section-card">
                <div class="section-header" (click)="secondaryExpanded = !secondaryExpanded">
                  <ion-icon [name]="secondaryExpanded ? 'chevron-up-outline' : 'chevron-down-outline'" class="section-chevron"></ion-icon>
                  <span class="companion-heading">Companion: {{ detail.secondaryBookPageRange }}</span>
                </div>
                @if (secondaryExpanded) {
                  <div class="section-body">
                    <div class="bible-text">
                      @for (seg of getParagraphSegments(detail.fullTextSecondary); track $index) {
                        @if (seg.isRef) {
                          <span class="para-ref">{{ seg.text }}</span>
                        } @else {
                          <span>{{ seg.text }}</span>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            }
          } @placeholder {
            <div class="skeleton-shimmer" style="width:100%;height:60px;border-radius:12px;"></div>
          }

          <!-- Complete checkbox -->
          @if (readingSeen) {
            <div class="complete-section">
              <ion-checkbox [checked]="completed" (ionChange)="toggleComplete($event)" labelPlacement="start">
                I have read this passage
              </ion-checkbox>
            </div>
          }

          <!-- Journal section -->
          @if (completed || notes) {
            <div class="journal-section">
              <button class="journal-toggle" (click)="showNotes = !showNotes">
                <ion-icon [name]="showNotes ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                <span>My Journal Notes</span>
                @if (notes && !showNotes) {
                  <ion-note slot="end">Has notes</ion-note>
                }
              </button>

              @if (showNotes) {
                <div class="notes-body">
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
                  <div class="notes-footer">
                    <div class="notes-save-status">
                      <ion-icon [name]="notesSaved ? 'checkmark-circle' : 'time-outline'"></ion-icon>
                      <span>{{ notesSaved ? 'Saved' : 'Unsaved' }}</span>
                    </div>
                    @if (notes) {
                      <div class="notes-ai">
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
    .reading-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .reading-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .meta-primary {
      font-size: 18px;
      font-weight: 600;
      color: var(--ion-text-color);
      line-height: 1.4;
    }
    .meta-date {
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    .meta-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .completed-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .section-card {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
    }
    .bible-text {
      font-style: italic;
      color: var(--bible-text-color, var(--ion-color-medium));
      font-size: var(--reading-font-size, 15px);
      line-height: 1.8;
      white-space: pre-line;
      padding-left: 12px;
      border-left: 3px solid var(--ion-color-primary);
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .section-chevron {
      font-size: 20px;
      color: var(--ion-color-step-400, #bbb);
      flex-shrink: 0;
    }
    .section-body {
      margin-top: 12px;
    }
    .section-header-title,
    .egw-heading {
      font-size: 18px;
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    .egw-text {
      line-height: 1.9;
      font-size: var(--reading-font-size, 15px);
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
    .companion-heading {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 12px;
      color: var(--ion-color-step-500, #888);
    }
    .reading-text {
      line-height: 1.9;
    }
    .complete-section {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
    }
    .complete-section ion-checkbox {
      --size: 22px;
      font-size: 15px;
      font-weight: 500;
    }
    .journal-section {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
    }
    .journal-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 14px 16px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      color: var(--ion-text-color);
    }
    .journal-toggle ion-icon {
      font-size: 20px;
      color: var(--ion-color-step-400, #999);
    }
    .journal-toggle ion-note {
      margin-left: auto;
      font-size: 12px;
    }
    .notes-body {
      padding: 0 16px 16px;
    }
    .journal-textarea {
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      font-size: 15px;
      line-height: 1.6;
      background: var(--ion-color-step-50, #f8f8f8);
      border-radius: 10px;
      margin: 0;
    }
    .notes-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }
    .notes-save-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--ion-color-medium);
    }
    .notes-save-status ion-icon {
      font-size: 14px;
    }
    .notes-ai {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .empty-bible-text {
      text-align: center;
      padding: 16px;
      font-size: 14px;
      color: var(--ion-color-medium);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .skeleton-container {
      padding: 8px 0;
    }
    .loading-line {
      border-radius: 6px;
    }
    .loading-block {
      border-radius: 12px;
    }
  `]
})
export class ReadingDetailPage extends BaseReadingPageComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seriesService = inject(SeriesService);
  private prefs = inject(PreferencesService);
  private alertCtrl = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
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
  bibleExpanded = true;
  egwExpanded = true;
  secondaryExpanded = true;
  private notesDebounce?: ReturnType<typeof setTimeout>;
  readingSeen = false;
  @ViewChild('pageContent', { static: false }) content?: any;

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

  private async notifyContentFit(): Promise<void> {
    if (this.readingSeen || !this.content) return;
    try {
      const el = await this.content.getScrollElement();
      if (el && el.scrollHeight <= el.clientHeight + 2) {
        this.readingSeen = true;
      }
    } catch {}
  }

  onReadingScroll(_event: CustomEvent): void {
    if (this.readingSeen || !this.detail || !this.content) return;
    this.content.getScrollElement().then((scrollEl: HTMLElement) => {
      if (this.readingSeen || !scrollEl) return;
      const scrollTop = scrollEl.scrollTop;
      const scrollHeight = scrollEl.scrollHeight;
      const clientHeight = scrollEl.clientHeight;
      const maxScroll = scrollHeight - clientHeight;
      if (scrollTop > 0 && maxScroll > 0 && scrollTop / maxScroll >= 0.85) {
        this.readingSeen = true;
      }
    }).catch(() => {});
  }

  paraRefRegex = /\[(\d+)\.(\d+)\]/g;

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
        this.readingSeen = false;
        await this.loadDetail(id, this.translation);
        await this.checkCompleted(id);
        setTimeout(() => this.notifyContentFit(), 50);
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
