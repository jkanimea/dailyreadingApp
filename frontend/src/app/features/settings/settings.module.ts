import { NgModule, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule, Routes } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PreferencesService, ThemeMode, FontSize, BibleTranslation } from '../../core/services/preferences.service';
import { NotificationService } from '../../core/services/notification.service';

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

      <!-- Reading -->
      <div class="settings-section">
        <div class="section-label">Reading</div>
        <ion-list lines="full">
          <ion-item button (click)="switchSeries()" detail="true">
            <ion-icon name="swap-horizontal-outline" slot="start" class="item-icon"></ion-icon>
            <ion-label>Switch Series</ion-label>
          </ion-item>
          <ion-item>
            <ion-icon name="book-outline" slot="start" class="item-icon"></ion-icon>
            <ion-label>Bible Version</ion-label>
            <ion-select [value]="translation" (ionChange)="onTranslationChange($event)" interface="action-sheet">
              <ion-select-option value="KJV">King James Version</ion-select-option>
              <ion-select-option value="ASV">American Standard Version</ion-select-option>
              <ion-select-option value="WEB">World English Bible</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
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
  `]
})
class SettingsPage implements OnInit {
  private prefs = inject(PreferencesService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  currentTheme: ThemeMode = 'system';
  currentFontSize: FontSize = 'medium';
  translation: BibleTranslation = 'KJV';
  reminderEnabled = false;
  reminderTime = '07:00';

  ngOnInit(): void {
    this.prefs.theme$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(t => this.currentTheme = t);
    this.prefs.fontSize$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.currentFontSize = s);
    this.prefs.translation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(t => this.translation = t);
  }

  switchSeries(): void {
    this.router.navigate(['/series']);
  }

  onThemeChange(event: CustomEvent): void {
    this.prefs.setTheme(event.detail.value);
  }

  async onTranslationChange(event: CustomEvent): Promise<void> {
    await this.prefs.setTranslation(event.detail.value);
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
