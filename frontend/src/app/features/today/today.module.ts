import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { ReadingService } from '../../core/services/reading.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/series" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Today's Reading</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openFeatures()">
            <ion-icon slot="icon-only" name="grid-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
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
  private router = inject(Router);
  private readingService = inject(ReadingService);
  private prefs = inject(PreferencesService);
  private actionSheetCtrl = inject(ActionSheetController);

  loading = false;
  error?: string;

  ionViewWillEnter(): void {
    this.loadToday();
  }

  async openFeatures(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Features',
      buttons: [
        { text: 'Search', icon: 'search-outline', handler: () => this.router.navigate(['/search']) },
        { text: 'Progress', icon: 'trending-up-outline', handler: () => this.router.navigate(['/progress']) },
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
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class TodayModule {}
