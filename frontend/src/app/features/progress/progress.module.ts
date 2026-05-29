import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { SeriesService } from '../../core/services/series.service';
import { ProgressService } from '../../core/services/progress.service';
import { Series } from '../../core/models/series.model';
import { firstValueFrom } from 'rxjs';

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
          <ion-back-button defaultHref="/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Progress</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openFeatures()">
            <ion-icon slot="icon-only" name="grid-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="loading" class="ion-text-center ion-padding">
        <ion-spinner></ion-spinner>
      </div>

      <div *ngIf="error" class="ion-text-center">
        <p class="error-message">{{ error }}</p>
      </div>

      <div *ngIf="!loading && stats.length === 0 && !error" class="ion-text-center ion-padding">
        <p>No progress data available.</p>
      </div>

      <ion-card *ngFor="let s of stats" class="stat-card">
        <ion-card-header>
          <ion-card-title>{{ s.series.name }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
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
          <div class="stat-row ion-margin-top">
            <span class="stat-label">Current Streak</span>
            <span class="stat-value">{{ s.streak }} day{{ s.streak !== 1 ? 's' : '' }}</span>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .stat-card { margin-bottom: 16px; border-radius: 12px; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
    .stat-label { font-size: 14px; color: var(--ion-color-medium); }
    .stat-value { font-size: 16px; font-weight: 600; }
    .progress-track { width: 100%; height: 10px; background: var(--ion-color-light); border-radius: 5px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: var(--ion-color-primary); border-radius: 5px; transition: width 0.5s; }
    .error-message { color: var(--ion-color-danger); }
  `]
})
class ProgressPage {
  stats: SeriesStats[] = [];
  loading = false;
  error?: string;

  constructor(
    private router: Router,
    private seriesService: SeriesService,
    private progressService: ProgressService,
    private actionSheetCtrl: ActionSheetController
  ) {}

  async openFeatures(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Features',
      buttons: [
        { text: 'Search', icon: 'search-outline', handler: () => this.router.navigate(['/search']) },
        { text: 'Progress', icon: 'trending-up-outline', handler: () => {} },
        { text: 'Bookmarks', icon: 'bookmark-outline', handler: () => this.router.navigate(['/bookmarks']) },
        { text: 'Calendar', icon: 'calendar-outline', handler: () => this.router.navigate(['/calendar']) },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  ionViewWillEnter(): void {
    this.loadStats();
  }

  displayPercentage(s: SeriesStats): number {
    if (s.completedCount === 0) return 0;
    return s.percentage < 1 ? 1 : Math.round(s.percentage);
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
          } catch {
            return { series: s, percentage: 0, streak: 0, completedCount: 0 };
          }
        })
      );
      this.stats = results;
    } catch {
      this.error = 'Failed to load progress. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }
}

const routes: Routes = [{ path: '', component: ProgressPage }];

@NgModule({
  declarations: [ProgressPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class ProgressModule {}
