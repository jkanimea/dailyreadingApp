import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { PreferencesService, ThemeMode, FontSize } from '../../core/services/preferences.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-list-header>Appearance</ion-list-header>

        <ion-item>
          <ion-label>Theme</ion-label>
          <ion-select [value]="currentTheme" (ionChange)="onThemeChange($event)">
            <ion-select-option value="light">Light</ion-select-option>
            <ion-select-option value="dark">Dark</ion-select-option>
            <ion-select-option value="system">System</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label>Font Size</ion-label>
          <ion-select [value]="currentFontSize" (ionChange)="onFontSizeChange($event)">
            <ion-select-option value="small">Small</ion-select-option>
            <ion-select-option value="medium">Medium</ion-select-option>
            <ion-select-option value="large">Large</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header>Account</ion-list-header>
        <ion-item button (click)="goToLogin()">
          <ion-icon slot="start" name="log-in-outline"></ion-icon>
          <ion-label>Switch Account</ion-label>
        </ion-item>
        <ion-item button (click)="logout()">
          <ion-icon slot="start" name="log-out-outline"></ion-icon>
          <ion-label>Logout</ion-label>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header>Notifications</ion-list-header>

        <ion-item>
          <ion-toggle [checked]="reminderEnabled" (ionChange)="onReminderToggle($event)">
            Daily Devotional Reminders
          </ion-toggle>
        </ion-item>

        <ion-item *ngIf="reminderEnabled">
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
    </ion-content>
  `,
  standalone: false
})
class SettingsPage implements OnInit {
  currentTheme: ThemeMode = 'system';
  currentFontSize: FontSize = 'medium';
  reminderEnabled = false;
  reminderTime = '07:00';

  constructor(
    private prefs: PreferencesService,
    private notifications: NotificationService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.prefs.theme$.subscribe(t => this.currentTheme = t);
    this.prefs.fontSize$.subscribe(s => this.currentFontSize = s);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
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
