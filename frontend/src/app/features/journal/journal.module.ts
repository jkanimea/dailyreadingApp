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
          <ion-button fill="outline" (click)="printJournal()">
            <ion-icon name="print-outline" slot="start"></ion-icon>
            Print
          </ion-button>
          <ion-button fill="outline" (click)="shareJournal()" *ngIf="canShare">
            <ion-icon name="share-outline" slot="start"></ion-icon>
            Share
          </ion-button>
        </div>

        <div class="subheader">
          365-Day Reading Journey
        </div>

        <div *ngFor="let entry of entries" class="journal-entry">
          <ion-card>
            <ion-card-header (click)="toggleEntry(entry.readingId)" class="journal-entry-header">
              <ion-card-title>{{ getMonthName(entry.month) }} {{ entry.day }}</ion-card-title>
              <ion-card-subtitle>{{ entry.bibleReading }} — {{ entry.primaryBookPageRange }}</ion-card-subtitle>
              <ion-badge [color]="entry.isCompleted ? 'success' : 'medium'" class="completion-badge">
                {{ entry.isCompleted ? 'Completed' : 'Not Completed' }}
              </ion-badge>
              <ion-icon [name]="isExpanded(entry.readingId) ? 'chevron-up' : 'chevron-down'" slot="end"></ion-icon>
            </ion-card-header>

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
      position: relative;
      cursor: pointer;
    }
    .journal-entry-header ion-icon {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 20px;
      color: var(--ion-color-medium);
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

  entries: JournalEntryDto[] = [];
  seriesName = '';
  loading = false;
  error?: string;
  allExpanded = false;
  canShare = !!navigator.share;
  expandedEntries = new Set<number>();

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

  printJournal(): void {
    this.allExpanded = true;
    setTimeout(() => window.print(), 100);
  }

  async shareJournal(): Promise<void> {
    if (!navigator.share) return;
    await navigator.share({ title: 'My Reading Journal', text: 'My 365-day reading journal' });
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
