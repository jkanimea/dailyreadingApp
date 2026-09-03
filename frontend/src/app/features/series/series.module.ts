import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { SeriesService } from '../../core/services/series.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { Series } from '../../core/models/series.model';
import { LoggingService } from '../../core/services/logging.service';
import { firstValueFrom } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';
import { ProgressService } from '../../core/services/progress.service';
import { AuthService } from '../../core/services/auth.service';
import { SyncService } from '../../core/services/sync.service';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/login" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Select a Series</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading) {
        <div style="padding: 8px;">
          <div class="skeleton-shimmer" style="width:100%;height:120px;border-radius:14px;margin-bottom:16px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:120px;border-radius:14px;"></div>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error }}</p>
        </div>
      }

      @if (!loading && series.length > 0) {
        <div style="padding: 4px 0;">
          <p class="section-label" style="padding-left: 4px;">Choose a series to read</p>
          @for (s of series; track s.id) {
            <div class="series-card" (click)="onSelect(s)">
              <div class="series-card-body">
                <h3>{{ s.name }}</h3>
                @if (s.primaryBook) {
                  <p class="series-book">Based on {{ s.primaryBook.title }}</p>
                }
                @if (s.description) {
                  <p class="series-desc">{{ s.description }}</p>
                }
                @if (isGuest) {
                  <p class="series-desc">Sign in to track progress</p>
                } @else if (state(s.id).mode) {
                  <p class="progress-caption">{{ state(s.id).percentage }}%</p>
                  <app-progress-bar [percentage]="state(s.id).percentage" [showLabel]="false"></app-progress-bar>
                  <ion-badge>{{ state(s.id).percentage >= 100 ? 'Completed' : state(s.id).mode === 'day1' ? 'Day 1' : 'Calendar' }}</ion-badge>
                  @if (state(s.id).percentage < 100) {
                    <ion-button fill="outline" color="danger" expand="block" (click)="reset($event, s)">Reset</ion-button>
                  }
                } @else {
                  <p class="series-desc">Not started</p>
                  <div class="mode-buttons">
                    <ion-button expand="block" (click)="choose($event, s, 'day1')">Start from Day 1</ion-button>
                    <ion-button fill="outline" expand="block" (click)="choose($event, s, 'calendar')">Calendar</ion-button>
                  </div>
                }
              </div>
              <ion-icon name="chevron-forward" class="series-chevron"></ion-icon>
            </div>
          }
        </div>
      }
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .series-card {
      display: flex;
      align-items: center;
      padding: 16px;
      margin-bottom: 12px;
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .series-card:active {
      transform: scale(0.99);
    }
    .series-card-body {
      flex: 1;
      min-width: 0;
      text-align: center;
    }
    .series-card-body h3 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 2px;
      color: var(--ion-text-color);
      text-align: center;
    }
    .mode-buttons {
      display: flex;
      gap: 8px;
    }
    .mode-buttons ion-button {
      flex: 1;
      min-width: 0;
      --padding-start: 8px;
      --padding-end: 8px;
    }
    @media (max-width: 576px) {
      .mode-buttons {
        display: block;
      }
      .mode-buttons ion-button {
        display: block;
        width: 100%;
        margin-left: 0;
        margin-right: 0;
      }
    }
    .series-book {
      font-size: 13px;
      color: var(--ion-color-primary);
      margin: 0 0 4px;
      font-weight: 500;
    }
    .series-desc {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0;
      line-height: 1.4;
    }
    .series-chevron {
      font-size: 18px;
      color: var(--ion-color-step-400, #bbb);
      flex-shrink: 0;
    }
  `]
})
class SeriesPage implements OnInit {
  private router = inject(Router);
  private seriesService = inject(SeriesService);
  private prefs = inject(PreferencesService);
  private loggingService = inject(LoggingService);
  private progress = inject(ProgressService);
  private auth = inject(AuthService);
  private sync = inject(SyncService);
  private alert = inject(AlertController);

  series: Series[] = [];
  loading = false;
  error?: string;
  isGuest = false;
  private states = new Map<number, { mode: string | null; completed: number; percentage: number; total?: number }>();

  ngOnInit(): void {
    this.auth.isGuest().then(guest => { this.isGuest = guest; this.loadSeries(); });
  }

  private async loadSeries(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      this.series = await firstValueFrom(this.seriesService.getAll());
      if (!this.isGuest) {
        await this.prefs.migrateSeriesModes(this.series.map(s => s.id), async id => {
          const progress = await firstValueFrom(this.progress.getSeriesProgress(id));
          return progress.length > 0;
        });
      }
      await Promise.all(this.series.map(async s => {
        const mode = await this.prefs.getSeriesMode(s.id);
        const state = { mode, completed: 0, percentage: 0, total: undefined as number | undefined };
        if (!this.isGuest) {
          state.completed = await firstValueFrom(this.progress.getCompletedCount(s.id));
        }
        try { state.total = (await firstValueFrom(this.seriesService.getConfig(s.id))).totalReadings; } catch { /* optional */ }
        if (state.total) {
          state.percentage = Math.round((state.completed / state.total) * 1000) / 10;
        } else if (!this.isGuest) {
          state.percentage = await firstValueFrom(this.progress.getCompletionPercentage(s.id));
        }
        this.states.set(s.id, state);
      }));
    } catch (e: unknown) {
      this.loggingService.error('SeriesPage', 'loadSeries', e instanceof Error ? e.message : String(e));
      this.error = 'Failed to load series. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }

    state(id: number) { return this.states.get(id) ?? { mode: null, completed: 0, percentage: 0 }; }

    async choose(event: Event, s: Series, mode: 'day1' | 'calendar'): Promise<void> {
      event.stopPropagation();
      const confirmation = await this.alert.create({
        header: mode === 'day1' ? 'Start from Day 1?' : 'Use calendar day?',
        message: 'This choice is locked until you reset the series.',
        buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Continue', handler: () => true }]
      });
      await confirmation.present();
      const result = await confirmation.onDidDismiss();
      if (result.role === 'cancel') return;
      await this.prefs.setSeriesMode(s.id, mode);
      await this.prefs.setSeriesStartDate(s.id, new Date().toISOString().slice(0, 10));
      this.states.set(s.id, { ...this.state(s.id), mode });
      await this.onSelect(s);
    }

    async reset(event: Event, s: Series): Promise<void> {
      event.stopPropagation();
      const confirmation = await this.alert.create({
        header: `Reset "${s.name}"?`,
        message: 'This clears your reading progress. Journal notes are kept by default.',
        inputs: [{ name: 'deleteNotes', type: 'checkbox', label: 'Also delete my journal notes' }],
        buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Reset', role: 'destructive' }]
      });
      await confirmation.present();
      const result = await confirmation.onDidDismiss();
      if (result.role === 'cancel') return;
      await this.prefs.clearSeriesState(s.id);
      await this.sync.clearSeries(s.id);
      if (!this.isGuest) await firstValueFrom(this.progress.resetSeries(s.id, !!result.data?.values?.deleteNotes)).catch(() => undefined);
      this.states.set(s.id, { mode: null, completed: 0, percentage: 0, total: this.state(s.id).total });
    }
  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  async onSelect(s: Series): Promise<void> {
    await this.prefs.setSeriesId(s.id);
    this.router.navigate(['/today']);
  }
}

const routes: Routes = [{ path: '', component: SeriesPage }];

@NgModule({
  declarations: [SeriesPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class SeriesModule {}
