import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { SeriesService } from '../../core/services/series.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { Series } from '../../core/models/series.model';
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
      <div *ngIf="loading" class="ion-text-center ion-padding">
        <ion-spinner></ion-spinner>
      </div>

      <div *ngIf="error" class="ion-text-center">
        <p class="error-message">{{ error }}</p>
      </div>

      <ion-list *ngIf="!loading && series.length > 0">
        <ion-card *ngFor="let s of series" button (click)="onSelect(s)" class="series-card">
          <ion-card-header>
            <ion-card-title>{{ s.name }}</ion-card-title>
            <ion-card-subtitle *ngIf="s.primaryBook">Based on {{ s.primaryBook.title }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <p>{{ s.description }}</p>
          </ion-card-content>
        </ion-card>
      </ion-list>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .series-card {
      margin-bottom: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .error-message { color: var(--ion-color-danger); }
  `]
})
class SeriesPage implements OnInit {
  private router = inject(Router);
  private seriesService = inject(SeriesService);
  private prefs = inject(PreferencesService);
  private actionSheetCtrl = inject(ActionSheetController);

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
    } catch {
      this.error = 'Failed to load series. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
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
