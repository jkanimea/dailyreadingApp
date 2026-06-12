import { NgModule, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReadingService } from '../../core/services/reading.service';
import { ProgressService } from '../../core/services/progress.service';
import { PreferencesService, BibleTranslation } from '../../core/services/preferences.service';
import { LoggingService } from '../../core/services/logging.service';
import { ReadingDetail } from '../../core/models/reading.model';
import { SharedModule } from '../../shared/shared.module';
import { firstValueFrom } from 'rxjs';

interface ParaSegment {
  text: string;
  isRef: boolean;
}

interface BibleSection {
  title: string;
  verses: string[];
}

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <div class="header-title">
            <ion-icon name="sunny-outline" class="header-icon"></ion-icon>
            <span>Today — {{ seriesName }}</span>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading) {
        <div class="skeleton-container">
          <div class="skeleton-shimmer loading-line" style="width:60%;height:16px;"></div>
          <div class="skeleton-shimmer loading-line" style="width:40%;height:14px;margin-top:8px;"></div>
          <div class="skeleton-shimmer loading-block" style="margin-top:20px;height:120px;"></div>
          <div class="skeleton-shimmer loading-line" style="width:90%;height:14px;margin-top:16px;"></div>
          <div class="skeleton-shimmer loading-line" style="width:75%;height:14px;margin-top:8px;"></div>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error }}</p>
          <ion-button fill="outline" size="small" (click)="loadToday()" class="ion-margin-top">
            <ion-icon slot="start" name="refresh-outline"></ion-icon>
            Retry
          </ion-button>
        </div>
      }

      @if (detail && !loading) {
        <div class="reading-content">
          <!-- Header info row -->
          <div class="reading-meta">
            <div class="meta-date">{{ formatDate(detail.month, detail.day) }}</div>
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
                @if (detail.fullTextPrimary) {
                  <div class="bible-text">
                    @for (seg of getParagraphSegments(detail.fullTextPrimary); track $index) {
                      @if (seg.isRef) {
                        <span class="para-ref">{{ seg.text }}</span>
                      } @else {
                        <span>{{ seg.text }}</span>
                      }
                    }
                  </div>
                } @else {
                  <p class="text-unavailable">Text not yet available for this reading.</p>
                }
              </div>
            }
          </div>
          }

          <!-- Secondary reading card -->
          @defer {
            @if (detail.fullTextSecondary) {
              <div class="section-card reading-card">
                <div class="section-header" (click)="secondaryExpanded = !secondaryExpanded">
                  <ion-icon [name]="secondaryExpanded ? 'chevron-up-outline' : 'chevron-down-outline'" class="section-chevron"></ion-icon>
                  <span class="companion-heading">Companion: {{ detail.secondaryBookPageRange }}</span>
                </div>
                @if (secondaryExpanded) {
                  <div class="section-body">
                    <div class="reading-text">
                      @for (seg of getParagraphSegments(detail.fullTextSecondary); track $index) {
                        <span class="egw-text">
                          @if (seg.isRef) {
                            <span class="para-ref">{{ seg.text }}</span>
                          } @else {
                            <span>{{ seg.text }}</span>
                          }
                        </span>
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
          <div class="complete-section">
            <ion-checkbox [checked]="completed" (ionChange)="toggleComplete($event)" labelPlacement="start">
              I have read this passage
            </ion-checkbox>
          </div>

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
                          <ion-spinner name="crescent" class="ai-spinner"></ion-spinner>
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
    .header-title { display: flex; align-items: center; gap: 8px; }
    .header-icon { font-size: 18px; flex-shrink: 0; }
    .reading-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 32px;
    }
    .reading-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .meta-date {
      font-size: 18px;
      font-weight: 700;
      color: var(--ion-text-color);
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
      white-space: pre-line;
      line-height: 1.8;
      padding-left: 12px;
      border-left: 3px solid var(--ion-color-primary);
    }
    .empty-bible-text {
      text-align: center;
      padding: 24px 16px;
      color: var(--ion-color-medium);
    }
    .text-unavailable {
      font-size: 14px;
      color: var(--ion-color-medium);
      font-style: italic;
      margin: 0;
      padding: 4px 0;
    }
    .empty-bible-text p {
      margin: 0 0 12px;
      font-size: 14px;
    }
    .reading-card .reading-text {
      line-height: 1.8;
      white-space: pre-wrap;
    }
    .egw-text {
      font-size: 15px;
      line-height: 1.7;
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
    .para-ref {
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
      color: var(--ion-color-step-400, #999);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .complete-section {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
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
      gap: 8px;
      width: 100%;
      padding: 14px 16px;
      background: transparent;
      border: none;
      font-size: 15px;
      font-weight: 600;
      color: var(--ion-text-color);
      cursor: pointer;
    }
    .journal-toggle ion-note {
      margin-left: auto;
      font-size: 12px;
    }
    .notes-body {
      padding: 0 16px 16px;
    }
    .journal-textarea {
      --background: var(--ion-background-color-step-100, #f0f0f0);
      border-radius: 10px;
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 4px;
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
    .notes-ai {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .ai-spinner {
      width: 16px;
      height: 16px;
    }
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: 64px;
      text-align: center;
      gap: 8px;
    }
    .error-state p {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0;
      max-width: 260px;
      line-height: 1.5;
    }
  `]
})
export class TodayPage {
  private router = inject(Router);
  private loggingService = inject(LoggingService);
  private readingService = inject(ReadingService);
  private progressService = inject(ProgressService);
  private prefs = inject(PreferencesService);
  private alertCtrl = inject(AlertController);
  private destroyRef = inject(DestroyRef);

  loading = false;

  constructor() {
    this.prefs.seriesId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadToday();
    });
  }
  error?: string;
  detail?: ReadingDetail;
  seriesName = '';
  translation: BibleTranslation = 'KJV';
  completed = false;
  notes = '';
  showNotes = false;
  notesSaved = true;
  summarizing = false;
  bibleExpanded = true;
  egwExpanded = true;
  secondaryExpanded = true;
  seeding = false;

  private seriesId = 1;
  private readingId = 0;
  private monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  get bibleSections(): BibleSection[] {
    const text = this.detail?.fullTextBible;
    if (!text) return [];
    const blocks = text.split(/\n{2,}/);
    const result: BibleSection[] = [];
    const verseRefRe = /^(?:[1-3]\s?)?[A-Za-z]+\s*\d+:\d+/;
    for (const block of blocks) {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      if (verseRefRe.test(lines[0])) {
        result.push({ title: lines[0], verses: lines.slice(1) });
      } else {
        if (result.length === 0) {
          result.push({ title: '', verses: lines });
        } else {
          result[result.length - 1].verses.push(...lines);
        }
      }
    }
    return result;
  }

  ionViewWillEnter(): void {
    this.loadToday();
  }

  formatDate(month: number, day: number): string {
    return `${this.monthNames[month - 1] ?? ''} ${day}`;
  }

  getParagraphSegments(text: string | undefined | null): ParaSegment[] {
    if (!text) return [];
    const parts = text.split(/(\[[\d.]+,\s*[\d.]+\])/);
    return parts.map(p => ({
      text: p,
      isRef: /^\[[\d.]+,\s*[\d.]+\]$/.test(p)
    }));
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  async onSeedBible(): Promise<void> {
    this.seeding = true;
    try {
      await firstValueFrom(this.readingService.seedBible());
      await this.loadDetail(this.readingId, this.translation);
    } catch (e: unknown) {
      this.loggingService.error('TodayPage', 'onSeedBible', String(e));
      // ignore
    } finally {
      this.seeding = false;
    }
  }

  toggleComplete(event: CustomEvent): void {
    const checked: boolean = event.detail.checked;
    if (checked) {
      this.progressService.markComplete(this.readingId).subscribe({
        next: () => { this.completed = true; },
        error: () => { this.completed = false; }
      });
    } else {
      this.progressService.unmarkComplete(this.readingId).subscribe({
        next: () => { this.completed = false; },
        error: () => { this.completed = true; }
      });
    }
  }

  onNotesChange(event: CustomEvent): void {
    const val = event.detail.value ?? '';
    this.notes = val;
    this.notesSaved = false;
    const timer = setTimeout(async () => {
      try {
        await firstValueFrom(this.progressService.saveNotes(this.readingId, val));
        this.notesSaved = true;
      } catch (e: unknown) {
        this.loggingService.error('TodayPage', 'onNotesChange', String(e));
        this.notesSaved = false;
      }
    }, 1500);
  }

  async onSummarize(): Promise<void> {
    if (!this.notes) return;
    this.summarizing = true;
    try {
      const result = await firstValueFrom(this.progressService.summarizeNotes(this.readingId, this.notes));
      const alert = await this.alertCtrl.create({
        header: 'AI Summary',
        message: result.summary,
        buttons: [
          { text: 'Dismiss', role: 'cancel' },
          { text: 'Replace Notes', handler: () => this.replaceNotesWithSummary(result.summary) }
        ]
      });
      await alert.present();
    } catch (e: unknown) {
      this.loggingService.error('TodayPage', 'onSummarize', String(e));
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
    try {
      await firstValueFrom(this.progressService.saveNotes(this.readingId, summary));
      this.notesSaved = true;
    } catch (e: unknown) {
      this.loggingService.error('TodayPage', 'replaceNotesWithSummary', String(e));
      this.notesSaved = false;
    }
  }

  private async checkCompleted(): Promise<void> {
    try {
      const allProgress = await firstValueFrom(this.progressService.getSeriesProgress(this.seriesId));
      this.completed = allProgress.some(p => p.readingId === this.readingId && p.isCompleted);
      const readingProgress = allProgress.find(p => p.readingId === this.readingId);
      if (readingProgress?.notes) {
        this.notes = readingProgress.notes;
        this.showNotes = true;
      }
    } catch (e: unknown) {
      this.loggingService.error('TodayPage', 'checkCompleted', String(e));
      this.completed = false;
    }
  }

  private async loadDetail(readingId: number, translation = 'KJV'): Promise<void> {
    try {
      this.detail = await firstValueFrom(this.readingService.getFullReading(readingId, translation));
    } catch (e: unknown) {
      this.loggingService.error('TodayPage', 'loadDetail', String(e));
      this.detail = undefined;
    }
  }

  async loadToday(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.error = undefined;
    try {
      this.seriesId = this.prefs.getSeriesId();
      this.translation = this.prefs.getTranslation();
      const now = new Date();
      const reading = await firstValueFrom(this.readingService.getToday(this.seriesId, now.getMonth() + 1, now.getDate()));
      this.readingId = reading.id;
      this.seriesName = reading.seriesName;
      await this.loadDetail(this.readingId, this.translation);
      await this.checkCompleted();
    } catch (e: unknown) {
      this.loggingService.error('TodayPage', 'loadToday', String(e));
      this.error = 'Failed to load today\'s reading. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }
}

const routes: Routes = [{ path: '', component: TodayPage }];

@NgModule({
  declarations: [TodayPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class TodayModule {}
