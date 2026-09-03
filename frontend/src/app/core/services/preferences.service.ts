import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OfflineStorageService } from './offline-storage.service';

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type BibleTranslation = 'KJV' | 'ASV' | 'WEB';
export type SeriesMode = 'day1' | 'calendar';

const PREFS_THEME = 'prefs_theme';
const PREFS_FONT_SIZE = 'prefs_font_size';
const PREFS_SERIES_ID = 'prefs_series_id';
const PREFS_TRANSLATION = 'prefs_translation';
const PREFS_MIGRATED = 'prefs_series_migrated_v1';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private storage = inject(OfflineStorageService);

  private readonly themeSubject = new BehaviorSubject<ThemeMode>('system');
  readonly theme$ = this.themeSubject.asObservable();

  private readonly fontSizeSubject = new BehaviorSubject<FontSize>('medium');
  readonly fontSize$ = this.fontSizeSubject.asObservable();

  private readonly seriesIdSubject = new BehaviorSubject<number>(1);
  readonly seriesId$ = this.seriesIdSubject.asObservable();

  private readonly translationSubject = new BehaviorSubject<BibleTranslation>('KJV');
  readonly translation$ = this.translationSubject.asObservable();

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const theme = await this.storage.get<ThemeMode>(PREFS_THEME);
    if (theme) this.themeSubject.next(theme);

    const fontSize = await this.storage.get<FontSize>(PREFS_FONT_SIZE);
    if (fontSize) this.fontSizeSubject.next(fontSize);

    const seriesId = await this.storage.get<number>(PREFS_SERIES_ID);
    if (seriesId) this.seriesIdSubject.next(seriesId);

    const translation = await this.storage.get<BibleTranslation>(PREFS_TRANSLATION);
    if (translation) this.translationSubject.next(translation);

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

  getSeriesId(): number {
    return this.seriesIdSubject.value;
  }

  async setSeriesId(id: number): Promise<void> {
    this.seriesIdSubject.next(id);
    await this.storage.set(PREFS_SERIES_ID, id);
  }

  getTranslation(): BibleTranslation {
    return this.translationSubject.value;
  }

  async setTranslation(t: BibleTranslation): Promise<void> {
    this.translationSubject.next(t);
    await this.storage.set(PREFS_TRANSLATION, t);
  }

  async getSeriesMode(id: number): Promise<SeriesMode | null> {
    return this.storage.get<SeriesMode>(`prefs_series_mode_${id}`);
  }

  async setSeriesMode(id: number, mode: SeriesMode): Promise<void> {
    await this.storage.set(`prefs_series_mode_${id}`, mode);
  }

  async getSeriesStartDate(id: number): Promise<string | null> {
    return this.storage.get<string>(`prefs_series_start_${id}`);
  }

  async setSeriesStartDate(id: number, date: string): Promise<void> {
    await this.storage.set(`prefs_series_start_${id}`, date);
  }

  async clearSeriesState(id: number): Promise<void> {
    await Promise.all([
      this.storage.remove(`prefs_series_mode_${id}`),
      this.storage.remove(`prefs_series_start_${id}`)
    ]);
  }

  /** Idempotently preserves legacy users' calendar assignment. */
  async migrateSeriesModes(seriesIds: number[], hasData: (id: number) => Promise<boolean>): Promise<void> {
    if (await this.storage.get<boolean>(PREFS_MIGRATED)) return;
    for (const id of seriesIds) {
      if ((await this.getSeriesMode(id)) == null && await hasData(id)) {
        await this.setSeriesMode(id, 'calendar');
      }
    }
    await this.storage.set(PREFS_MIGRATED, true);
  }

  private applyTheme(mode: ThemeMode): void {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    // Activates Ionic's full dark palette (dark.class.css) for all Ionic components
    document.body.classList.toggle('ion-palette-dark', isDark);
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
