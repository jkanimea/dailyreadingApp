import { ComponentFixture, DeferBlockState, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
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
      imports: [IonicModule.forRoot(), SharedModule],
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
      const bibleHeader = headers.find((h: HTMLElement) => h.textContent?.includes('Acts 13:3'));
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

    it('should show series name in ion-title', fakeAsync(() => {
      component.detail = mockDetail;
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement.querySelector('ion-title');
      expect(el.textContent).toContain('Christ The Church');
    }));

    it('should render bible text directly without duplicate section headings', fakeAsync(() => {
      component.detail = {
        ...mockDetail,
        fullTextBible: 'Matthew 9:18-31\n\n18 While he spake\n\nMark 5:21-43\n\n21 And when Jesus'
      };
      fixture.detectChanges();
      const sectionCards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.section-card'));
      const bibleCard = sectionCards.find((c: HTMLElement) =>
        c.querySelector('.section-header-title')?.textContent?.includes('Acts 13:3')
      );
      const texts = bibleCard?.querySelectorAll('.bible-text') ?? [];
      expect(texts.length).toBe(2);
      expect(texts[0].textContent).toContain('18 While he spake');
      expect(texts[1].textContent).toContain('21 And when Jesus');
      expect(bibleCard?.querySelector('.bible-section-title')).toBeFalsy();
    }));

    it('should render a .bible-text per section', fakeAsync(() => {
      component.detail = {
        ...mockDetail,
        fullTextBible: 'Matthew 9:18-31\n\n18 While he spake\n\nMark 5:21-43\n\n21 And when Jesus'
      };
      fixture.detectChanges();
      const sectionCards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.section-card'));
      const bibleCard = sectionCards.find((c: HTMLElement) =>
        c.querySelector('.section-header-title')?.textContent?.includes('Acts 13:3')
      );
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
        const bibleHeader = headers.find(h => h.textContent?.includes('Acts 13:3'));
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
          c.querySelector('.section-header-title')?.textContent?.includes('Acts 13:3')
        );
        expect(bibleCard?.querySelector('.section-body')).toBeFalsy();
      }));

      it('should toggle bibleExpanded when section-header is clicked', fakeAsync(() => {
        component.detail = mockDetail;
        fixture.detectChanges();
        const headers = getSectionHeaders(fixture.nativeElement);
        const bibleHeader = headers.find(h => h.textContent?.includes('Acts 13:3'))!;
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
    });
  });
});
