import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { SeriesService } from '../../core/services/series.service';
import { ProgressService } from '../../core/services/progress.service';
import { LoggingService } from '../../core/services/logging.service';
import { Series } from '../../core/models/series.model';
import { firstValueFrom } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';

interface SeriesStats {
  series: Series;
  percentage: number;
  streak: number;
  completedCount: number;
}

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Progress</ion-title>
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
        <div style="padding: 8px 0;">
          <div class="skeleton-shimmer" style="width:100%;height:160px;border-radius:14px;margin-bottom:16px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:160px;border-radius:14px;"></div>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error }}</p>
        </div>
      }

      @if (!loading && stats.length === 0 && !error) {
        <div class="empty-state">
          <ion-icon name="analytics-outline" size="large" color="medium"></ion-icon>
          <p class="empty-title">No progress data</p>
          <p class="empty-subtitle">Start reading to track your progress across series.</p>
        </div>
      }

      @for (s of stats; track s.series.id) {
        <div class="stats-card">
          <div class="stats-card-header">
            <div class="stats-icon">
              <ion-icon name="book-outline"></ion-icon>
            </div>
            <div class="stats-info">
              <h3>{{ s.series.name }}</h3>
              <p>{{ s.series.primaryBook.title }}</p>
            </div>
          </div>
          <div class="stats-body">
            <div class="stat-row">
              <span class="stat-label">Day</span>
              <span class="stat-value">{{ s.completedCount }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Completed</span>
              <span class="stat-value">{{ displayPercentage(s) }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="s.percentage"></div>
            </div>
            <div class="stat-row" style="margin-top: 10px;">
              <span class="stat-label">Current Streak</span>
              <span class="stat-value">{{ s.streak }} day{{ s.streak !== 1 ? 's' : '' }}</span>
            </div>
          </div>
        </div>
      }
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .stats-card {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      margin-bottom: 16px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
    }
    .stats-card-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 16px 0;
    }
    .stats-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-shade));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stats-icon ion-icon {
      font-size: 22px;
      color: #fff;
    }
    .stats-info {
      flex: 1;
      min-width: 0;
    }
    .stats-info h3 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 2px;
      color: var(--ion-text-color);
    }
    .stats-info p {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0;
    }
    .stats-body {
      padding: 14px 16px 16px;
    }
  `]
})
class ProgressPage {
  private router = inject(Router);
  private seriesService = inject(SeriesService);
  private progressService = inject(ProgressService);
  private loggingService = inject(LoggingService);

  stats: SeriesStats[] = [];
  loading = false;
  error?: string;

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  ionViewWillEnter(): void {
    this.loadStats();
  }

  displayPercentage(s: SeriesStats): string {
    if (s.completedCount === 0) return '0';
    if (s.percentage < 1) return s.percentage.toFixed(1);
    return String(Math.round(s.percentage));
  }

  private async loadStats(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const seriesList = await firstValueFrom(this.seriesService.getAll());
      const results = await Promise.all(
        seriesList.map(async (s) => {
          try {
            const [percentage, streak, completedCount] = await Promise.all([
              firstValueFrom(this.progressService.getCompletionPercentage(s.id)),
              firstValueFrom(this.progressService.getStreak(s.id)),
              firstValueFrom(this.progressService.getCompletedCount(s.id))
            ]);
            return { series: s, percentage, streak, completedCount };
          } catch (e: unknown) {
            this.loggingService.error('ProgressPage', 'seriesStats', e instanceof Error ? e.message : String(e));
            return { series: s, percentage: 0, streak: 0, completedCount: 0 };
          }
        })
      );
      this.stats = results;
    } catch (e: unknown) {
      this.loggingService.error('ProgressPage', 'loadStats', e instanceof Error ? e.message : String(e));
      this.error = 'Failed to load progress. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }
}

const routes: Routes = [{ path: '', component: ProgressPage }];

@NgModule({
  declarations: [ProgressPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class ProgressModule {}
