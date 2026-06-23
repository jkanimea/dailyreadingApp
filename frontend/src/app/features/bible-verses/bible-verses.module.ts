import { NgModule, Component, OnDestroy, ViewChild, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BibleService } from '../../core/services/bible.service';
import { BibleLookupResponse } from '../../core/models/bible.model';
import { LoggingService } from '../../core/services/logging.service';
import { TtsService } from '../../core/services/tts.service';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>
          <div class="header-title">
            <ion-icon name="book-outline" class="header-icon"></ion-icon>
            <span>Bible Verses</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content #pageContent class="ion-padding">
      @if (loading) {
        <div style="padding: 8px;">
          <div class="skeleton-shimmer" style="width:60%;height:16px;border-radius:8px;margin-bottom:12px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:120px;border-radius:12px;margin-bottom:12px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:80px;border-radius:12px;margin-bottom:12px;"></div>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error }}</p>
        </div>
      }

      @if (result && !loading) {
        <div class="ref-header">{{ result.reference }}</div>

        <!-- Bible verses toggle panel -->
        <div class="section-card">
          <div class="section-header" (click)="toggleSection()">
            <ion-icon [name]="expanded ? 'chevron-up-outline' : 'chevron-down-outline'" class="section-chevron"></ion-icon>
            <span class="section-header-title">Bible Reading</span>
            <ion-icon [name]="readingSection === 'bible-verses' ? 'volume-mute-outline' : 'volume-high-outline'" class="audio-icon" (click)="$event.stopPropagation(); toggleRead()"></ion-icon>
          </div>
          @if (expanded) {
            <div class="section-body">
              @for (g of result.groups; track $index; let gIdx = $index) {
                <div class="verse-card">
                  <div class="verse-ref">{{ g.reference }}</div>
                  @for (v of g.verses; track $index; let vIdx = $index) {
                    <div class="verse-text" [class.active-highlight]="verseFlatIndex[gIdx] !== undefined && verseFlatIndex[gIdx][vIdx] === activeProseGroup">{{ v.verse }} {{ v.text }}</div>
                  }
                </div>
              }

              @if (result.groups.length === 0) {
                <div class="error-state">
                  <ion-icon name="alert-circle-outline" size="large" color="medium"></ion-icon>
                  <p>No verses found for this reference.</p>
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
    .ref-header {
      font-size: 15px;
      font-weight: 700;
      color: var(--ion-color-primary);
      padding: 16px 0 12px;
      border-bottom: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
      margin-bottom: 16px;
    }
    .section-card {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
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
    .section-header-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    .verse-card {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 10px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
    }
    .verse-ref {
      font-size: 12px;
      font-weight: 700;
      color: var(--ion-color-primary);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .verse-text {
      font-size: var(--reading-font-size, 15px);
      line-height: 1.7;
      color: var(--ion-text-color);
    }
    .verse-text + .verse-text {
      margin-top: 8px;
    }
    .active-highlight {
      background: var(--active-highlight-bg, rgba(var(--ion-color-primary-rgb), 0.12));
      border-radius: 6px;
      animation: readingPop 0.35s ease-out;
    }
    @keyframes readingPop {
      0% { background-color: rgba(var(--ion-color-primary-rgb), 0.45); transform: scale(1.03); }
      70% { transform: scale(1.01); }
      100% { background-color: var(--active-highlight-bg, rgba(var(--ion-color-primary-rgb), 0.12)); transform: scale(1); }
    }
  `]
})
export class BibleVersesPage implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bibleService = inject(BibleService);
  private loggingService = inject(LoggingService);
  private ttsService = inject(TtsService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  result?: BibleLookupResponse;
  loading = false;
  error?: string;
  expanded = true;
  readingSection: string | null = null;
  activeProseGroup: number | null = null;
  verseFlatIndex: number[][] = [];
  @ViewChild('pageContent', { static: false }) content?: any;
  private ttsStateSub?: Subscription;

  private scrollToActiveHighlight(): void {
    if (!this.content) return;
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => {
      setTimeout(async () => {
        try {
          const scrollEl = await this.content.getScrollElement();
          const targetEl = scrollEl.querySelector('.active-highlight') as HTMLElement | null;
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch {
          /* ignore */
        }
      }, 100);
    });
  }

  async ionViewWillEnter(): Promise<void> {
    const refs = this.route.snapshot.queryParamMap.get('refs');
    if (!refs) {
      this.error = 'No Bible reference provided.';
      return;
    }
    await this.loadVerses(decodeURIComponent(refs));
    this.ttsStateSub = this.ttsService.state$.subscribe(state => {
      if (state === 'idle') {
        this.readingSection = null;
        this.activeProseGroup = null;
      }
    });
  }

  ionViewWillLeave(): void {
    this.ttsService.stop();
    this.readingSection = null;
    this.activeProseGroup = null;
    this.verseFlatIndex = [];
  }

  ngOnDestroy(): void {
    this.ttsStateSub?.unsubscribe();
    this.ttsService.stop();
  }

  toggleSection(): void {
    const wasExpanded = this.expanded;
    this.expanded = !this.expanded;
    if (wasExpanded && this.readingSection === 'bible-verses') {
      this.ttsService.stop();
      this.readingSection = null;
    }
  }

  toggleRead(): void {
    if (this.readingSection === 'bible-verses') {
      this.ttsService.stop();
      this.readingSection = null;
      this.activeProseGroup = null;
      return;
    }
    this.ttsService.stop();
    this.expanded = true;
    this.activeProseGroup = null;
    this.readingSection = 'bible-verses';

    const { groups, flatIndex } = this.buildVerseGroups();
    this.verseFlatIndex = flatIndex;
    if (groups.length > 0) {
      this.ttsService.speakSegments(groups, (i) => {
        this.activeProseGroup = i;
        this.scrollToActiveHighlight();
      });
    } else {
      this.readingSection = null;
    }
  }

  private buildVerseGroups(): { groups: string[]; flatIndex: number[][] } {
    if (!this.result) return { groups: [], flatIndex: [] };
    const groups: string[] = [];
    const flatIndex: number[][] = [];
    let counter = 0;
    for (const g of this.result.groups) {
      const groupIndices: number[] = [];
      for (const v of g.verses) {
        groups.push(`${v.verse} ${v.text}`);
        groupIndices.push(counter++);
      }
      flatIndex.push(groupIndices);
    }
    return { groups, flatIndex };
  }

  private async loadVerses(refs: string): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      this.result = await firstValueFrom(this.bibleService.lookupVerses(refs));
    } catch (e: unknown) {
      this.loggingService.error('BibleVersesPage', 'loadVerses', e instanceof Error ? e.message : String(e));
      this.error = 'Failed to load Bible verses. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }
}

const routes: Routes = [{ path: '', component: BibleVersesPage }];

@NgModule({
  declarations: [BibleVersesPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class BibleVersesModule {}
