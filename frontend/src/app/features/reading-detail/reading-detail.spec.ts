import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonicModule, ActionSheetController, NavController } from '@ionic/angular';
import { BehaviorSubject, of } from 'rxjs';
import { ReadingService } from '../../core/services/reading.service';
import { SeriesService } from '../../core/services/series.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { ReadingDetailPage } from './reading-detail.module';

describe('ReadingDetailPage', () => {
  let component: ReadingDetailPage;
  let fixture: ComponentFixture<ReadingDetailPage>;
  let mockReadingService: any;
  let mockSeriesService: any;
  let mockPrefs: any;
  let mockRouter: any;
  let mockActionSheet: any;
  let paramMapSubject: BehaviorSubject<any>;

  const mockDetail = {
    id: 5,
    seriesId: 2,
    seriesName: 'Christ The Church',
    month: 5,
    day: 21,
    bibleReading: 'Acts 13:3',
    fullTextBible: 'And when they had fasted and prayed, and laid their hands on them, they sent them away.',
    primaryBookPageRange: 'Acts of the Apostles pp. 110-114',
    fullTextPrimary: 'Sample EGW text from Acts of the Apostles.',
    hasSecondaryReading: true,
    secondaryBookPageRange: 'The Great Controversy pp. 160-163',
    fullTextSecondary: 'Sample EGW text from The Great Controversy.',
    sortOrder: 521
  };

  const mockSeriesList = [
    { id: 1, name: 'Christ The Way', shortName: 'ctw', seriesType: 1, sortOrder: 1 },
    { id: 2, name: 'Christ The Church', shortName: 'ctc', seriesType: 2, sortOrder: 2 }
  ];

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '5' }));

    mockReadingService = {
      getToday: jest.fn().mockReturnValue(of({ id: 3, seriesId: 1 })),
      getFullReading: jest.fn().mockReturnValue(of(mockDetail)),
      getSummary: jest.fn().mockReturnValue(of({ id: 5, summaryPoints: '- Test summary' }))
    };

    mockSeriesService = {
      getAll: jest.fn().mockReturnValue(of(mockSeriesList))
    };

    mockPrefs = {
      getSeriesId: jest.fn().mockReturnValue(2),
      setSeriesId: jest.fn().mockResolvedValue(undefined)
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    mockActionSheet = {
      create: jest.fn().mockResolvedValue({
        present: jest.fn().mockResolvedValue(undefined)
      })
    };

    await TestBed.configureTestingModule({
      declarations: [ReadingDetailPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: ReadingService, useValue: mockReadingService },
        { provide: SeriesService, useValue: mockSeriesService },
        { provide: PreferencesService, useValue: mockPrefs },
        { provide: Router, useValue: mockRouter },
        { provide: ActionSheetController, useValue: mockActionSheet },
        { provide: NavController, useValue: { navigateRoot: jest.fn(), push: jest.fn(), back: jest.fn() } },
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingDetailPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('formatDate', () => {
    it('should format date with abbreviated month name', () => {
      expect(component.formatDate(5, 21)).toBe('May 21');
    });

    it('should handle single-digit months and days', () => {
      expect(component.formatDate(1, 1)).toBe('Jan 1');
    });

    it('should handle December', () => {
      expect(component.formatDate(12, 25)).toBe('Dec 25');
    });
  });

  describe('cleanPageRange', () => {
    it('should remove pp. prefix and space', () => {
      expect(component.cleanPageRange('Acts of the Apostles pp. 110-114'))
        .toBe('Acts of the Apostles 110-114');
    });

    it('should handle range without pp.', () => {
      expect(component.cleanPageRange('Desire of Ages 50-55'))
        .toBe('Desire of Ages 50-55');
    });
  });

  describe('getParagraphSegments', () => {
    it('should return empty array for null text', () => {
      expect(component.getParagraphSegments(null)).toEqual([]);
    });

    it('should return empty array for undefined text', () => {
      expect(component.getParagraphSegments(undefined)).toEqual([]);
    });

    it('should return single segment when no references', () => {
      const result = component.getParagraphSegments('Plain text');
      expect(result).toEqual([{ text: 'Plain text', isRef: false }]);
    });

    it('should split text by paragraph references like [1.1]', () => {
      const result = component.getParagraphSegments('Some text [1.1] more [2.3] end');
      expect(result).toEqual([
        { text: 'Some text ', isRef: false },
        { text: '[1.1]', isRef: true },
        { text: ' more ', isRef: false },
        { text: '[2.3]', isRef: true },
        { text: ' end', isRef: false }
      ]);
    });
  });

  describe('load with route param subscription', () => {
    it('should load detail on initial subscription with BehaviorSubject replay', () => {
      (component as any).load();
      expect(mockReadingService.getFullReading).toHaveBeenCalledWith(5);
    });

    it('should load new detail when route params change', () => {
      paramMapSubject.next(convertToParamMap({ id: '10' }));
      expect(mockReadingService.getFullReading).not.toHaveBeenCalled();

      (component as any).load();
      expect(mockReadingService.getFullReading).toHaveBeenCalledWith(10);
    });

    it('should reload detail on subsequent param changes', () => {
      (component as any).load();
      paramMapSubject.next(convertToParamMap({ id: '10' }));
      expect(mockReadingService.getFullReading).toHaveBeenCalledWith(10);
    });

    it('should clean up subscription on destroy', () => {
      (component as any).load();
      const initialCount = paramMapSubject.observers.length;
      component.ngOnDestroy();
      expect(paramMapSubject.observers.length).toBe(initialCount - 1);
    });
  });

  describe('onSeriesSelected', () => {
    it('should navigate to today reading for selected series', async () => {
      await (component as any).onSeriesSelected(1);

      expect(mockPrefs.setSeriesId).toHaveBeenCalledWith(1);
      expect(mockReadingService.getToday).toHaveBeenCalledWith(1, expect.any(Number), expect.any(Number));
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/reading', 3]);
    });

    it('should not switch if same series selected', () => {
      mockPrefs.getSeriesId.mockReturnValue(2);
      (component as any).onSeriesSelected(2);

      expect(mockPrefs.setSeriesId).not.toHaveBeenCalled();
      expect(mockReadingService.getToday).not.toHaveBeenCalled();
    });

    it('should navigate to /today on missing reading', async () => {
      mockReadingService.getToday.mockReturnValue(of(null));
      await (component as any).onSeriesSelected(3);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/today']);
    });
  });

  describe('template rendering', () => {
    it('should display reading heading with date and cleaned page range', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement.querySelector('.reading-heading');
      expect(el.textContent).toContain('May 21');
      expect(el.textContent).toContain('Acts of the Apostles 110-114');
    }));

    it('should display bible text when fullTextBible exists', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.bible-text');
      expect(el).toBeTruthy();
      expect(el.textContent).toContain('And when they had fasted');
    }));

    it('should show bible reading heading even when fullTextBible is empty', fakeAsync(() => {
      component.detail = { ...mockDetail, fullTextBible: '' };
      fixture.detectChanges();
      const allHeadings: HTMLElement[] = fixture.nativeElement.querySelectorAll('h2');
      const bibleHeading = Array.from(allHeadings).find(h => h.textContent === mockDetail.bibleReading);
      expect(bibleHeading).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.bible-text')).toBeFalsy();
    }));

    it('should show companion heading when secondary text exists', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const allHeadings: HTMLElement[] = fixture.nativeElement.querySelectorAll('h2');
      const companion = Array.from(allHeadings).find(h => h.textContent?.includes('Companion'));
      expect(companion).toBeTruthy();
    }));

    it('should show series name in ion-title', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement.querySelector('ion-title');
      expect(el.textContent).toContain('Christ The Church');
      expect(el.textContent).toContain('Series 2');
    }));
  });
});
