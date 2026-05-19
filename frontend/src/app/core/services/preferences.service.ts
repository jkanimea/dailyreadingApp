import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OfflineStorageService } from './offline-storage.service';

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

const PREFS_THEME = 'prefs_theme';
const PREFS_FONT_SIZE = 'prefs_font_size';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly themeSubject = new BehaviorSubject<ThemeMode>('system');
  readonly theme$ = this.themeSubject.asObservable();

  private readonly fontSizeSubject = new BehaviorSubject<FontSize>('medium');
  readonly fontSize$ = this.fontSizeSubject.asObservable();

  constructor(private storage: OfflineStorageService) {
    this.load();
  }

  private async load(): Promise<void> {
    const theme = await this.storage.get<ThemeMode>(PREFS_THEME);
    if (theme) this.themeSubject.next(theme);

    const fontSize = await this.storage.get<FontSize>(PREFS_FONT_SIZE);
    if (fontSize) this.fontSizeSubject.next(fontSize);

    this.applyTheme(theme ?? 'system');
    this.applyFontSize(fontSize ?? 'medium');
  }

  async setTheme(mode: ThemeMode): Promise<void> {
    this.themeSubject.next(mode);
    await this.storage.set(PREFS_THEME, mode);
    this.applyTheme(mode);
  }

  async setFontSize(size: FontSize): Promise<void> {
    this.fontSizeSubject.next(size);
    await this.storage.set(PREFS_FONT_SIZE, size);
    this.applyFontSize(size);
  }

  private applyTheme(mode: ThemeMode): void {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
  }

  private applyFontSize(size: FontSize): void {
    const map: Record<FontSize, string> = {
      small: '14px',
      medium: '17px',
      large: '22px'
    };
    document.documentElement.style.setProperty('--app-font-size', map[size]);
  }
}
