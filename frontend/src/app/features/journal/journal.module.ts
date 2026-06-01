import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ProgressService } from '../../core/services/progress.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { JournalEntryDto } from '../../core/models/journal-entry.model';
import { firstValueFrom } from 'rxjs';

@Component({
  template: `
    <ion-header class="print-hide">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today" text=""></ion-back-button>
        </ion-buttons>
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
      <div *ngIf="loading" class="ion-text-center ion-padding">
        <ion-spinner></ion-spinner>
      </div>

      <div *ngIf="error" class="ion-text-center">
        <p class="error-message">{{ error }}</p>
        <ion-button fill="outline" (click)="loadJournal()">Retry</ion-button>
      </div>

      <div *ngIf="!loading && !error && entries.length === 0" class="ion-text-center ion-padding">
        <p>No journal entries yet. Start by marking readings as complete and adding your thoughts.</p>
      </div>

      <div *ngIf="!loading && !error && entries.length > 0">
        <div class="action-buttons print-hide">
          <ion-button fill="outline" (click)="selectAllEntries()">
            <ion-icon name="checkbox-outline" slot="start"></ion-icon>
            All
          </ion-button>
          <ion-button fill="outline" (click)="deselectAllEntries()">
            <ion-icon name="square-outline" slot="start"></ion-icon>
            None
          </ion-button>
          <ion-button fill="outline" (click)="printJournal()">
            <ion-icon name="print-outline" slot="start"></ion-icon>
            Print
          </ion-button>
          <ion-button fill="outline" (click)="shareJournal()" *ngIf="canShare" [disabled]="selectedCount === 0">
            <ion-icon name="share-outline" slot="start"></ion-icon>
            Share{{ selectedCount > 0 ? ' (' + selectedCount + ')' : '' }}
          </ion-button>
        </div>

        <div class="subheader">
          Daily Reading — Series {{ seriesId }} — {{ seriesName }}
        </div>

        <div *ngFor="let entry of entries" class="journal-entry" [class.print-hide]="!isSelected(entry.readingId)">
          <ion-card>
            <div class="journal-entry-header" (click)="toggleEntry(entry.readingId)">
              <ion-checkbox (click)="$event.stopPropagation()" (ionChange)="toggleSelected(entry.readingId)" [checked]="isSelected(entry.readingId)" class="entry-checkbox"></ion-checkbox>
              <div class="header-body">
                <ion-card-title>{{ getMonthName(entry.month) }} {{ entry.day }}</ion-card-title>
                <ion-card-subtitle>{{ entry.bibleReading }} — {{ entry.primaryBookPageRange }}</ion-card-subtitle>
                <ion-badge [color]="entry.isCompleted ? 'success' : 'medium'" class="completion-badge print-hide">
                  {{ entry.isCompleted ? 'Completed' : 'Not Completed' }}
                </ion-badge>
              </div>
              <ion-icon [name]="isExpanded(entry.readingId) ? 'chevron-up' : 'chevron-down'" class="entry-chevron"></ion-icon>
            </div>

            <ion-card-content *ngIf="isExpanded(entry.readingId)">
              <div *ngIf="entry.secondaryBookPageRange" class="secondary-range">
                {{ entry.secondaryBookPageRange }}
              </div>
              <div *ngIf="entry.notes" class="notes-content">{{ entry.notes }}</div>
              <div *ngIf="!entry.notes" class="no-notes">No notes written</div>
              <div *ngIf="entry.notes" class="summarize-actions print-hide">
                <ion-button fill="clear" size="small" [disabled]="summarizingStates.get(entry.readingId)" (click)="onSummarize(entry.readingId, entry.notes!)">
                  <ion-icon slot="start" name="bulb-outline"></ion-icon>
                  {{ summarizingStates.get(entry.readingId) ? 'Summarizing...' : 'AI Summarize' }}
                </ion-button>
                <ion-spinner *ngIf="summarizingStates.get(entry.readingId)" name="dots" size="small"></ion-spinner>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
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
    .journal-entry {
      margin-bottom: 16px;
    }
    .journal-entry-header {
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
    .header-body {
      flex: 1;
      min-width: 0;
    }
    .header-body ion-card-title {
      --color: var(--ion-text-color);
    }
    .entry-chevron {
      font-size: 20px;
      color: var(--ion-color-medium);
      margin-top: 4px;
      flex-shrink: 0;
    }
    .completion-badge {
      margin-top: 8px;
      display: inline-block;
    }
    .secondary-range {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
      font-style: italic;
    }
    .notes-content {
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 15px;
    }
    .no-notes {
      color: var(--ion-color-medium);
      font-style: italic;
      font-size: 14px;
    }
    .summarize-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--ion-color-light);
    }
    @media print {
      ion-header, ion-footer, .print-hide { display: none !important; }
      ion-content { --padding-top: 0; --padding-bottom: 0; }
      .journal-entry { break-inside: avoid; page-break-inside: avoid; margin-bottom: 8px; }
      .journal-entry-header { padding: 8px 12px; }
      ion-card-content { --padding-top: 4px; --padding-bottom: 8px; --padding-start: 12px; --padding-end: 12px; }
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

  selectAllEntries(): void {
    this.selectedEntryIds.clear();
    this.entries.forEach(e => this.selectedEntryIds.add(e.readingId));
    this.selectedCount = this.selectedEntryIds.size;
  }

  deselectAllEntries(): void {
    this.selectedEntryIds.clear();
    this.selectedCount = 0;
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
    setTimeout(() => window.print(), 100);
  }

  async shareJournal(): Promise<void> {
    if (!navigator.share) return;
    const selected = this.entries.filter(e => this.selectedEntryIds.has(e.readingId));
    if (selected.length === 0) return;

    const text = this.buildShareText(selected);
    await navigator.share({
      title: `My Reading Journal — ${this.seriesName}`,
      text,
      url: window.location.href
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
