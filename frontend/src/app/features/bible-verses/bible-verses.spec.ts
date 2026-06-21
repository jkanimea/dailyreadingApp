import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { BibleVersesPage } from './bible-verses.module';
import { BibleService } from '../../core/services/bible.service';
import { LoggingService } from '../../core/services/logging.service';
import { BibleLookupResponse } from '../../core/models/bible.model';
import { SharedModule } from '../../shared/shared.module';
import { AuthService } from '../../core/services/auth.service';
import { BehaviorSubject } from 'rxjs';

describe('BibleVersesPage', () => {
  let component: BibleVersesPage;
  let fixture: ComponentFixture<BibleVersesPage>;
  let mockBibleService: any;
  let mockRouter: any;

  const mockResult: BibleLookupResponse = {
    reference: 'John 3:16-17',
    groups: [
      {
        reference: 'John 3:16-17',
        verses: [
          { book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son.' },
          { book: 'John', chapter: 3, verse: 17, text: 'For God sent not his Son into the world to condemn the world.' }
        ]
      }
    ]
  };

  beforeEach(async () => {
    mockBibleService = {
      lookupVerses: jest.fn().mockReturnValue(of(mockResult))
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    const mockLoggingService = {
      error: jest.fn()
    };

    // Mock SpeechSynthesis for TtsService
    class MockUtterance {
      text: string;
      rate = 1; pitch = 1; volume = 1;
      onstart: any = null; onend: any = null; onerror: any = null;
      onpause: any = null; onresume: any = null;
      constructor(text: string) { this.text = text; }
    }
    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: jest.fn(), cancel: jest.fn(), pause: jest.fn(), resume: jest.fn() },
      configurable: true, writable: true,
    });

    await TestBed.configureTestingModule({
      declarations: [BibleVersesPage],
      imports: [IonicModule.forRoot(), SharedModule, HttpClientTestingModule],
      providers: [
        { provide: BibleService, useValue: mockBibleService },
        { provide: Router, useValue: mockRouter },
        { provide: LoggingService, useValue: mockLoggingService },
        { provide: NavController, useValue: { navigateRoot: jest.fn(), push: jest.fn(), back: jest.fn() } },
        { provide: AuthService, useValue: { user$: new BehaviorSubject(null) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ refs: 'John+3:16-17' }) } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BibleVersesPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have expanded as true by default', () => {
    expect(component.expanded).toBe(true);
  });

  it('should have readingSection as null by default', () => {
    expect(component.readingSection).toBeNull();
  });

  describe('ionViewWillEnter', () => {
    it('should load verses on enter', async () => {
      await component.ionViewWillEnter();
      expect(component.result).toEqual(mockResult);
      expect(component.loading).toBe(false);
    });

    it('should set error when no refs provided', async () => {
      const route = TestBed.inject(ActivatedRoute);
      Object.defineProperty(route, 'snapshot', {
        value: { queryParamMap: convertToParamMap({}) }
      });
      const page = TestBed.createComponent(BibleVersesPage).componentInstance;
      await page.ionViewWillEnter();
      expect(page.error).toBe('No Bible reference provided.');
    });
  });

  describe('toggleSection', () => {
    it('should toggle expanded', () => {
      expect(component.expanded).toBe(true);
      component.toggleSection();
      expect(component.expanded).toBe(false);
      component.toggleSection();
      expect(component.expanded).toBe(true);
    });

    it('should stop TTS when collapsing with active audio', () => {
      component.expanded = true;
      component.readingSection = 'bible-verses';
      const stopSpy = jest.spyOn(component['ttsService'], 'stop');
      component.toggleSection();
      expect(stopSpy).toHaveBeenCalled();
      expect(component.readingSection).toBeNull();
    });

    it('should NOT stop TTS when collapsing without active audio', () => {
      component.expanded = true;
      component.readingSection = null;
      const stopSpy = jest.spyOn(component['ttsService'], 'stop');
      component.toggleSection();
      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('toggleRead', () => {
    it('should start reading verses', () => {
      component.result = mockResult;
      const speakSpy = jest.spyOn(component['ttsService'], 'speak');
      component.toggleRead();
      expect(speakSpy).toHaveBeenCalledWith(
        '16 For God so loved the world, that he gave his only begotten Son.. 17 For God sent not his Son into the world to condemn the world.'
      );
      expect(component.readingSection).toBe('bible-verses');
    });

    it('should stop TTS and clear readingSection when clicking active section again', () => {
      component.result = mockResult;
      component.toggleRead();
      expect(component.readingSection).toBe('bible-verses');
      const stopSpy = jest.spyOn(component['ttsService'], 'stop');
      component.toggleRead();
      expect(stopSpy).toHaveBeenCalled();
      expect(component.readingSection).toBeNull();
    });

    it('should auto-expand collapsed section when toggleRead is called', () => {
      component.result = mockResult;
      component.expanded = false;
      component.toggleRead();
      expect(component.expanded).toBe(true);
    });

    it('should not crash when result is undefined', () => {
      component.result = undefined;
      component.toggleRead();
      expect(component.readingSection).toBeNull();
    });
  });

  describe('ionViewWillLeave', () => {
    it('should stop TTS on leave', () => {
      component.readingSection = 'bible-verses';
      const stopSpy = jest.spyOn(component['ttsService'], 'stop');
      component.ionViewWillLeave();
      expect(stopSpy).toHaveBeenCalled();
      expect(component.readingSection).toBeNull();
    });
  });

  describe('template', () => {
    it('should render section-card with header and audio icon', async () => {
      component.result = mockResult;
      fixture.detectChanges();
      await fixture.whenStable();
      const el = fixture.nativeElement;
      expect(el.querySelector('.section-card')).toBeTruthy();
      expect(el.querySelector('.section-header')).toBeTruthy();
      expect(el.querySelector('.audio-icon')).toBeTruthy();
      expect(el.querySelector('.section-chevron')).toBeTruthy();
    });

    it('should render verse content when expanded', async () => {
      component.result = mockResult;
      fixture.detectChanges();
      await fixture.whenStable();
      const el = fixture.nativeElement;
      expect(el.querySelector('.verse-card')).toBeTruthy();
      expect(el.querySelector('.verse-text')).toBeTruthy();
    });

    it('should hide verse content when collapsed', async () => {
      component.result = mockResult;
      component.toggleSection();
      fixture.detectChanges();
      await fixture.whenStable();
      const el = fixture.nativeElement;
      expect(el.querySelector('.verse-card')).toBeFalsy();
    });

    it('should show volume-high icon when not reading', async () => {
      component.result = mockResult;
      fixture.detectChanges();
      await fixture.whenStable();
      const icon = fixture.nativeElement.querySelector('.audio-icon');
      expect(icon).toBeTruthy();
      expect(icon.getAttribute('name')).toBe('volume-high-outline');
    });

    it('should show volume-mute icon when reading', async () => {
      component.result = mockResult;
      component.toggleRead();
      fixture.detectChanges();
      await fixture.whenStable();
      const icon = fixture.nativeElement.querySelector('.audio-icon');
      expect(icon).toBeTruthy();
      expect(icon.getAttribute('name')).toBe('volume-mute-outline');
    });

    it('should call toggleSection when section-header is clicked', async () => {
      component.result = mockResult;
      fixture.detectChanges();
      await fixture.whenStable();
      const spy = jest.spyOn(component, 'toggleSection');
      const header = fixture.nativeElement.querySelector('.section-header');
      header.click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call toggleRead when audio icon is clicked', async () => {
      component.result = mockResult;
      fixture.detectChanges();
      await fixture.whenStable();
      const spy = jest.spyOn(component, 'toggleRead');
      const icon = fixture.nativeElement.querySelector('.audio-icon');
      icon.click();
      expect(spy).toHaveBeenCalled();
    });

    it('should not toggle section when audio icon is clicked', async () => {
      component.result = mockResult;
      fixture.detectChanges();
      await fixture.whenStable();
      const toggleSpy = jest.spyOn(component, 'toggleSection');
      const icon = fixture.nativeElement.querySelector('.audio-icon');
      icon.click();
      expect(toggleSpy).not.toHaveBeenCalled();
    });
  });
});
