import { NgModule, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ProgressService } from '../../core/services/progress.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { JournalEntryDto } from '../../core/models/journal-entry.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-journal',
  template: `
    <ion-header class="print-hide">
      <ion-toolbar>
        <ion-title>My Reading Journal — {{ seriesName }}</ion-title>
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
        <div style="padding: 8px;">
          <div class="skeleton-shimmer" style="width:100%;height:140px;border-radius:14px;margin-bottom:14px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:140px;border-radius:14px;margin-bottom:14px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:140px;border-radius:14px;"></div>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error }}</p>
          <ion-button fill="outline" size="small" (click)="loadJournal()" class="ion-margin-top">
            <ion-icon slot="start" name="refresh-outline"></ion-icon>
            Retry
          </ion-button>
        </div>
      }

      @if (!loading && !error && entries.length === 0) {
        <div class="empty-state">
          <ion-icon name="journal-outline" size="large" color="medium"></ion-icon>
          <p class="empty-title">No journal entries</p>
          <p class="empty-subtitle">Start by marking readings as complete and adding your thoughts.</p>
        </div>
      }

      @if (!loading && !error && entries.length > 0) {
        <div class="action-buttons print-hide">
          <ion-button fill="outline" (click)="toggleSelectAll()">
            <ion-icon [name]="allSelected ? 'checkbox-outline' : 'square-outline'" slot="start"></ion-icon>
            {{ allSelected ? 'Deselect All' : 'Select All' }}
          </ion-button>
          <ion-button fill="outline" (click)="printJournal()">
            <ion-icon name="print-outline" slot="start"></ion-icon>
            Print
          </ion-button>
          @if (canShare) {
            <ion-button fill="outline" (click)="shareJournal()" [disabled]="selectedCount === 0">
              <ion-icon name="share-outline" slot="start"></ion-icon>
              Share{{ selectedCount > 0 ? ' (' + selectedCount + ')' : '' }}
            </ion-button>
          }
        </div>

        <div class="subheader">
          Daily Reading — Series {{ seriesId }} — {{ seriesName }}
        </div>

        @for (entry of entries; track $index) {
          <div class="journal-card" [class.print-hide]="!isSelected(entry.readingId)">
            <div class="journal-card-header" (click)="toggleEntry(entry.readingId)">
              <ion-checkbox (click)="$event.stopPropagation()" (ionChange)="toggleSelected(entry.readingId)" [checked]="isSelected(entry.readingId)" class="entry-checkbox"></ion-checkbox>
              <div class="journal-card-body">
                <div class="journal-title-row">
                  <span class="journal-date">{{ getMonthName(entry.month) }} {{ entry.day }}</span>
                  <ion-badge [color]="entry.isCompleted ? 'success' : 'medium'" class="journal-badge print-hide">
                    {{ entry.isCompleted ? 'Completed' : 'Not Completed' }}
                  </ion-badge>
                </div>
                <span class="journal-subtitle">{{ entry.bibleReading }} — {{ entry.primaryBookPageRange }}</span>
              </div>
              <ion-icon [name]="isExpanded(entry.readingId) ? 'chevron-up' : 'chevron-down'" class="journal-chevron"></ion-icon>
            </div>

            @if (isExpanded(entry.readingId)) {
              <div class="journal-card-body-content">
                @if (entry.secondaryBookPageRange) {
                  <div class="journal-secondary">
                    {{ entry.secondaryBookPageRange }}
                  </div>
                }
                @if (entry.notes) {
                  <div class="journal-notes">{{ entry.notes }}</div>
                } @else {
                  <div class="journal-no-notes">No notes written</div>
                }
                @if (entry.notes) {
                  <div class="journal-actions print-hide">
                    <ion-button fill="clear" size="small" [disabled]="summarizingStates.get(entry.readingId)" (click)="onSummarize(entry.readingId, entry.notes!)">
                      <ion-icon slot="start" name="bulb-outline"></ion-icon>
                      {{ summarizingStates.get(entry.readingId) ? 'Summarizing...' : 'AI Summarize' }}
                    </ion-button>
                    @if (summarizingStates.get(entry.readingId)) {
                      <ion-spinner name="dots" size="small"></ion-spinner>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .error-message { color: var(--ion-color-danger); }
    .subheader {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin-bottom: 16px;
      font-weight: 500;
    }
    .action-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .journal-card {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      margin-bottom: 14px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
    }
    .journal-card-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      padding: 16px;
    }
    .entry-checkbox {
      margin-top: 2px;
      --size: 20px;
    }
    .journal-card-body {
      flex: 1;
      min-width: 0;
    }
    .journal-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 2px;
    }
    .journal-date {
      font-size: 16px;
      font-weight: 700;
      color: var(--ion-text-color);
    }
    .journal-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .journal-subtitle {
      font-size: 13px;
      color: var(--ion-color-primary);
      display: block;
    }
    .journal-chevron {
      font-size: 20px;
      color: var(--ion-color-step-400, #bbb);
      margin-top: 4px;
      flex-shrink: 0;
    }
    .journal-card-body-content {
      padding: 0 16px 16px;
    }
    .journal-secondary {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
      font-style: italic;
    }
    .journal-notes {
      white-space: pre-wrap;
      line-height: 1.7;
      font-size: 15px;
      color: var(--ion-text-color, #000);
      background: var(--ion-background-color-step-100, #f0f0f0);
      border-radius: 10px;
      padding: 12px;
      margin-top: 4px;
    }
    .journal-no-notes {
      color: var(--ion-color-medium);
      font-style: italic;
      font-size: 14px;
      padding: 4px 0;
    }
    .journal-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--ion-color-step-100, #eee);
    }
    @media print {
      ion-header, ion-footer, .print-hide { display: none !important; }
      ion-content { --padding-top: 0; --padding-bottom: 0; }
      .journal-card { break-inside: avoid; page-break-inside: avoid; margin-bottom: 8px; }
      .journal-card-header { padding: 8px 12px; }
      .journal-card-body-content { padding: 4px 12px 8px; }
    }
  `]
})
class JournalPage {
  private router = inject(Router);
  private progressService = inject(ProgressService);
  private prefs = inject(PreferencesService);
  private alertCtrl = inject(AlertController);

