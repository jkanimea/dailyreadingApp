import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LoggingService } from './logging.service';

const TOKEN_KEY = 'encounter_access_token';
const REFRESH_KEY = 'encounter_refresh_token';

@Injectable({ providedIn: 'root' })
export class SecureStorageService {
  private loggingService = inject(LoggingService);
  private ready: Promise<void>;

  constructor() {
    this.ready = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try { await import('capacitor-secure-storage-plugin'); } catch (e: unknown) { this.loggingService.error('SecureStorageService', 'initialize', String(e)); }
    }
  }

  private async isReady(): Promise<void> {
    try { await this.ready; } catch (e: unknown) { this.loggingService.error('SecureStorageService', 'isReady', String(e)); }
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.isReady();
    if (Capacitor.isNativePlatform()) {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      await SecureStoragePlugin.set({ key: TOKEN_KEY, value: accessToken });
      await SecureStoragePlugin.set({ key: REFRESH_KEY, value: refreshToken });
    } else {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
  }

  async getToken(): Promise<string | null> {
    await this.isReady();
    if (Capacitor.isNativePlatform()) {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      const result = await SecureStoragePlugin.get({ key: TOKEN_KEY });
      return result.value;
    }
    return localStorage.getItem(TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    await this.isReady();
    if (Capacitor.isNativePlatform()) {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      const result = await SecureStoragePlugin.get({ key: REFRESH_KEY });
      return result.value;
    }
    return localStorage.getItem(REFRESH_KEY);
  }

  async clearTokens(): Promise<void> {
    await this.isReady();
    if (Capacitor.isNativePlatform()) {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      await SecureStoragePlugin.remove({ key: TOKEN_KEY });
      await SecureStoragePlugin.remove({ key: REFRESH_KEY });
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  }
}
