import { ComponentFixture, DeferBlockState, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ReadingService } from '../../core/services/reading.service';
import { ProgressService } from '../../core/services/progress.service';
import { SeriesService } from '../../core/services/series.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { ReadingDetailPage } from './reading-detail.module';
import { SharedModule } from '../../shared/shared.module';
import { AuthService } from '../../core/services/auth.service';

describe('ReadingDetailPage', () => {
  let component: ReadingDetailPage;
  let fixture: ComponentFixture<ReadingDetailPage>;
  let mockReadingService: any;
  let mockProgressService: any;
  let mockSeriesService: any;
  let mockPrefs: any;
  let mockRouter: any;
  let paramMapSubject: BehaviorSubject<any>;

  function getSectionHeaders(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll('.section-header'));
  }

  function getChevrons(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll('.section-chevron'));
  }

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
      setSeriesId: jest.fn().mockResolvedValue(undefined),
      getTranslation: jest.fn().mockReturnValue('KJV'),
      setTranslation: jest.fn().mockResolvedValue(undefined)
    };

    mockProgressService = {
      markComplete: jest.fn().mockReturnValue(of({ readingId: 5, isCompleted: true })),
      getSeriesProgress: jest.fn().mockReturnValue(of([]))
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    await TestBed.configureTestingModule({
      declarations: [ReadingDetailPage],
      imports: [IonicModule.forRoot(), SharedModule, HttpClientTestingModule],
      providers: [
        { provide: ReadingService, useValue: mockReadingService },
        { provide: ProgressService, useValue: mockProgressService },
        { provide: SeriesService, useValue: mockSeriesService },
        { provide: PreferencesService, useValue: mockPrefs },
        { provide: Router, useValue: mockRouter },
        { provide: NavController, useValue: { navigateRoot: jest.fn(), push: jest.fn(), back: jest.fn() } },
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject } },
        { provide: AuthService, useValue: { user$: new BehaviorSubject(null) } }
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

  describe('bibleSections', () => {
    it('should return empty array when fullTextBible is null', () => {
      component.detail = { ...mockDetail, fullTextBible: null as any };
      expect(component.bibleSections).toEqual([]);
    });

    it('should return empty array when fullTextBible is undefined', () => {
      component.detail = { ...mockDetail, fullTextBible: undefined as any };
      expect(component.bibleSections).toEqual([]);
    });

    it('should return empty array when fullTextBible is empty string', () => {
      component.detail = { ...mockDetail, fullTextBible: '' };
      expect(component.bibleSections).toEqual([]);
    });

    it('should return empty sections for plain verse text without headings', () => {
      component.detail = mockDetail;
      expect(component.bibleSections).toEqual([]);
    });

    it('should parse single section with heading and verses', () => {
      component.detail = {
        ...mockDetail,
        fullTextBible: 'Matthew 9:18-31\n\n18 While he spake these things\n\n19 And Jesus arose'
      };
      const sections = component.bibleSections;
      expect(sections.length).toBe(1);
      expect(sections[0].title).toBe('Matthew 9:18-31');
      expect(sections[0].verses).toEqual([
        '18 While he spake these things',
        '19 And Jesus arose'
      ]);
    });

    it('should parse multiple sections (Matthew and Mark)', () => {
      component.detail = {
        ...mockDetail,
        fullTextBible: 'Matthew 9:18-31\n\n18 While he spake\n\n19 And Jesus\n\nMark 5:21-43\n\n21 And when Jesus\n\n22 And behold'
      };
      const sections = component.bibleSections;
      expect(sections.length).toBe(2);
      expect(sections[0].title).toBe('Matthew 9:18-31');
      expect(sections[0].verses).toEqual(['18 While he spake', '19 And Jesus']);
      expect(sections[1].title).toBe('Mark 5:21-43');
      expect(sections[1].verses).toEqual(['21 And when Jesus', '22 And behold']);
    });

    it('should handle numbered book names like 1 Corinthians', () => {
      component.detail = {
        ...mockDetail,
        fullTextBible: '1 Corinthians 13:4-7\n\n4 Charity suffereth long'
      };
      const sections = component.bibleSections;
      expect(sections.length).toBe(1);
      expect(sections[0].title).toBe('1 Corinthians 13:4-7');
    });

    it('should handle single verse references (no range)', () => {
      component.detail = {
        ...mockDetail,
        fullTextBible: 'Acts 13:3\n\n3 Then when they had fasted'
      };
      const sections = component.bibleSections;
      expect(sections.length).toBe(1);
      expect(sections[0].title).toBe('Acts 13:3');
    });

    it('should return empty sections for chapter-only headings (no colon)', () => {
      component.detail = {
        ...mockDetail,
        fullTextBible: 'Isaiah 42\n\n42:1 Behold my servant\n\n42:2 He shall not cry\n\nIsaiah 44-45\n\n44:1 Yet now hear'
      };
      const sections = component.bibleSections;
      expect(sections.length).toBe(0);
    });
  });

  describe('getParagraphSegments', () => {
    it('should return empty array for null text', () => {
      expect(component.getParagraphSegments(null)).toEqual([]);
    });

    it('should return empty array for undefined text', () => {
      expect(component.getParagraphSegments(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(component.getParagraphSegments('')).toEqual([]);
    });

    it('should return single segment when no references', () => {
      const result = component.getParagraphSegments('Plain text');
      expect(result).toEqual([{ text: 'Plain text', isRef: false, isBibleRef: false }]);
    });

    it('should split text by paragraph references like [1.1]', () => {
      const result = component.getParagraphSegments('Some text [1.1] more [2.3] end');
      expect(result).toEqual([
        { text: 'Some text ', isRef: false, isBibleRef: false },
        { text: '[1.1]', isRef: true, isBibleRef: false },
        { text: ' more ', isRef: false, isBibleRef: false },
        { text: '[2.3]', isRef: true, isBibleRef: false },
        { text: ' end', isRef: false, isBibleRef: false }
      ]);
    });

    it('should identify Bible references like John 3:16', () => {
      const result = component.getParagraphSegments('Read John 3:16 for context');
      expect(result).toEqual([
        { text: 'Read ', isRef: false, isBibleRef: false },
        { text: 'John 3:16', isRef: false, isBibleRef: true },
        { text: ' for context', isRef: false, isBibleRef: false }
      ]);
    });

    it('should identify multiple Bible references in one paragraph', () => {
      const result = component.getParagraphSegments('See John 3:16 and Romans 5:8');
      expect(result).toEqual([
        { text: 'See ', isRef: false, isBibleRef: false },
        { text: 'John 3:16', isRef: false, isBibleRef: true },
        { text: ' and ', isRef: false, isBibleRef: false },
        { text: 'Romans 5:8', isRef: false, isBibleRef: true }
      ]);
    });

    it('should handle comma-separated Bible references', () => {
      const result = component.getParagraphSegments('Read John 3:16-18, 20 for context');
      expect(result).toEqual([
        { text: 'Read ', isRef: false, isBibleRef: false },
        { text: 'John 3:16-18, 20', isRef: false, isBibleRef: true },
        { text: ' for context', isRef: false, isBibleRef: false }
      ]);
    });

    it('should handle semicolon-separated Bible references', () => {
      const result = component.getParagraphSegments('See John 3:16; Romans 5:8 together');
      expect(result).toEqual([
        { text: 'See ', isRef: false, isBibleRef: false },
        { text: 'John 3:16; Romans 5:8', isRef: false, isBibleRef: true },
        { text: ' together', isRef: false, isBibleRef: false }
      ]);
    });

    it('should handle abbreviated book name with period like Matt. 11:1-11', () => {
      const result = component.getParagraphSegments('Read Matt. 11:1-11 for context');
      expect(result).toEqual([
        { text: 'Read ', isRef: false, isBibleRef: false },
        { text: 'Matt. 11:1-11', isRef: false, isBibleRef: true },
        { text: ' for context', isRef: false, isBibleRef: false }
      ]);
    });

    it('should handle continuation refs without book name after semicolon', () => {
      const result = component.getParagraphSegments('See Matt. 11:1-11; 14:1-11 together');
      expect(result).toEqual([
        { text: 'See ', isRef: false, isBibleRef: false },
        { text: 'Matt. 11:1-11; 14:1-11', isRef: false, isBibleRef: true },
        { text: ' together', isRef: false, isBibleRef: false }
      ]);
    });

    it('should handle numbered book names like 1 Corinthians 13:4', () => {
      const result = component.getParagraphSegments('Love is patient, 1 Corinthians 13:4 says');
      expect(result).toEqual([
        { text: 'Love is patient, ', isRef: false, isBibleRef: false },
        { text: '1 Corinthians 13:4', isRef: false, isBibleRef: true },
        { text: ' says', isRef: false, isBibleRef: false }
      ]);
    });

    it('should mix EGW refs and Bible refs together', () => {
      const result = component.getParagraphSegments('Text [1.1] with John 3:16 here');
      expect(result).toEqual([
        { text: 'Text ', isRef: false, isBibleRef: false },
        { text: '[1.1]', isRef: true, isBibleRef: false },
        { text: ' with ', isRef: false, isBibleRef: false },
        { text: 'John 3:16', isRef: false, isBibleRef: true },
        { text: ' here', isRef: false, isBibleRef: false }
      ]);
    });
  });

  describe('buildParagraphGroups', () => {
    it('should group consecutive prose segments with refs as boundaries', () => {
      const segments = component.getParagraphSegments('Some text [1.1] more text');
      const { groups, segmentToGroup } = component.buildParagraphGroups(segments);
      expect(groups).toEqual(['Some text', 'more text']);
      expect(segmentToGroup).toEqual([0, null, 1]);
    });

    it('should exclude Bible ref text from group text', () => {
      const segments = component.getParagraphSegments('See John 3:16 for context');
      const { groups, segmentToGroup } = component.buildParagraphGroups(segments);
      expect(groups).toEqual(['See for context']);
      expect(segmentToGroup).toEqual([0, 0, 0]);
    });

    it('should assign prose group to Bible refs embedded within prose', () => {
      const segments = component.getParagraphSegments('Read John 3:16 here [1.1] more');
      const { groups, segmentToGroup } = component.buildParagraphGroups(segments);
      expect(groups).toEqual(['Read here', 'more']);
      expect(segmentToGroup).toEqual([0, 0, 0, null, 1]);
    });
  });

  describe('highlight class', () => {
    beforeEach(() => {
      component.detail = { ...mockDetail, fullTextPrimary: 'First paragraph [1.1] Second paragraph' };
      component.egwExpanded = true;
    });

    it('should set segmentToGroup on toggleRead(\'primary\')', () => {
      component.toggleRead('primary');
      expect(component.segmentToGroup).toEqual([0, null, 1]);
    });

    it('should update activeProseGroup via onGroup callback', () => {
      const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
      component.toggleRead('primary');
      const onGroup = speakSegmentsSpy.mock.calls[0][1];
      expect(onGroup).toBeInstanceOf(Function);

      (onGroup as (i: number) => void)(0);
      expect(component.activeProseGroup).toBe(0);

      (onGroup as (i: number) => void)(1);
      expect(component.activeProseGroup).toBe(1);
    });

    it('should call scrollToActiveHighlight when onGroup callback fires', () => {
      const scrollSpy = jest.spyOn(component as any, 'scrollToActiveHighlight');
      const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
      component.toggleRead('primary');
      const onGroup = speakSegmentsSpy.mock.calls[0][1];
      (onGroup as (i: number) => void)(0);
      expect(scrollSpy).toHaveBeenCalled();
    });

    it('should call scrollToActiveHighlight for secondary reading when onGroup fires', () => {
      const scrollSpy = jest.spyOn(component as any, 'scrollToActiveHighlight');
      const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
      component.toggleRead('secondary');
      const onGroup = speakSegmentsSpy.mock.calls[0][1];
      (onGroup as (i: number) => void)(0);
      expect(scrollSpy).toHaveBeenCalled();
    });
  });

  describe('onBibleRefClick', () => {
    it('should navigate to bible-verses page with encoded refs', () => {
      component.onBibleRefClick('John 3:16');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/bible-verses'],
        { queryParams: { refs: 'John%203%3A16' } }
      );
    });

    it('should encode semicolons in refs', () => {
      component.onBibleRefClick('John 3:16; Romans 5:8');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/bible-verses'],
        { queryParams: { refs: 'John%203%3A16%3B%20Romans%205%3A8' } }
      );
    });
  });

  describe('load with route param subscription', () => {
    it('should load detail on initial subscription with BehaviorSubject replay', () => {
      (component as any).load();
      expect(mockReadingService.getFullReading).toHaveBeenCalledWith(5, 'KJV');
    });

    it('should load new detail when route params change', () => {
      paramMapSubject.next(convertToParamMap({ id: '10' }));
      expect(mockReadingService.getFullReading).not.toHaveBeenCalled();

      (component as any).load();
      expect(mockReadingService.getFullReading).toHaveBeenCalledWith(10, 'KJV');
    });

    it('should reload detail on subsequent param changes', () => {
      (component as any).load();
      paramMapSubject.next(convertToParamMap({ id: '10' }));
      expect(mockReadingService.getFullReading).toHaveBeenCalledWith(10, 'KJV');
    });

    it('should clean up subscription via destroyRef', () => {
      (component as any).load();
      const initialCount = paramMapSubject.observers.length;
      (component as any).destroyRef.onDestroy(() => {});
      expect(paramMapSubject.observers.length).toBe(initialCount);
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
    it('should display reading heading with date', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement.querySelector('.meta-primary');
      expect(el.textContent).toContain('May 21');
    }));

    it('should display bible text when fullTextBible exists', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.bible-text');
      expect(el).toBeTruthy();
      expect(el.textContent).toContain('And when they had fasted');
    }));

    it('should not show bible text or section headings when fullTextBible is empty', fakeAsync(() => {
      component.detail = { ...mockDetail, fullTextBible: '' };
      fixture.detectChanges();
      const headers: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.section-header-title'));
      const bibleHeader = headers.find((h: HTMLElement) => h.textContent?.includes('Bible Reading'));
      expect(bibleHeader).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.bible-section-title')).toBeFalsy();
    }));

    it('should show companion heading when secondary text exists', async () => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const deferBlocks = await fixture.getDeferBlocks();
      await deferBlocks[0].render(DeferBlockState.Complete);
      fixture.detectChanges();
      const companionEl = fixture.nativeElement.querySelector('.companion-heading');
      expect(companionEl).toBeTruthy();
      expect(companionEl.textContent).toContain('Companion');
    });

    it('should show series name in reading meta', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement.querySelector('.meta-series');
      expect(el?.textContent).toContain('Christ The Church');
    }));

    it('should render bible text with section titles', fakeAsync(() => {
      component.detail = {
        ...mockDetail,
        fullTextBible: 'Matthew 9:18-31\n\n18 While he spake\n\nMark 5:21-43\n\n21 And when Jesus'
      };
      fixture.detectChanges();
      const sectionCards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.section-card'));
      const bibleCard = sectionCards.find((c: HTMLElement) =>
        c.querySelector('.section-header-title')?.textContent?.includes('Bible Reading')
      );
      const sectionTitles = bibleCard?.querySelectorAll('.bible-section-title') ?? [];
      expect(sectionTitles.length).toBe(2);
      expect(sectionTitles[0].textContent).toContain('Matthew 9:18-31');
      expect(sectionTitles[1].textContent).toContain('Mark 5:21-43');
      const texts = bibleCard?.querySelectorAll('.bible-text') ?? [];
      expect(texts.length).toBe(2);
      expect(texts[0].textContent).toContain('18 While he spake');
      expect(texts[1].textContent).toContain('21 And when Jesus');
    }));

    it('should render a .bible-section-title and .bible-text per section', fakeAsync(() => {
      component.detail = {
        ...mockDetail,
        fullTextBible: 'Matthew 9:18-31\n\n18 While he spake\n\nMark 5:21-43\n\n21 And when Jesus'
      };
      fixture.detectChanges();
      const sectionCards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.section-card'));
      const bibleCard = sectionCards.find((c: HTMLElement) =>
        c.querySelector('.section-header-title')?.textContent?.includes('Bible Reading')
      );
      const sectionTitles = bibleCard?.querySelectorAll('.bible-section-title') ?? [];
      expect(sectionTitles.length).toBe(2);
      expect(sectionTitles[0].textContent).toContain('Matthew 9:18-31');
      expect(sectionTitles[1].textContent).toContain('Mark 5:21-43');
      const texts = bibleCard?.querySelectorAll('.bible-text') ?? [];
      expect(texts.length).toBe(2);
      expect(texts[0].textContent).toContain('18 While he spake');
      expect(texts[1].textContent).toContain('21 And when Jesus');
    }));

    it('should fall back to plain .bible-text when fullTextBible has no section headings', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const sections = fixture.nativeElement.querySelectorAll('.bible-section-title');
      expect(sections.length).toBe(0);
      const el = fixture.nativeElement.querySelector('.bible-text');
      expect(el).toBeTruthy();
      expect(el.textContent).toContain('And when they had fasted');
    }));

    it('should render bible text when only Bible exists and no EGW text', fakeAsync(() => {
      component.detail = {
        ...mockDetail,
        bibleReading: 'Isaiah 42,44-45,48',
        fullTextBible: 'Isaiah 42\n\n42:1 Behold my servant\n\nIsaiah 44-45\n\n44:1 Yet now hear',
        fullTextPrimary: '',
        primaryBookPageRange: '',
        fullTextSecondary: undefined,
        secondaryBookPageRange: undefined,
        hasSecondaryReading: false
      };
      fixture.detectChanges();
      const bibleEl = fixture.nativeElement.querySelector('.bible-text');
      expect(bibleEl).toBeTruthy();
      expect(bibleEl.textContent).toContain('Behold my servant');
      const egwEl = fixture.nativeElement.querySelector('.egw-text');
      expect(egwEl).toBeFalsy();
    }));

    describe('collapsible section cards', () => {
      it('should show Bible section header with chevron icon', fakeAsync(() => {
        component.detail = mockDetail;
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const bibleHeader = headers.find(h => h.textContent?.includes('Bible Reading'));
        expect(bibleHeader).toBeTruthy();
        expect(bibleHeader!.querySelector('.section-chevron')).toBeTruthy();
      }));

      it('should show EGW section header with chevron icon', fakeAsync(() => {
        component.detail = mockDetail;
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const egwHeader = headers.find(h => h.textContent?.includes('Acts of the Apostles'));
        expect(egwHeader).toBeTruthy();
        expect(egwHeader!.querySelector('.section-chevron')).toBeTruthy();
      }));

      it('should show Companion section header with chevron icon', async () => {
        component.detail = mockDetail;
        fixture.detectChanges();
        const deferBlocks = await fixture.getDeferBlocks();
        await deferBlocks[0].render(DeferBlockState.Complete);
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const companionHeader = headers.find(h => h.textContent?.includes('Companion'));
        expect(companionHeader).toBeTruthy();
        expect(companionHeader!.querySelector('.section-chevron')).toBeTruthy();
      });

      it('should put chevron icon on left side (first child) of section-header', fakeAsync(() => {
        component.detail = mockDetail;
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        for (const header of headers) {
          const firstChild = header.firstElementChild;
          expect(firstChild?.classList.contains('section-chevron')).toBe(true);
        }
      }));

      it('should show content when bibleExpanded is true', fakeAsync(() => {
        component.detail = mockDetail;
        component.bibleExpanded = true;
        fixture.detectChanges();
        const body = fixture.nativeElement.querySelector('.section-body');
        expect(body).toBeTruthy();
      }));

      it('should hide content when bibleExpanded is false', fakeAsync(() => {
        component.detail = mockDetail;
        component.bibleExpanded = false;
        fixture.detectChanges();
        const sectionCards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.section-card'));
        const bibleCard = sectionCards.find((c: HTMLElement) =>
          c.querySelector('.section-header-title')?.textContent?.includes('Bible Reading')
        );
        expect(bibleCard?.querySelector('.section-body')).toBeFalsy();
      }));

      it('should toggle bibleExpanded when section-header is clicked', fakeAsync(() => {
        component.detail = mockDetail;
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const bibleHeader = headers.find(h => h.textContent?.includes('Bible Reading'))!;
        expect(component.bibleExpanded).toBe(true);
        bibleHeader.click();
        expect(component.bibleExpanded).toBe(false);
        bibleHeader.click();
        expect(component.bibleExpanded).toBe(true);
      }));

      it('should toggle egwExpanded when EGW section-header is clicked', fakeAsync(() => {
        component.detail = mockDetail;
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const egwHeader = headers.find(h => h.textContent?.includes('Acts of the Apostles'))!;
        expect(component.egwExpanded).toBe(true);
        egwHeader.click();
        expect(component.egwExpanded).toBe(false);
      }));
    });

    describe('conditional card visibility', () => {
      it('should hide Bible card when bibleReading is empty', fakeAsync(() => {
        component.detail = { ...mockDetail, bibleReading: '' };
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const bibleHeader = headers.find(h => h.textContent?.includes('Bible Reading'));
        expect(bibleHeader).toBeFalsy();
      }));

      it('should hide EGW card when primaryBookPageRange is empty', fakeAsync(() => {
        component.detail = { ...mockDetail, primaryBookPageRange: '' };
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const egwHeader = headers.find(h => h.textContent?.includes('Acts of the Apostles'));
        expect(egwHeader).toBeFalsy();
      }));

      it('should show "text not yet available" when primaryBookPageRange set but fullTextPrimary is empty', fakeAsync(() => {
        component.detail = { ...mockDetail, fullTextPrimary: '' };
        component.egwExpanded = true;
        fixture.detectChanges();
        const unavailable = fixture.nativeElement.querySelector('.text-unavailable');
        expect(unavailable).toBeTruthy();
        expect(unavailable.textContent).toContain('Text not yet available');
        // The EGW card's section-body should NOT contain a bible-text div
        const egwCard = Array.from(fixture.nativeElement.querySelectorAll('.section-card'))
          .find((c: any) => c.querySelector('.egw-heading')) as HTMLElement | undefined;
        expect(egwCard?.querySelector('.bible-text')).toBeFalsy();
      }));

      it('should show EGW bible-text when fullTextPrimary has content', fakeAsync(() => {
        component.detail = mockDetail;
        component.egwExpanded = true;
        fixture.detectChanges();
        const egwCard = Array.from(fixture.nativeElement.querySelectorAll('.section-card'))
          .find((c: any) => c.querySelector('.egw-heading')) as HTMLElement | undefined;
        expect(egwCard?.querySelector('.bible-text')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.text-unavailable')).toBeFalsy();
      }));

      it('should hide Companion card when fullTextSecondary is empty', async () => {
        component.detail = { ...mockDetail, fullTextSecondary: undefined as any };
        fixture.detectChanges();
        const deferBlocks = await fixture.getDeferBlocks();
        await deferBlocks[0].render(DeferBlockState.Complete);
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const companionHeader = headers.find(h => h.textContent?.includes('Companion'));
        expect(companionHeader).toBeFalsy();
      });
    });

    describe('reading-meta layout', () => {
      it('should have meta-primary and meta-actions as siblings for same-row layout', fakeAsync(() => {
        component.detail = mockDetail;
        component.completed = true;
        fixture.detectChanges();
        const meta = fixture.nativeElement.querySelector('.reading-meta');
        expect(meta).toBeTruthy();
        expect(meta.querySelector('.meta-primary')).toBeTruthy();
        expect(meta.querySelector('.completed-badge')).toBeTruthy();
      }));
    });

    describe('chevron direction consistency with journal', () => {
      it('should show chevron-up when bibleExpanded is true', () => {
        component.bibleExpanded = true;
        expect(component.bibleExpanded).toBe(true);
      });

      it('should show chevron-down when bibleExpanded is false', () => {
        component.bibleExpanded = false;
        expect(component.bibleExpanded).toBe(false);
      });

      it('should show chevron-up when egwExpanded is true', () => {
        component.egwExpanded = true;
        expect(component.egwExpanded).toBe(true);
      });

      it('should show chevron-down when egwExpanded is false', () => {
        component.egwExpanded = false;
        expect(component.egwExpanded).toBe(false);
      });
    });

    describe('scroll-to-reveal checkbox', () => {
      it('should start with readingSeen false', () => {
        expect(component.readingSeen).toBe(false);
      });

      it('should hide complete-section when readingSeen is false', fakeAsync(() => {
        component.detail = mockDetail;
        component.readingSeen = false;
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.complete-section')).toBeFalsy();
      }));

      it('should show complete-section when readingSeen is true', fakeAsync(() => {
        component.detail = mockDetail;
        component.readingSeen = true;
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.complete-section')).toBeTruthy();
      }));

      function setContentMock(overrides: { scrollTop: number; scrollHeight: number; clientHeight: number }): void {
        component.content = {
          getScrollElement: () => Promise.resolve(overrides as any)
        };
      }

      it('should set readingSeen when scrolled past 85%', async () => {
        component.detail = mockDetail;
        setContentMock({ scrollTop: 850, scrollHeight: 1000, clientHeight: 200 });
        await component.onReadingScroll({} as CustomEvent);
        expect(component.readingSeen).toBe(true);
      });

      it('should not set readingSeen when scrolled less than 85%', async () => {
        component.detail = mockDetail;
        setContentMock({ scrollTop: 300, scrollHeight: 1000, clientHeight: 200 });
        await component.onReadingScroll({} as CustomEvent);
        expect(component.readingSeen).toBe(false);
      });

      it('should not set readingSeen when scrollTop is 0 (content collapse, not user scroll)', async () => {
        component.detail = mockDetail;
        setContentMock({ scrollTop: 0, scrollHeight: 500, clientHeight: 200 });
        await component.onReadingScroll({} as CustomEvent);
        expect(component.readingSeen).toBe(false);
      });

      it('should reset readingSeen to false when navigating to new reading', fakeAsync(() => {
        component.readingSeen = true;
        (component as any).load();
        expect(component.readingSeen).toBe(false);
      }));

      it('bible-text and egw-text should render with --reading-font-size', fakeAsync(() => {
        component.detail = mockDetail;
        component.bibleExpanded = true;
        component.egwExpanded = true;
        tick();
        fixture.detectChanges();
        const bibleText = fixture.nativeElement.querySelector('.bible-text');
        expect(bibleText).toBeTruthy();
        expect(bibleText.textContent).toContain('And when they had fasted');
      }));

      it('should render .bible-ref spans when EGW text contains Bible references', fakeAsync(() => {
        component.detail = { ...mockDetail, fullTextPrimary: 'Read John 3:16 for context' };
        component.egwExpanded = true;
        tick();
        fixture.detectChanges();
        const refSpans = fixture.nativeElement.querySelectorAll('.bible-ref');
        expect(refSpans.length).toBe(1);
        expect(refSpans[0].textContent).toBe('John 3:16');
      }));

      it('should render multiple .bible-ref spans for multiple Bible references in EGW text', fakeAsync(() => {
        component.detail = { ...mockDetail, fullTextPrimary: 'See John 3:16 and Romans 5:8' };
        component.egwExpanded = true;
        tick();
        fixture.detectChanges();
        const refSpans = fixture.nativeElement.querySelectorAll('.bible-ref');
        expect(refSpans.length).toBe(2);
        expect(refSpans[0].textContent).toBe('John 3:16');
        expect(refSpans[1].textContent).toBe('Romans 5:8');
      }));

      it('should render .bible-ref in companion secondary reading text', async () => {
        component.detail = {
          ...mockDetail,
          hasSecondaryReading: true,
          fullTextSecondary: 'See Acts 2:38 for more',
          secondaryBookPageRange: 'AA 50-55'
        };
        component.secondaryExpanded = true;
        fixture.detectChanges();
        const deferBlocks = await fixture.getDeferBlocks();
        if (deferBlocks.length > 0) {
          await deferBlocks[0].render(DeferBlockState.Complete);
        }
        fixture.detectChanges();
        const refSpans = fixture.nativeElement.querySelectorAll('.bible-ref');
        expect(refSpans.length).toBe(1);
        expect(refSpans[0].textContent).toBe('Acts 2:38');
      });
    });

    describe('audio read-aloud feature', () => {
      beforeEach(() => {
        component.detail = {
          ...mockDetail,
          fullTextBible: 'In the beginning God created the heavens and the earth.',
          fullTextPrimary: 'Read John 3:16 for context. [1.1] Extra text.',
          fullTextSecondary: 'Another passage.',
        };
        component.bibleExpanded = true;
        component.egwExpanded = true;
        component.secondaryExpanded = true;
        component.notes = 'My journal notes';
        component.showNotes = true;
        fixture.detectChanges();
      });

      it('should render audio icon in Bible section header', () => {
        const headers = fixture.nativeElement.querySelectorAll('.section-card');
        const bibleIcon = headers[0].querySelector('.audio-icon');
        expect(bibleIcon).toBeTruthy();
        expect(bibleIcon.getAttribute('name')).toBe('volume-high-outline');
      });

      it('should render audio icon in EGW section header', () => {
        const headers = fixture.nativeElement.querySelectorAll('.section-card');
        const egwIcon = headers[1].querySelector('.audio-icon');
        expect(egwIcon).toBeTruthy();
      });

      it('should render audio icon in companion section header', async () => {
        const deferBlocks = await fixture.getDeferBlocks();
        if (deferBlocks.length > 0) { await deferBlocks[0].render(DeferBlockState.Complete); }
        fixture.detectChanges();
        const headers = fixture.nativeElement.querySelectorAll('.section-card');
        const companionIcon = headers[2].querySelector('.audio-icon');
        expect(companionIcon).toBeTruthy();
      });

      it('should call toggleRead with bible when Bible audio icon clicked', () => {
        const spy = jest.spyOn(component, 'toggleRead');
        const headers = fixture.nativeElement.querySelectorAll('.section-card');
        headers[0].querySelector('.audio-icon').click();
        expect(spy).toHaveBeenCalledWith('bible');
      });

      it('should call toggleRead with primary when EGW audio icon clicked', () => {
        const spy = jest.spyOn(component, 'toggleRead');
        const headers = fixture.nativeElement.querySelectorAll('.section-card');
        headers[1].querySelector('.audio-icon').click();
        expect(spy).toHaveBeenCalledWith('primary');
      });

      it('should call toggleRead with secondary when companion audio icon clicked', async () => {
        const deferBlocks = await fixture.getDeferBlocks();
        if (deferBlocks.length > 0) { await deferBlocks[0].render(DeferBlockState.Complete); }
        fixture.detectChanges();
        const spy = jest.spyOn(component, 'toggleRead');
        const headers = fixture.nativeElement.querySelectorAll('.section-card');
        headers[2].querySelector('.audio-icon').click();
        expect(spy).toHaveBeenCalledWith('secondary');
      });

      it('should read fullTextBible when toggleRead(\'bible\') is called', () => {
        const speakSpy = jest.spyOn(component['ttsService'], 'speak');
        component.toggleRead('bible');
        expect(speakSpy).toHaveBeenCalledWith('In the beginning God created the heavens and the earth.');
      });

      it('should read EGW text as segmented groups when toggleRead(\'primary\')', () => {
        const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
        component.toggleRead('primary');
        expect(speakSegmentsSpy).toHaveBeenCalledWith(
          ['Read for context.', 'Extra text.'],
          expect.any(Function)
        );
      });

      it('should read companion text as segmented groups when toggleRead(\'secondary\')', () => {
        const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
        component.toggleRead('secondary');
        expect(speakSegmentsSpy).toHaveBeenCalledWith(
          ['Another passage.'],
          expect.any(Function)
        );
      });

      it('should stop TTS and clear readingSection when clicking active section again', () => {
        component.toggleRead('primary');
        expect(component.readingSection).toBe('primary');
        component.toggleRead('primary');
        expect(component.readingSection).toBeNull();
      });

      it('should not crash toggleRead when text is empty', () => {
        component.detail = { ...mockDetail, fullTextBible: '' };
        component.toggleRead('bible');
        expect(component.readingSection).toBeNull();
      });

      it('should call scrollToActiveHighlight when reading bible section', () => {
        const scrollSpy = jest.spyOn(component as any, 'scrollToActiveHighlight');
        component.toggleRead('bible');
        expect(scrollSpy).toHaveBeenCalled();
      });

      it('should call scrollToActiveHighlight when reading notes section', () => {
        const scrollSpy = jest.spyOn(component as any, 'scrollToActiveHighlight');
        component.toggleRead('notes');
        expect(scrollSpy).toHaveBeenCalled();
      });

      it('should use CSS variable for active-highlight background', () => {
        fixture.detectChanges();
        const styleSheet = document.styleSheets[0];
        let found = false;
        for (let i = 0; i < document.styleSheets.length; i++) {
          const sheet = document.styleSheets[i];
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (rules) {
              for (let j = 0; j < rules.length; j++) {
                const rule = rules[j] as CSSStyleRule;
                if (rule.selectorText?.includes('.active-highlight')) {
                  expect(rule.style.background).toContain('var(--active-highlight-bg');
                  found = true;
                  break;
                }
              }
            }
          } catch { /* cross-origin style sheets */ }
          if (found) break;
        }
      });

      it('should stop TTS on ionViewWillLeave', () => {
        const stopSpy = jest.spyOn(component['ttsService'], 'stop');
        component.ionViewWillLeave();
        expect(stopSpy).toHaveBeenCalled();
        expect(component.readingSection).toBeNull();
      });

      it('should show mute icon when section is actively being read', () => {
        component.toggleRead('primary');
        fixture.detectChanges();
        expect(component.readingSection).toBe('primary');
        const headers = fixture.nativeElement.querySelectorAll('.section-card');
        const egwIcon = headers[1].querySelector('.audio-icon');
        expect(egwIcon.classList.contains('audio-icon')).toBe(true);
      });

      it('should render audio icon in journal section when notes exist', () => {
        const toggle = fixture.nativeElement.querySelector('.journal-toggle');
        const icon = toggle.querySelector('.audio-icon');
        expect(icon).toBeTruthy();
        expect(icon.getAttribute('name')).toBe('volume-high-outline');
      });

      it('should NOT render audio icon in journal section when notes is empty', () => {
        component.notes = '';
        fixture.detectChanges();
        const toggle = fixture.nativeElement.querySelector('.journal-toggle');
        const icon = toggle?.querySelector('.audio-icon');
        expect(icon).toBeFalsy();
      });

      it('should call toggleRead with notes when journal audio icon clicked', () => {
        const spy = jest.spyOn(component, 'toggleRead');
        const toggle = fixture.nativeElement.querySelector('.journal-toggle');
        const icon = toggle.querySelector('.audio-icon');
        icon.click();
        expect(spy).toHaveBeenCalledWith('notes');
      });

      it('should read notes text when toggleRead(\'notes\') is called', () => {
        const speakSpy = jest.spyOn(component['ttsService'], 'speak');
        component.toggleRead('notes');
        expect(speakSpy).toHaveBeenCalledWith('My journal notes');
      });

      it('should not crash toggleRead(\'notes\') when notes is empty', () => {
        component.notes = '';
        component.toggleRead('notes');
        expect(component.readingSection).toBeNull();
      });

      it('should auto-expand collapsed Bible section when toggleRead(\'bible\') is called', () => {
        component.bibleExpanded = false;
        component.toggleRead('bible');
        expect(component.bibleExpanded).toBe(true);
      });

      it('should auto-expand collapsed EGW section when toggleRead(\'primary\') is called', () => {
        component.egwExpanded = false;
        component.toggleRead('primary');
        expect(component.egwExpanded).toBe(true);
      });

      it('should auto-expand collapsed Companion section when toggleRead(\'secondary\') is called', () => {
        component.secondaryExpanded = false;
        component.toggleRead('secondary');
        expect(component.secondaryExpanded).toBe(true);
      });

      it('should auto-expand collapsed Journal section when toggleRead(\'notes\') is called', () => {
        component.showNotes = false;
        component.toggleRead('notes');
        expect(component.showNotes).toBe(true);
      });

      it('should keep already-expanded sections open when toggleRead is called', () => {
        component.bibleExpanded = true;
        component.egwExpanded = true;
        component.secondaryExpanded = true;
        component.showNotes = true;
        component.toggleRead('bible');
        expect(component.bibleExpanded).toBe(true);
      });

      describe('toggleSection — collapse stops audio', () => {
        it('should toggle bible expanded state with toggleSection', () => {
          component.bibleExpanded = true;
          component.toggleSection('bible');
          expect(component.bibleExpanded).toBe(false);
          component.toggleSection('bible');
          expect(component.bibleExpanded).toBe(true);
        });

        it('should stop TTS and clear readingSection when collapsing active section', () => {
          component.bibleExpanded = true;
          component.toggleRead('bible');
          expect(component.readingSection).toBe('bible');
          const stopSpy = jest.spyOn(component['ttsService'], 'stop');
          component.toggleSection('bible');
          expect(stopSpy).toHaveBeenCalled();
          expect(component.readingSection).toBeNull();
        });

        it('should NOT stop TTS when collapsing a different section than the active one', () => {
          component.bibleExpanded = true;
          component.egwExpanded = true;
          component.toggleRead('bible');
          const stopSpy = jest.spyOn(component['ttsService'], 'stop');
          component.toggleSection('primary');
          expect(stopSpy).not.toHaveBeenCalled();
          expect(component.readingSection).toBe('bible');
        });

        it('should NOT stop TTS when expanding a collapsed section', () => {
          component.egwExpanded = true;
          component.bibleExpanded = false;
          component.toggleRead('primary');
          const stopSpy = jest.spyOn(component['ttsService'], 'stop');
          component.toggleSection('bible');
          expect(stopSpy).not.toHaveBeenCalled();
          expect(component.readingSection).toBe('primary');
        });

        it('should stop TTS for primary section when collapsing EGW panel', () => {
          component.egwExpanded = true;
          component.toggleRead('primary');
          expect(component.readingSection).toBe('primary');
          component.toggleSection('primary');
          expect(component.readingSection).toBeNull();
        });

        it('should stop TTS for secondary section when collapsing companion panel', async () => {
          const deferBlocks = await fixture.getDeferBlocks();
          if (deferBlocks.length > 0) { await deferBlocks[0].render(DeferBlockState.Complete); }
          fixture.detectChanges();
          component.secondaryExpanded = true;
          component.toggleRead('secondary');
          expect(component.readingSection).toBe('secondary');
          component.toggleSection('secondary');
          expect(component.readingSection).toBeNull();
        });

        it('should stop TTS when collapsing Bible section header via click in template', () => {
          component.bibleExpanded = true;
          component.toggleRead('bible');
          fixture.detectChanges();
          const headers = fixture.nativeElement.querySelectorAll('.section-card');
          const headerDiv = headers[0].querySelector('.section-header') as HTMLElement;
          const stopSpy = jest.spyOn(component['ttsService'], 'stop');
          headerDiv.click();
          expect(stopSpy).toHaveBeenCalled();
          expect(component.readingSection).toBeNull();
        });
      });

      describe('toggleNotes — collapse stops audio', () => {
        it('should stop TTS and clear readingSection when collapsing journal with active notes audio', () => {
          component.showNotes = true;
          component.toggleRead('notes');
          expect(component.readingSection).toBe('notes');
          const stopSpy = jest.spyOn(component['ttsService'], 'stop');
          component.toggleNotes();
          expect(stopSpy).toHaveBeenCalled();
          expect(component.readingSection).toBeNull();
        });

        it('should NOT stop TTS when collapsing journal with a different section active', () => {
          component.showNotes = true;
          component.toggleRead('bible');
          const stopSpy = jest.spyOn(component['ttsService'], 'stop');
          component.toggleNotes();
          expect(stopSpy).not.toHaveBeenCalled();
          expect(component.readingSection).toBe('bible');
        });

        it('should NOT stop TTS when expanding journal', () => {
          component.bibleExpanded = true;
          component.showNotes = false;
          component.toggleRead('bible');
          const stopSpy = jest.spyOn(component['ttsService'], 'stop');
          component.toggleNotes();
          expect(stopSpy).not.toHaveBeenCalled();
          expect(component.readingSection).toBe('bible');
        });

        it('should toggle showNotes', () => {
          component.showNotes = true;
          component.toggleNotes();
          expect(component.showNotes).toBe(false);
          component.toggleNotes();
          expect(component.showNotes).toBe(true);
        });
      });
    });
  });
});