  entries: JournalEntryDto[] = [];
  seriesName = '';
  seriesId = 0;
  loading = false;
  error?: string;
  allExpanded = false;
  allSelected = true;
  canShare = !!navigator.share;
  summarizingStates = new Map<number, boolean>();
  expandedEntries = new Set<number>();
  selectedEntryIds = new Set<number>();
  selectedCount = 0;

  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  async ionViewWillEnter(): Promise<void> {
    await this.loadJournal();
  }

  async loadJournal(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      this.seriesId = this.prefs.getSeriesId();
      this.entries = await firstValueFrom(this.progressService.getJournal(this.seriesId));
      this.seriesName = this.entries.length > 0 ? this.entries[0].seriesName : 'Reading';
      this.selectAllEntries();
    } catch {
      this.error = 'Failed to load journal. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }

  getMonthName(month: number): string {
    return this.monthNames[month - 1] || '';
  }

  isExpanded(readingId: number): boolean {
    return this.allExpanded || this.expandedEntries.has(readingId);
  }

  toggleEntry(readingId: number): void {
    if (this.expandedEntries.has(readingId)) {
      this.expandedEntries.delete(readingId);
    } else {
      this.expandedEntries.add(readingId);
    }
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedEntryIds.clear();
      this.selectedCount = 0;
      this.allSelected = false;
    } else {
      this.selectAllEntries();
    }
  }

  selectAllEntries(): void {
    this.selectedEntryIds.clear();
    this.entries.forEach(e => this.selectedEntryIds.add(e.readingId));
    this.selectedCount = this.selectedEntryIds.size;
    this.allSelected = true;
  }

  deselectAllEntries(): void {
    this.selectedEntryIds.clear();
    this.selectedCount = 0;
    this.allSelected = false;
  }

  isSelected(readingId: number): boolean {
    return this.selectedEntryIds.has(readingId);
  }

  toggleSelected(readingId: number): void {
    if (this.selectedEntryIds.has(readingId)) {
      this.selectedEntryIds.delete(readingId);
    } else {
      this.selectedEntryIds.add(readingId);
    }
    this.selectedCount = this.selectedEntryIds.size;
  }

  printJournal(): void {
    this.allExpanded = true;
    if (this.selectedCount > 0) {
      this.expandedEntries = new Set(this.selectedEntryIds);
    }
    window.addEventListener('afterprint', () => { this.allExpanded = false; }, { once: true });
    setTimeout(() => window.print(), 100);
  }

  async shareJournal(): Promise<void> {
    if (!navigator.share) return;
    const selected = this.entries.filter(e => this.selectedEntryIds.has(e.readingId));
    if (selected.length === 0) return;

    const text = this.buildShareText(selected);
    await navigator.share({
      title: `My Reading Journal — ${this.seriesName}`,
      text
    });
  }

  private buildShareText(selected: JournalEntryDto[]): string {
    const lines: string[] = [`My Reading Journal — ${this.seriesName}`, ''];
    for (const entry of selected) {
      const date = `${this.getMonthName(entry.month)} ${entry.day}`;
      lines.push(`${date} — ${entry.bibleReading}`);
      lines.push(`${entry.primaryBookPageRange}`);
      if (entry.secondaryBookPageRange) {
        lines.push(entry.secondaryBookPageRange);
      }
      if (entry.notes) {
        lines.push(`Notes: ${entry.notes}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  async onSummarize(readingId: number, notes: string): Promise<void> {
    this.summarizingStates.set(readingId, true);
    try {
      const result = await firstValueFrom(this.progressService.summarizeNotes(readingId, notes));
      const alert = await this.alertCtrl.create({
        header: 'AI Summary',
        message: result.summary,
        buttons: [
          { text: 'Dismiss', role: 'cancel' },
          {
            text: 'Replace Notes',
            handler: () => this.replaceNotesWithSummary(readingId, result.summary)
          }
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
      this.summarizingStates.set(readingId, false);
    }
  }

  private async replaceNotesWithSummary(readingId: number, summary: string): Promise<void> {
    const entry = this.entries.find(e => e.readingId === readingId);
    if (!entry) return;
    entry.notes = summary;
    try {
      await firstValueFrom(this.progressService.saveNotes(readingId, summary));
    } catch {
    }
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }
}

const routes: Routes = [{ path: '', component: JournalPage }];

@NgModule({
  declarations: [JournalPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class JournalModule {}
