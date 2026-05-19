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

  it('should restore saved theme from storage', async () => {
    storage.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'prefs_theme') return Promise.resolve('dark');
      return Promise.resolve(null);
    });

    service = TestBed.inject(PreferencesService);
    await new Promise(r => setTimeout(r, 10));

    service.theme$.subscribe(t => expect(t).toBe('dark'));
  });
});
