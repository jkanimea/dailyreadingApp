import { NgModule, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReadingService } from '../../core/services/reading.service';
import { ProgressService } from '../../core/services/progress.service';
import { PreferencesService, BibleTranslation } from '../../core/services/preferences.service';
import { LoggingService } from '../../core/services/logging.service';
import { ReadingDetail } from '../../core/models/reading.model';
import { shiftReadingDate } from '../../core/reading-nav';
import { SharedModule } from '../../shared/shared.module';
import { firstValueFrom } from 'rxjs';
import { TtsService } from '../../core/services/tts.service';
import { createBibleRefRegex } from '../../core/bible-refs';

interface ParaSegment {
  text: string;
  isRef: boolean;
  isBibleRef: boolean;
}

const bibleRefRe = createBibleRefRegex();

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
            <span>Today</span>
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
    <ion-content #pageContent class="ion-padding">
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
            <div class="meta-primary">
              <button class="nav-arrow" (click)="goToPreviousReading()" [disabled]="!previousReadingId" aria-label="Previous reading">
                <ion-icon name="chevron-back"></ion-icon>
              </button>
              <span class="meta-date">{{ formatDate(detail.month, detail.day) }}</span>
              <span class="meta-sep">·</span>
              <span class="meta-series">{{ seriesName }}</span>
              <button class="nav-arrow" (click)="goToNextReading()" [disabled]="!nextReadingId" aria-label="Next reading">
                <ion-icon name="chevron-forward"></ion-icon>
              </button>
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
              <div class="section-header" (click)="toggleSection('bible')">
                <ion-icon [name]="bibleExpanded ? 'chevron-up-outline' : 'chevron-down-outline'" class="section-chevron"></ion-icon>
                <span class="section-header-title">Bible Reading</span>
                <ion-icon [name]="readingSection === 'bible' ? 'volume-mute-outline' : 'volume-high-outline'" class="audio-icon" (click)="$event.stopPropagation(); toggleRead('bible')"></ion-icon>
              </div>
              @if (bibleExpanded) {
                <div class="section-body">
                  @if (bibleSections.length > 0) {
                    @for (section of bibleSections; track section.title) {
                      <div class="bible-section-title">{{ section.title }}</div>
                      <div class="bible-text">
                        @for (verseBlock of section.verses; track $index; let vi = $index) {
                          <span [class.active-highlight]="bibleSegmentToGroup && bibleSegmentToGroup[getBibleVerseIndex(section.title, vi)] === activeProseGroup">{{ verseBlock }}</span>
                        }
                      </div>
                    }
                  } @else {
                    @if (detail.fullTextBible) {
                      <div class="bible-text">
                        @for (seg of [detail.fullTextBible]; track $index) {
                          <span [class.active-highlight]="bibleSegmentToGroup && bibleSegmentToGroup[0] === activeProseGroup">{{ seg }}</span>
                        }
                      </div>
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
            <div class="section-header" (click)="toggleSection('primary')">
              <ion-icon [name]="egwExpanded ? 'chevron-up-outline' : 'chevron-down-outline'" class="section-chevron"></ion-icon>
              <span class="egw-heading">{{ detail.primaryBookPageRange }}</span>
              <ion-icon [name]="readingSection === 'primary' ? 'volume-mute-outline' : 'volume-high-outline'" class="audio-icon" (click)="$event.stopPropagation(); toggleRead('primary')"></ion-icon>
            </div>
            @if (egwExpanded) {
              <div class="section-body">
                @if (detail.fullTextPrimary) {
                  <div class="bible-text">
                    @for (seg of getParagraphSegments(detail.fullTextPrimary); track $index) {
                      @if (seg.isRef) {
                        <span class="para-ref">{{ seg.text }}</span>
                      } @else if (seg.isBibleRef) {
                        <span class="bible-ref" [class.active-highlight]="segmentToGroup && segmentToGroup[$index] === activeProseGroup" (click)="onBibleRefClick(seg.text)">{{ seg.text }}</span>
                      } @else {
                        <span [class.active-highlight]="segmentToGroup && segmentToGroup[$index] === activeProseGroup">{{ seg.text }}</span>
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
                <div class="section-header" (click)="toggleSection('secondary')">
                  <ion-icon [name]="secondaryExpanded ? 'chevron-up-outline' : 'chevron-down-outline'" class="section-chevron"></ion-icon>
                  <span class="companion-heading">Companion: {{ detail.secondaryBookPageRange }}</span>
                  <ion-icon [name]="readingSection === 'secondary' ? 'volume-mute-outline' : 'volume-high-outline'" class="audio-icon" (click)="$event.stopPropagation(); toggleRead('secondary')"></ion-icon>
                </div>
                @if (secondaryExpanded) {
                  <div class="section-body">
                    <div class="reading-text">
                      @for (seg of getParagraphSegments(detail.fullTextSecondary); track $index) {
                        <span class="egw-text">
                          @if (seg.isRef) {
                            <span class="para-ref">{{ seg.text }}</span>
                          } @else if (seg.isBibleRef) {
                            <span class="bible-ref" [class.active-highlight]="segmentToGroup && segmentToGroup[$index] === activeProseGroup" (click)="onBibleRefClick(seg.text)">{{ seg.text }}</span>
                          } @else {
                            <span [class.active-highlight]="segmentToGroup && segmentToGroup[$index] === activeProseGroup">{{ seg.text }}</span>
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
              <button class="journal-toggle" (click)="toggleNotes()">
                <ion-icon [name]="showNotes ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                <span>My Journal Notes</span>
                @if (notes && !showNotes) {
                  <ion-note slot="end">Has notes</ion-note>
                }
                @if (notes) {
                  <ion-icon [name]="readingSection === 'notes' ? 'volume-mute-outline' : 'volume-high-outline'" class="audio-icon" (click)="$event.stopPropagation(); toggleRead('notes')"></ion-icon>
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
    .meta-primary {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .meta-series {
      font-size: 15px;
      font-weight: 600;
      color: var(--ion-color-medium);
    }
    .meta-sep {
      font-size: 15px;
      color: var(--ion-color-step-300, #ccc);
    }
    .meta-date {
      font-size: 15px;
      font-weight: 600;
      color: var(--ion-color-medium);
    }
    .nav-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--ion-color-primary);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s ease, opacity 0.15s ease;
    }
    .nav-arrow ion-icon {
      font-size: 20px;
    }
    .nav-arrow:not(:disabled):hover {
      background: var(--ion-color-step-100, #eee);
    }
    .nav-arrow:not(:disabled):active {
      background: var(--ion-color-step-150, #ddd);
    }
    .nav-arrow:disabled {
      color: var(--ion-color-step-400, #bbb);
      cursor: default;
    }
    .translation-segment {
      margin-bottom: 12px;
      --background: var(--ion-color-step-50, #f0f0f0);
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
      font-size: var(--reading-font-size);
      white-space: pre-line;
      line-height: 1.8;
      padding-left: 12px;
      border-left: 3px solid var(--ion-color-primary);
    }
    .bible-section-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--ion-color-primary);
      margin: 12px 0 4px;
    }
    .bible-section-title:first-child {
      margin-top: 0;
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
      font-size: var(--reading-font-size);
      line-height: 1.7;
    }
    .bible-ref {
      color: var(--ion-color-primary);
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 2px;
    }
    .bible-ref:hover {
      color: var(--ion-color-primary-shade);
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
    .audio-icon {
      margin-left: auto;
      font-size: 20px;
      cursor: pointer;
      color: var(--ion-color-primary);
      flex-shrink: 0;
      padding: 4px;
    }
    @media print {
      .audio-icon { display: none; }
    }
    .section-body {
      margin-top: 12px;
    }
    .section-header-title,
    .egw-heading {
      font-size: 14px;
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
      font-size: 14px;
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
    .active-highlight {
      background: var(--active-highlight-bg, rgba(var(--ion-color-primary-rgb), 0.12));
      border-radius: 3px;
      animation: readingPop 0.35s ease-out;
    }
    @keyframes readingPop {
      0% { background-color: rgba(var(--ion-color-primary-rgb), 0.45); transform: scale(1.03); }
      70% { transform: scale(1.01); }
      100% { background-color: var(--active-highlight-bg, rgba(var(--ion-color-primary-rgb), 0.12)); transform: scale(1); }
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
  private ttsService = inject(TtsService);
  private cdr = inject(ChangeDetectorRef);
  private elementRef = inject(ElementRef);
  loading = false;

  constructor() {
    this.prefs.seriesId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadToday();
    });
    this.ttsService.state$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(state => {
      if (state === 'idle') {
        this.readingSection = null;
        this.activeProseGroup = null;
        this.segmentToGroup = null;
        this.bibleSegmentToGroup = null;
      }
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
  readingSection: string | null = null;
  activeProseGroup: number | null = null;
  segmentToGroup: (number | null)[] | null = null;
  bibleSegmentToGroup: (number | null)[] | null = null;

  private seriesId = 1;
  private readingId = 0;
  previousReadingId?: number;
  nextReadingId?: number;
  private monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  @ViewChild('pageContent', { static: false }) content?: any;

  private scrollToActiveHighlight(): void {
    if (!this.content) return;
    this.cdr.detectChanges();
    requestAnimationFrame(async () => {
      try {
        const scrollEl = await this.content.getScrollElement();
        let targetEl: HTMLElement | null = null;
        if (this.readingSection === 'primary' || this.readingSection === 'secondary' || this.readingSection === 'bible') {
          targetEl = this.elementRef.nativeElement.querySelector('.active-highlight') as HTMLElement | null;
        } else if (this.readingSection === 'notes') {
          targetEl = this.elementRef.nativeElement.querySelector('.journal-section') as HTMLElement | null;
        }
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          const contentRect = scrollEl.getBoundingClientRect();
          const offsetY = rect.top - contentRect.top + scrollEl.scrollTop - contentRect.height * 0.35;
          await this.content.scrollToPoint(0, Math.max(0, offsetY), 200);
        }
      } catch {
        /* ignore */
      }
    });
  }

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

  ionViewWillLeave(): void {
    this.ttsService.stop();
    this.readingSection = null;
    this.activeProseGroup = null;
    this.segmentToGroup = null;
    this.bibleSegmentToGroup = null;
  }

  formatDate(month: number, day: number): string {
    return `${this.monthNames[month - 1] ?? ''} ${day}`;
  }

  getParagraphSegments(text: string | undefined | null): ParaSegment[] {
    if (!text) return [];
    const segments: ParaSegment[] = [];
    const egwParts = text.split(/(\[[\d.]+(?:,\s*[\d.]+)?\])/);
    for (const part of egwParts) {
      if (/^\[[\d.]+(?:,\s*[\d.]+)?\]$/.test(part)) {
        segments.push({ text: part, isRef: true, isBibleRef: false });
      } else {
        bibleRefRe.lastIndex = 0;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = bibleRefRe.exec(part)) !== null) {
          if (match.index > lastIndex) {
            segments.push({ text: part.slice(lastIndex, match.index), isRef: false, isBibleRef: false });
          }
          segments.push({ text: match[0], isRef: false, isBibleRef: true });
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < part.length) {
          segments.push({ text: part.slice(lastIndex), isRef: false, isBibleRef: false });
        }
      }
    }
    return segments;
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  goToPreviousReading(): void {
    if (this.previousReadingId) {
      this.router.navigate(['/reading', this.previousReadingId]);
    }
  }

  goToNextReading(): void {
    if (this.nextReadingId) {
      this.router.navigate(['/reading', this.nextReadingId]);
    }
  }

  onBibleRefClick(refs: string): void {
    this.router.navigate(['/bible-verses'], { queryParams: { refs: encodeURIComponent(refs) } });
  }

  toggleSection(section: 'bible' | 'primary' | 'secondary' | 'notes'): void {
    let wasExpanded: boolean;
    if (section === 'bible') {
      wasExpanded = this.bibleExpanded;
      this.bibleExpanded = !this.bibleExpanded;
    } else if (section === 'primary') {
      wasExpanded = this.egwExpanded;
      this.egwExpanded = !this.egwExpanded;
    } else {
      wasExpanded = this.secondaryExpanded;
      this.secondaryExpanded = !this.secondaryExpanded;
    }
    if (wasExpanded && this.readingSection === section) {
      this.ttsService.stop();
      this.readingSection = null;
      this.activeProseGroup = null;
      this.segmentToGroup = null;
      this.bibleSegmentToGroup = null;
    }
  }

  toggleNotes(): void {
    const wasExpanded = this.showNotes;
    this.showNotes = !this.showNotes;
    if (wasExpanded && this.readingSection === 'notes') {
      this.ttsService.stop();
      this.readingSection = null;
      this.activeProseGroup = null;
      this.segmentToGroup = null;
      this.bibleSegmentToGroup = null;
    }
  }

  toggleRead(section: 'bible' | 'primary' | 'secondary' | 'notes'): void {
    if (this.readingSection === section) {
      this.ttsService.stop();
      this.readingSection = null;
      this.activeProseGroup = null;
      this.segmentToGroup = null;
      this.bibleSegmentToGroup = null;
      return;
    }
    this.ttsService.stop();
    this.activeProseGroup = null;
    this.segmentToGroup = null;
    this.bibleSegmentToGroup = null;
    if (section === 'bible') { this.bibleExpanded = true; }
    else if (section === 'primary') { this.egwExpanded = true; }
    else if (section === 'secondary') { this.secondaryExpanded = true; }
    else if (section === 'notes') { this.showNotes = true; }
    this.readingSection = section;

    if (section === 'primary') {
      const segments = this.getParagraphSegments(this.detail?.fullTextPrimary);
      const { groups, segmentToGroup } = this.buildParagraphGroups(segments);
      this.segmentToGroup = segmentToGroup;
      if (groups.length > 0) {
        this.ttsService.speakSegments(groups, (i) => {
          this.activeProseGroup = i;
          this.scrollToActiveHighlight();
        });
      } else {
        this.readingSection = null;
      }
      return;
    }

    if (section === 'secondary') {
      const segments = this.getParagraphSegments(this.detail?.fullTextSecondary);
      const { groups, segmentToGroup } = this.buildParagraphGroups(segments);
      this.segmentToGroup = segmentToGroup;
      if (groups.length > 0) {
        this.ttsService.speakSegments(groups, (i) => {
          this.activeProseGroup = i;
          this.scrollToActiveHighlight();
        });
      } else {
        this.readingSection = null;
      }
      return;
    }

    let text = '';
    if (section === 'bible') {
      const bibleText = this.detail?.fullTextBible ?? '';
      if (bibleText) {
        const { groups, segmentToGroup } = this.buildBibleGroups();
        this.bibleSegmentToGroup = segmentToGroup;
        if (groups.length > 0) {
          this.ttsService.speakSegments(groups, (i) => {
            this.activeProseGroup = i;
            this.scrollToActiveHighlight();
          });
        } else {
          this.readingSection = null;
        }
      } else {
        this.readingSection = null;
      }
      return;
    } else if (section === 'notes') {
      text = this.notes ?? '';
    }

    if (text) {
      this.ttsService.speak(text);
      this.scrollToActiveHighlight();
    } else {
      this.readingSection = null;
    }
  }

  private getPlainText(text: string | undefined | null): string {
    if (!text) return '';
    const segments = this.getParagraphSegments(text);
    return segments
      .filter(s => !s.isRef && !s.isBibleRef)
      .map(s => s.text)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildParagraphGroups(segments: ParaSegment[]): { groups: string[]; segmentToGroup: (number | null)[] } {
    const groups: string[] = [];
    const segmentToGroup: (number | null)[] = [];

    for (const seg of segments) {
      if (seg.isRef) {
        segmentToGroup.push(null);
      } else if (seg.isBibleRef) {
        segmentToGroup.push(groups.length > 0 ? groups.length - 1 : null);
      } else {
        const trimmed = seg.text.replace(/\s+/g, ' ').trim();
        if (trimmed) {
          groups.push(trimmed);
          segmentToGroup.push(groups.length - 1);
        } else {
          segmentToGroup.push(null);
        }
      }
    }

    return { groups, segmentToGroup };
  }

  buildBibleGroups(): { groups: string[]; segmentToGroup: (number | null)[] } {
    const text = this.detail?.fullTextBible;
    const groups: string[] = [];
    const segmentToGroup: (number | null)[] = [];

    if (!text) return { groups, segmentToGroup };

    const sections = this.bibleSections;
    if (sections.length > 0) {
      for (const section of sections) {
        for (const verseBlock of section.verses) {
          const trimmed = verseBlock.replace(/\s+/g, ' ').trim();
          if (trimmed) {
            groups.push(trimmed);
            segmentToGroup.push(groups.length - 1);
          } else {
            segmentToGroup.push(null);
          }
        }
      }
    } else {
      const trimmed = text.replace(/\s+/g, ' ').trim();
      if (trimmed) {
        groups.push(trimmed);
        segmentToGroup.push(0);
      }
    }

    return { groups, segmentToGroup };
  }

  getBibleVerseIndex(sectionTitle: string, verseIndex: number): number {
    let idx = 0;
    for (const s of this.bibleSections) {
      if (s.title === sectionTitle) {
        return idx + verseIndex;
      }
      idx += s.verses.length;
    }
    return -1;
  }

  async onBibleTranslationChange(event: CustomEvent): Promise<void> {
    const t = event.detail.value as BibleTranslation;
    this.translation = t;
    await this.prefs.setTranslation(t);
    await this.loadDetail(this.readingId, t);
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
      await this.loadNavigation();
    } catch (e: unknown) {
      this.loggingService.error('TodayPage', 'loadToday', String(e));
      this.error = 'Failed to load today\'s reading. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }

  private async loadNavigation(): Promise<void> {
    const detail = this.detail;
    if (!detail?.seriesId) {
      this.previousReadingId = undefined;
      this.nextReadingId = undefined;
      return;
    }
    const isStart = detail.month === 1 && detail.day === 1;
    const isEnd = detail.month === 12 && detail.day === 31;
    const prev = shiftReadingDate(detail.month, detail.day, -1);
    const next = shiftReadingDate(detail.month, detail.day, 1);
    this.previousReadingId = isStart
      ? undefined
      : await this.resolveNeighborId(detail.seriesId, prev.month, prev.day);
    this.nextReadingId = isEnd
      ? undefined
      : await this.resolveNeighborId(detail.seriesId, next.month, next.day);
  }

  private async resolveNeighborId(seriesId: number, month: number, day: number): Promise<number | undefined> {
    try {
      const reading = await firstValueFrom(this.readingService.getToday(seriesId, month, day));
      return reading?.id;
    } catch (e: unknown) {
      this.loggingService.warn('TodayPage', `No reading at ${month}/${day}: ${String(e)}`);
      return undefined;
    }
  }
}

const routes: Routes = [{ path: '', component: TodayPage }];

@NgModule({
  declarations: [TodayPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class TodayModule {}
