import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { ReadingService } from '../../core/services/reading.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Today's Reading</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div *ngIf="loading" class="ion-text-center" style="margin-top: 48px;">
        <div class="skeleton-title shimmer"></div>
        <div class="skeleton-line shimmer" style="width: 70%; margin-top: 16px;"></div>
        <div class="skeleton-line shimmer" style="width: 50%; margin-top: 8px;"></div>
      </div>
      <div *ngIf="error" class="empty-state">
        <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
        <p class="empty-title">Unable to load reading</p>
        <p class="empty-text">{{ error }}</p>
        <ion-button fill="outline" (click)="loadToday()" class="ion-margin-top">
          <ion-icon slot="start" name="refresh-outline"></ion-icon>
          Retry
        </ion-button>
      </div>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: 64px;
      text-align: center;
      gap: 8px;
    }
    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--ion-text-color);
      margin: 12px 0 4px;
    }
    .empty-text {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0;
      max-width: 260px;
      line-height: 1.5;
    }
    .skeleton-title {
      width: 200px;
      height: 24px;
      margin: 0 auto;
      border-radius: 6px;
    }
    .skeleton-line {
      height: 16px;
      margin-left: auto;
      margin-right: auto;
      border-radius: 4px;
    }
    .shimmer {
      background: linear-gradient(90deg,
        var(--ion-color-step-50, #f0f0f0) 25%,
        var(--ion-color-step-100, #e0e0e0) 50%,
        var(--ion-color-step-50, #f0f0f0) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `]
})
class TodayPage {
  private router = inject(Router);
  private readingService = inject(ReadingService);
  private prefs = inject(PreferencesService);

  loading = false;
  error?: string;

  ionViewWillEnter(): void {
    this.loadToday();
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  async loadToday(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.error = undefined;
    try {
      const seriesId = this.prefs.getSeriesId();
      const now = new Date();
      const reading = await this.readingService.getToday(seriesId, now.getMonth() + 1, now.getDate()).toPromise();
      if (reading?.id) {
        this.router.navigate(['/reading', reading.id]);
      } else {
        this.error = 'No reading available for today.';
        this.loading = false;
      }
    } catch {
      this.error = 'Failed to load today\'s reading. Make sure the API is running.';
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
