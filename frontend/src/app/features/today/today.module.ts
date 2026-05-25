import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { ReadingService } from '../../core/services/reading.service';
import { PreferencesService } from '../../core/services/preferences.service';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Today's Reading</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSearch()">
            <ion-icon slot="icon-only" name="search-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToProgress()">
            <ion-icon slot="icon-only" name="trending-up-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToBookmarks()">
            <ion-icon slot="icon-only" name="bookmark-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToCalendar()">
            <ion-icon slot="icon-only" name="calendar-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div *ngIf="loading" class="ion-text-center">
        <ion-spinner></ion-spinner>
        <p>Loading today's reading...</p>
      </div>
      <div *ngIf="error" class="ion-text-center">
        <p class="error-message">{{ error }}</p>
      </div>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .error-message { color: var(--ion-color-danger); }
  `]
})
class TodayPage {
  loading = false;
  error?: string;

  constructor(
    private router: Router,
    private readingService: ReadingService,
    private prefs: PreferencesService
  ) {}

  ionViewWillEnter(): void {
    this.loadToday();
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  goToProgress(): void {
    this.router.navigate(['/progress']);
  }

  goToBookmarks(): void {
    this.router.navigate(['/bookmarks']);
  }

  private async loadToday(): Promise<void> {
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
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class TodayModule {}
