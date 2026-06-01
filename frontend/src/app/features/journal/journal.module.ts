import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ProgressService } from '../../core/services/progress.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { JournalEntryDto } from '../../core/models/journal-entry.model';
import { firstValueFrom } from 'rxjs';
import { ToastController } from '@ionic/angular';

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
          <ion-button fill="outline" (click)="shareToFacebook()" [disabled]="selectedCount === 0">
            <ion-icon name="logo-facebook" slot="start"></ion-icon>
            Facebook
          </ion-button>
        </div>

        <div class="subheader">
          365-Day Reading Journey
        </div>

        <div *ngFor="let entry of entries" class="journal-entry">
          <ion-card>
            <div class="journal-entry-header">
              <ion-checkbox (ionChange)="toggleSelected(entry.readingId); $event.stopPropagation()" [checked]="isSelected(entry.readingId)" class="entry-checkbox"></ion-checkbox>
              <div class="header-body" (click)="toggleEntry(entry.readingId)">
                <ion-card-title>{{ getMonthName(entry.month) }} {{ entry.day }}</ion-card-title>
                <ion-card-subtitle>{{ entry.bibleReading }} — {{ entry.primaryBookPageRange }}</ion-card-subtitle>
                <ion-badge [color]="entry.isCompleted ? 'success' : 'medium'" class="completion-badge">
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
    @media print {
      ion-header, ion-footer, .print-hide { display: none !important; }
      ion-content { --padding-top: 0; --padding-bottom: 0; }
      .journal-entry { break-inside: avoid; page-break-inside: avoid; }
    }
  `]
})
class JournalPage {
  private router = inject(Router);
  private progressService = inject(ProgressService);
  private prefs = inject(PreferencesService);
  private toastCtrl = inject(ToastController);

  entries: JournalEntryDto[] = [];
  seriesName = '';
  loading = false;
  error?: string;
  allExpanded = false;
  canShare = !!navigator.share;
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
      const seriesId = this.prefs.getSeriesId();
      this.entries = await firstValueFrom(this.progressService.getJournal(seriesId));
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

  async shareToFacebook(): Promise<void> {
    const selected = this.entries.filter(e => this.selectedEntryIds.has(e.readingId));
    if (selected.length === 0) return;

    const text = this.buildShareText(selected);
    try {
      await navigator.clipboard.writeText(text);
      const toast = await this.toastCtrl.create({
        message: 'Journal text copied! Paste into your Facebook post.',
        duration: 4000,
        position: 'bottom'
      });
      await toast.present();
    } catch {
      // clipboard not available; open Facebook anyway
    }
    window.open('https://www.facebook.com', '_blank');
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
