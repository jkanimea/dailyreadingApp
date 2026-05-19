import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private pushPermission: boolean | null = null;

  constructor() {}

  async requestPushPermission(): Promise<boolean> {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    this.pushPermission = result.receive === 'granted';
    if (this.pushPermission) {
      await PushNotifications.register();
    }
    return this.pushPermission;
  }

  async scheduleDailyReminder(hour: number, minute: number): Promise<void> {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    const existing = await LocalNotifications.getPending();
    const devotional = existing.notifications.find(n => n.id === 1);

    if (devotional) {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: 'Daily Devotional',
        body: 'Your daily reading is ready! Open the app to read and reflect.',
        schedule: { repeats: true, on: { hour, minute } },
        sound: undefined,
        smallIcon: 'ic_stat_icon',
        largeIcon: 'ic_launcher'
      }]
    });
  }

  async cancelDailyReminder(): Promise<void> {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  }



  getPushPermission(): boolean | null {
    return this.pushPermission;
  }
}
