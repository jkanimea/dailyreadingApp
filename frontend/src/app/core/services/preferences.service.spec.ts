import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PreferencesService } from './preferences.service';
import { OfflineStorageService } from './offline-storage.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let storage: any;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }))
    });

    storage = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      waitForReady: jest.fn().mockResolvedValue(undefined),
      ready$: new BehaviorSubject(true)
    };

    TestBed.configureTestingModule({
      providers: [
        PreferencesService,
        { provide: OfflineStorageService, useValue: storage }
      ]
    });
    service = TestBed.inject(PreferencesService);
  });

  it('should default to system theme', (done) => {
    service.theme$.subscribe(t => {
      expect(t).toBe('system');
      done();
    });
  });

  it('should default to medium font', (done) => {
    service.fontSize$.subscribe(s => {
      expect(s).toBe('medium');
      done();
    });
  });

  it('setTheme should update subject and persist', (done) => {
    service.setTheme('dark').then(() => {
      service.theme$.subscribe(t => {
        expect(t).toBe('dark');
        expect(storage.set).toHaveBeenCalledWith('prefs_theme', 'dark');
        done();
      });
    });
  });

  it('setFontSize should update subject and persist', (done) => {
    service.setFontSize('large').then(() => {
      service.fontSize$.subscribe(s => {
        expect(s).toBe('large');
        expect(storage.set).toHaveBeenCalledWith('prefs_font_size', 'large');
        done();
      });
    });
  });

  it('setFontSize small should set --app-font-size to 14px', (done) => {
    service.setFontSize('small').then(() => {
      expect(document.documentElement.style.getPropertyValue('--app-font-size')).toBe('14px');
      done();
    });
  });

  it('setFontSize medium should set --app-font-size to 17px', (done) => {
    service.setFontSize('medium').then(() => {
      expect(document.documentElement.style.getPropertyValue('--app-font-size')).toBe('17px');
      done();
    });
  });

  it('setFontSize large should set --app-font-size to 22px', (done) => {
    service.setFontSize('large').then(() => {
      expect(document.documentElement.style.getPropertyValue('--app-font-size')).toBe('22px');
      done();
    });
  });

  it('should restore saved theme from storage', async () => {
    storage.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'prefs_theme') return Promise.resolve('dark');
      return Promise.resolve(null);
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PreferencesService,
        { provide: OfflineStorageService, useValue: storage }
      ]
    });
    service = TestBed.inject(PreferencesService);
    await new Promise(r => setTimeout(r, 10));

    service.theme$.subscribe(t => expect(t).toBe('dark'));
  });

  it('getSeriesId should default to 1', () => {
    expect(service.getSeriesId()).toBe(1);
  });

  it('seriesId$ should emit default 1', (done) => {
    service.seriesId$.subscribe(id => {
      expect(id).toBe(1);
      done();
    });
  });

  it('setSeriesId should update subject and persist', (done) => {
    service.setSeriesId(2).then(() => {
      expect(service.getSeriesId()).toBe(2);
      expect(storage.set).toHaveBeenCalledWith('prefs_series_id', 2);
      done();
    });
  });

  it('should restore saved seriesId from storage', async () => {
    storage.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'prefs_series_id') return Promise.resolve(2);
      return Promise.resolve(null);
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PreferencesService,
        { provide: OfflineStorageService, useValue: storage }
      ]
    });
    service = TestBed.inject(PreferencesService);
    await new Promise(r => setTimeout(r, 10));

    expect(service.getSeriesId()).toBe(2);
  });
});
