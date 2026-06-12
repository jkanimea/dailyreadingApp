import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { SeriesService } from '../../core/services/series.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { Series } from '../../core/models/series.model';
import { LoggingService } from '../../core/services/logging.service';
import { firstValueFrom } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';

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
              <div class="series-card-icon">
                <ion-icon name="book-outline"></ion-icon>
              </div>
              <div class="series-card-body">
                <h3>{{ s.name }}</h3>
                @if (s.primaryBook) {
                  <p class="series-book">Based on {{ s.primaryBook.title }}</p>
                }
                @if (s.description) {
                  <p class="series-desc">{{ s.description }}</p>
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
      gap: 14px;
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
    .series-card-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-shade));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .series-card-icon ion-icon {
      font-size: 24px;
      color: #fff;
    }
    .series-card-body {
      flex: 1;
      min-width: 0;
    }
    .series-card-body h3 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 2px;
      color: var(--ion-text-color);
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

  series: Series[] = [];
  loading = false;
  error?: string;

  ngOnInit(): void {
    this.loadSeries();
  }

  private async loadSeries(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      this.series = await firstValueFrom(this.seriesService.getAll());
    } catch (e: unknown) {
      this.loggingService.error('SeriesPage', 'loadSeries', e);
      this.error = 'Failed to load series. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
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
