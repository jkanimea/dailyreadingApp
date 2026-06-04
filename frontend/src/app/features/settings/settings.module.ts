import { NgModule, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { PreferencesService, ThemeMode, FontSize } from '../../core/services/preferences.service';
import { NotificationService } from '../../core/services/notification.service';
import { SeriesService } from '../../core/services/series.service';
import { Series } from '../../core/models/series.model';

@Component({
  selector: 'app-settings',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>

      <!-- Reading Series -->
      <div class="settings-section">
        <div class="section-label">Reading Series</div>

        <div *ngIf="seriesLoading" class="series-loading">
          <ion-spinner name="dots"></ion-spinner>
        </div>

        <ng-container *ngIf="!seriesLoading">
          <div class="series-card" *ngIf="currentSeries">
            <div class="series-card-icon">
              <ion-icon name="book-outline"></ion-icon>
            </div>
            <div class="series-card-body">
              <div class="series-card-name">{{ currentSeries.name }}</div>
              <div class="series-card-books">
                {{ currentSeries.primaryBook?.title }}
                <span *ngIf="currentSeries.secondaryBook"> · {{ currentSeries.secondaryBook.title }}</span>
              </div>
              <div class="series-card-desc" *ngIf="currentSeries.description">{{ currentSeries.description }}</div>
            </div>
            <ion-badge color="primary" class="series-active-badge">Active</ion-badge>
          </div>

          <ion-list lines="none" class="series-list">
            <ion-radio-group [value]="selectedSeriesId" (ionChange)="onSeriesChange($event)">
              <ion-item *ngFor="let s of allSeries" class="series-radio-item" [class.selected]="s.id === selectedSeriesId">
                <ion-radio slot="start" [value]="s.id" [aria-label]="s.name"></ion-radio>
                <ion-label>
                  <div class="series-option-name">{{ s.name }}</div>
                  <div class="series-option-sub">{{ s.primaryBook?.title }}<span *ngIf="s.secondaryBook"> · {{ s.secondaryBook.title }}</span></div>
                </ion-label>
              </ion-item>
            </ion-radio-group>
          </ion-list>
        </ng-container>
      </div>

      <!-- Appearance -->
      <div class="settings-section">
        <div class="section-label">Appearance</div>
        <ion-list lines="full">
          <ion-item>
            <ion-icon name="contrast-outline" slot="start" class="item-icon"></ion-icon>
            <ion-label>Theme</ion-label>
            <ion-select [value]="currentTheme" (ionChange)="onThemeChange($event)" interface="popover">
              <ion-select-option value="light">Light</ion-select-option>
              <ion-select-option value="dark">Dark</ion-select-option>
              <ion-select-option value="system">System Default</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-icon name="text-outline" slot="start" class="item-icon"></ion-icon>
            <ion-label>Font Size</ion-label>
            <ion-select [value]="currentFontSize" (ionChange)="onFontSizeChange($event)" interface="popover">
              <ion-select-option value="small">Small</ion-select-option>
              <ion-select-option value="medium">Medium</ion-select-option>
              <ion-select-option value="large">Large</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
      </div>

      <!-- Notifications -->
      <div class="settings-section">
        <div class="section-label">Notifications</div>
        <ion-list lines="full">
          <ion-item>
            <ion-icon name="notifications-outline" slot="start" class="item-icon"></ion-icon>
            <ion-toggle [checked]="reminderEnabled" (ionChange)="onReminderToggle($event)">
              Daily Devotional Reminders
            </ion-toggle>
          </ion-item>

          <ion-item *ngIf="reminderEnabled">
            <ion-icon name="time-outline" slot="start" class="item-icon"></ion-icon>
            <ion-label>Reminder Time</ion-label>
            <ion-datetime-button datetime="reminderTime"></ion-datetime-button>
            <ion-modal [keepContentsMounted]="true">
              <ng-template>
                <ion-datetime id="reminderTime"
                  presentation="time"
                  [value]="reminderTime"
                  (ionChange)="onTimeChange($event)">
                </ion-datetime>
              </ng-template>
            </ion-modal>
          </ion-item>
        </ion-list>
      </div>

    </ion-content>
  `,
  standalone: false,
  styles: [`
    ion-content {
      --background: var(--ion-color-step-50, #f8f8f8);
    }

    .settings-section {
      margin: 20px 16px 0;
    }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
      padding-left: 4px;
    }

    ion-list {
      border-radius: 12px;
      overflow: hidden;
      margin: 0;
    }

    ion-item {
      --background: var(--ion-background-color);
      --padding-start: 16px;
      --inner-padding-end: 16px;
    }

    .item-icon {
      color: var(--ion-color-primary);
      font-size: 20px;
      margin-right: 8px;
    }

    /* Series card */
    .series-card {
      background: var(--ion-background-color);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .series-card-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: var(--ion-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .series-card-icon ion-icon {
      font-size: 22px;
      color: #fff;
    }

    .series-card-body {
      flex: 1;
      min-width: 0;
    }

    .series-card-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--ion-text-color);
      margin-bottom: 2px;
    }

    .series-card-books {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin-bottom: 4px;
    }

    .series-card-desc {
      font-size: 13px;
      color: var(--ion-color-medium-shade);
      line-height: 1.4;
    }

    .series-active-badge {
      flex-shrink: 0;
      font-size: 11px;
      align-self: flex-start;
    }

    /* Series radio list */
    .series-list {
      border-radius: 12px;
      overflow: hidden;
    }

    .series-radio-item {
      --background: var(--ion-background-color);
      --padding-top: 10px;
      --padding-bottom: 10px;
    }

    .series-radio-item.selected {
      --background: rgba(var(--ion-color-primary-rgb), 0.06);
    }

    .series-option-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .series-option-sub {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin-top: 2px;
    }

    .series-loading {
      text-align: center;
      padding: 24px;
    }
  `]
})
class SettingsPage implements OnInit {
  private prefs = inject(PreferencesService);
  private notifications = inject(NotificationService);
  private seriesService = inject(SeriesService);
  private destroyRef = inject(DestroyRef);

  currentTheme: ThemeMode = 'system';
  currentFontSize: FontSize = 'medium';
  reminderEnabled = false;
  reminderTime = '07:00';

  seriesLoading = false;
  allSeries: Series[] = [];
  currentSeries: Series | null = null;
  selectedSeriesId = 1;

  ngOnInit(): void {
    this.prefs.theme$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(t => this.currentTheme = t);
    this.prefs.fontSize$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.currentFontSize = s);
    this.prefs.seriesId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(id => {
      this.selectedSeriesId = id;
      this.currentSeries = this.allSeries.find(s => s.id === id) ?? null;
    });
    this.loadSeries();
  }

  private async loadSeries(): Promise<void> {
    this.seriesLoading = true;
    try {
      this.allSeries = await firstValueFrom(this.seriesService.getAll());
      this.currentSeries = this.allSeries.find(s => s.id === this.selectedSeriesId) ?? null;
    } finally {
      this.seriesLoading = false;
    }
  }

  async onSeriesChange(event: CustomEvent): Promise<void> {
    const id = event.detail.value as number;
    if (id === this.selectedSeriesId) return;
    await this.prefs.setSeriesId(id);
    this.currentSeries = this.allSeries.find(s => s.id === id) ?? null;
  }

  onThemeChange(event: CustomEvent): void {
    this.prefs.setTheme(event.detail.value);
  }

  onFontSizeChange(event: CustomEvent): void {
    this.prefs.setFontSize(event.detail.value);
  }

  async onReminderToggle(event: CustomEvent): Promise<void> {
    this.reminderEnabled = event.detail.checked;

    if (!this.reminderEnabled) {
      await this.notifications.cancelDailyReminder();
      return;
    }

    const granted = await this.notifications.requestPushPermission();

    if (granted) {
      const [h, m] = this.reminderTime.split(':').map(Number);
      await this.notifications.scheduleDailyReminder(h, m);
    } else {
      this.reminderEnabled = false;
    }
  }

  async onTimeChange(event: CustomEvent): Promise<void> {
    const iso = event.detail.value as string;
    const date = new Date(iso);
    const h = date.getHours();
    const m = date.getMinutes();
    this.reminderTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    if (this.reminderEnabled) {
      await this.notifications.scheduleDailyReminder(h, m);
    }
  }
}

const routes: Routes = [{ path: '', component: SettingsPage }];

@NgModule({
  declarations: [SettingsPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class SettingsModule {}
