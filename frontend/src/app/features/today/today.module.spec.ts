import { ComponentFixture, DeferBlockState, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IonicModule, AlertController } from '@ionic/angular';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ReadingService } from '../../core/services/reading.service';
import { ProgressService } from '../../core/services/progress.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { SharedModule } from '../../shared/shared.module';
import { AuthService } from '../../core/services/auth.service';
import { TodayPage } from './today.module';

describe('TodayPage — AI Summarize uses popup not inline', () => {
  let component: TodayPage;
  let fixture: ComponentFixture<TodayPage>;
  let mockProgressService: any;
  let mockAlertCtrl: any;

  const mockDetail = {
    id: 3,
    seriesId: 1,
    seriesName: 'Test Series',
    month: 6,
    day: 8,
    sortOrder: 608,
    bibleReading: 'Acts 13:3',
    fullTextBible: 'And when they had fasted and prayed...',
    primaryBookPageRange: 'AA 110-114',
    fullTextPrimary: 'Sample EGW text.',
    hasSecondaryReading: false
  };

  beforeEach(async () => {
    mockProgressService = {
      markComplete: jest.fn().mockReturnValue(of({})),
      unmarkComplete: jest.fn().mockReturnValue(of({})),
      getSeriesProgress: jest.fn().mockReturnValue(of([])),
      saveNotes: jest.fn().mockReturnValue(of({})),
      summarizeNotes: jest.fn()
    };

    mockAlertCtrl = {
      create: jest.fn().mockResolvedValue({
        present: jest.fn().mockResolvedValue(undefined)
      })
    };

    await TestBed.configureTestingModule({
      declarations: [TodayPage],
      imports: [IonicModule.forRoot(), SharedModule, HttpClientTestingModule],
      providers: [
        { provide: ReadingService, useValue: { getToday: jest.fn().mockReturnValue(of({ id: 3, seriesId: 1 })), getFullReading: jest.fn().mockReturnValue(of(mockDetail)) } },
        { provide: ProgressService, useValue: mockProgressService },
        { provide: PreferencesService, useValue: { getSeriesId: jest.fn().mockReturnValue(1), getTranslation: jest.fn().mockReturnValue('KJV'), seriesId$: of(1) } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: AlertController, useValue: mockAlertCtrl },
        { provide: AuthService, useValue: { user$: new BehaviorSubject(null) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TodayPage);
    component = fixture.componentInstance;
    // loadToday() fires in constructor via seriesId$ — reset its side-effects
    component.loading = false;
    component.detail = mockDetail;
    component.completed = true;
    component.notes = 'My journal notes';
    component.showNotes = true;
    fixture.detectChanges();
  });

  it('should render AI Summarize area when notes exist', () => {
    const html = fixture.nativeElement.innerHTML;
    expect(html).toContain('notes-ai');
  });

  it('should NOT render summary text inline in the template', () => {
    const summaryDiv = fixture.nativeElement.querySelector('.summary-text');
    expect(summaryDiv).toBeFalsy();
  });

  it('should call summarizeNotes with correct args', async () => {
    mockProgressService.summarizeNotes.mockReturnValue(of({ summary: 'Condensed summary' }));
    component.notes = 'My long notes text';

    await component.onSummarize();

    expect(mockProgressService.summarizeNotes).toHaveBeenCalledWith(3, 'My long notes text');
  });

  it('should show alert with summary on success instead of inline div', async () => {
    mockProgressService.summarizeNotes.mockReturnValue(of({ summary: 'Condensed summary' }));
    component.notes = 'My notes';

    await component.onSummarize();

    // Must use alert, not inline div
    expect(mockAlertCtrl.create).toHaveBeenCalledWith(expect.objectContaining({
      header: 'AI Summary',
      message: 'Condensed summary'
    }));

    // Inline summary div must NOT appear
    const summaryDiv = fixture.nativeElement.querySelector('.summary-text');
    expect(summaryDiv).toBeFalsy();
  });

  it('should show error alert when summarize fails', async () => {
    mockProgressService.summarizeNotes.mockReturnValue(throwError(() => new Error('API error')));
    component.notes = 'My notes';

    await component.onSummarize();

    expect(mockAlertCtrl.create).toHaveBeenCalledWith(expect.objectContaining({
      header: 'Error',
      message: 'Failed to summarize notes. Please try again.'
    }));
  });

  it('should set summarizing state correctly during API call', async () => {
    mockProgressService.summarizeNotes.mockReturnValue(of({ summary: 'S' }));
    component.notes = 'Notes';

    const promise = component.onSummarize();
    expect(component.summarizing).toBe(true);
    await promise;
    expect(component.summarizing).toBe(false);
  });

  it('should do nothing if notes is empty', async () => {
    component.notes = '';

    await component.onSummarize();

    expect(mockProgressService.summarizeNotes).not.toHaveBeenCalled();
  });

  it('should replace notes with summary and save on Replace Notes', async () => {
    component.notes = 'Original notes';

    await (component as any).replaceNotesWithSummary('Replaced summary');

    expect(component.notes).toBe('Replaced summary');
    expect(mockProgressService.saveNotes).toHaveBeenCalledWith(3, 'Replaced summary');
  });

  it('should show "text not yet available" when primaryBookPageRange set but fullTextPrimary is empty', () => {
    component.detail = { ...mockDetail, fullTextPrimary: '' };
    component.egwExpanded = true;
    fixture.detectChanges();
    const unavailable = fixture.nativeElement.querySelector('.text-unavailable');
    expect(unavailable).toBeTruthy();
    expect(unavailable.textContent).toContain('Text not yet available');
    // EGW card should not contain a bible-text div
    const egwCard = Array.from(fixture.nativeElement.querySelectorAll('.section-card'))
      .find((c: any) => c.querySelector('.egw-heading')) as HTMLElement | undefined;
    expect(egwCard?.querySelector('.bible-text')).toBeFalsy();
  });

  it('should show EGW bible-text when fullTextPrimary has content', () => {
    component.detail = mockDetail;
    component.egwExpanded = true;
    fixture.detectChanges();
    const egwCard = Array.from(fixture.nativeElement.querySelectorAll('.section-card'))
      .find((c: any) => c.querySelector('.egw-heading')) as HTMLElement | undefined;
    expect(egwCard?.querySelector('.bible-text')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.text-unavailable')).toBeFalsy();
  });

  it('bible-text should render with font-size bound to --reading-font-size', () => {
    component.detail = mockDetail;
    component.bibleExpanded = true;
    fixture.detectChanges();
    const bibleText = fixture.nativeElement.querySelector('.bible-text');
    expect(bibleText).toBeTruthy();
    expect(bibleText.textContent).toContain('And when they had fasted');
  });

  describe('getParagraphSegments', () => {
    it('should return single segment for plain text', () => {
      const result = component.getParagraphSegments('Plain text');
      expect(result).toEqual([{ text: 'Plain text', isRef: false, isBibleRef: false }]);
    });

    it('should return segments with para-ref for EGW paragraph refs', () => {
      const result = component.getParagraphSegments('Some text [19.2] more [20.1] end');
      expect(result).toEqual([
        { text: 'Some text ', isRef: false, isBibleRef: false },
        { text: '[19.2]', isRef: true, isBibleRef: false },
        { text: ' more ', isRef: false, isBibleRef: false },
        { text: '[20.1]', isRef: true, isBibleRef: false },
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
      const result = component.getParagraphSegments('Text [19.2] with John 3:16 here');
      expect(result).toEqual([
        { text: 'Text ', isRef: false, isBibleRef: false },
        { text: '[19.2]', isRef: true, isBibleRef: false },
        { text: ' with ', isRef: false, isBibleRef: false },
        { text: 'John 3:16', isRef: false, isBibleRef: true },
        { text: ' here', isRef: false, isBibleRef: false }
      ]);
    });

    it('should return empty array for null', () => {
      expect(component.getParagraphSegments(null)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(component.getParagraphSegments('')).toEqual([]);
    });
  });

  describe('onBibleRefClick', () => {
    it('should navigate to bible-verses page with encoded refs', () => {
      const router = TestBed.inject(Router);
      component.onBibleRefClick('John 3:16');
      expect(router.navigate).toHaveBeenCalledWith(
        ['/bible-verses'],
        { queryParams: { refs: 'John%203%3A16' } }
      );
    });

    it('should encode semicolons in refs', () => {
      const router = TestBed.inject(Router);
      component.onBibleRefClick('John 3:16; Romans 5:8');
      expect(router.navigate).toHaveBeenCalledWith(
        ['/bible-verses'],
        { queryParams: { refs: 'John%203%3A16%3B%20Romans%205%3A8' } }
      );
    });
  });

  describe('template rendering — Bible refs', () => {
    it('should render .bible-ref spans when EGW text contains Bible references', () => {
      component.detail = { ...mockDetail, fullTextPrimary: 'Read John 3:16 for context' };
      component.egwExpanded = true;
      fixture.detectChanges();
      const refSpans = fixture.nativeElement.querySelectorAll('.bible-ref');
      expect(refSpans.length).toBe(1);
      expect(refSpans[0].textContent).toBe('John 3:16');
    });

    it('should render multiple .bible-ref spans for multiple Bible references', () => {
      component.detail = { ...mockDetail, fullTextPrimary: 'See John 3:16 and Romans 5:8' };
      component.egwExpanded = true;
      fixture.detectChanges();
      const refSpans = fixture.nativeElement.querySelectorAll('.bible-ref');
      expect(refSpans.length).toBe(2);
      expect(refSpans[0].textContent).toBe('John 3:16');
      expect(refSpans[1].textContent).toBe('Romans 5:8');
    });

    it('should not render .bible-ref when EGW text has no Bible references', () => {
      component.detail = mockDetail;
      component.egwExpanded = true;
      fixture.detectChanges();
      const refSpans = fixture.nativeElement.querySelectorAll('.bible-ref');
      expect(refSpans.length).toBe(0);
    });

    it('should render .bible-ref spans in companion reading when secondary text has refs', async () => {
      component.detail = {
        ...mockDetail,
        hasSecondaryReading: true,
        fullTextSecondary: 'See Acts 2:38 for more'
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
      component.detail = { ...mockDetail, fullTextBible: 'In the beginning God created the heavens and the earth.', fullTextPrimary: 'Read John 3:16 for context. [1.1] Extra text.', fullTextSecondary: 'Another passage.' };
      component.bibleExpanded = true;
      component.egwExpanded = true;
      component.secondaryExpanded = true;
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

    it('should call toggleRead with bible when Bible audio icon clicked', () => {
      const spy = jest.spyOn(component, 'toggleRead');
      const headers = fixture.nativeElement.querySelectorAll('.section-card');
      const bibleIcon = headers[0].querySelector('.audio-icon');
      bibleIcon.click();
      expect(spy).toHaveBeenCalledWith('bible');
    });

    it('should call toggleRead with primary when EGW audio icon clicked', () => {
      const spy = jest.spyOn(component, 'toggleRead');
      const headers = fixture.nativeElement.querySelectorAll('.section-card');
      const egwIcon = headers[1].querySelector('.audio-icon');
      egwIcon.click();
      expect(spy).toHaveBeenCalledWith('primary');
    });

    it('should read fullTextBible as segmented groups when toggleRead(\'bible\') is called', () => {
      const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
      component.toggleRead('bible');
      expect(speakSegmentsSpy).toHaveBeenCalledWith(
        ['In the beginning God created the heavens and the earth.'],
        expect.any(Function)
      );
    });

    it('should read EGW text as segmented groups when toggleRead(\'primary\') is called', () => {
      const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
      component.toggleRead('primary');
      expect(speakSegmentsSpy).toHaveBeenCalledWith(
        ['Read', 'for context.', 'Extra text.'],
        expect.any(Function)
      );
    });

    it('should read companion text as segmented groups when toggleRead(\'secondary\') is called', () => {
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

    describe('buildParagraphGroups', () => {
      it('should group consecutive prose segments with refs as boundaries', () => {
        const segments = component.getParagraphSegments('Some text [1.1] more text');
        const { groups, segmentToGroup } = component.buildParagraphGroups(segments);
        expect(groups).toEqual(['Some text', 'more text']);
        expect(segmentToGroup).toEqual([0, null, 1]);
      });

      it('should make each prose segment its own group and attach Bible refs to preceding group', () => {
        const segments = component.getParagraphSegments('See John 3:16 for context');
        const { groups, segmentToGroup } = component.buildParagraphGroups(segments);
        expect(groups).toEqual(['See', 'for context']);
        expect(segmentToGroup).toEqual([0, 0, 1]);
      });

      it('should split by paragraph refs and assign each prose span its own group', () => {
        const segments = component.getParagraphSegments('Read John 3:16 here [1.1] more');
        const { groups, segmentToGroup } = component.buildParagraphGroups(segments);
        expect(groups).toEqual(['Read', 'here', 'more']);
        expect(segmentToGroup).toEqual([0, 0, 1, null, 2]);
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

      it('should call scrollToActiveHighlight when onGroup callback fires for primary', () => {
        const scrollSpy = jest.spyOn(component as any, 'scrollToActiveHighlight');
        const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
        component.toggleRead('primary');
        const onGroup = speakSegmentsSpy.mock.calls[0][1];
        (onGroup as (i: number) => void)(0);
        expect(scrollSpy).toHaveBeenCalled();
      });

      it('should call scrollToActiveHighlight when onGroup callback fires for secondary', () => {
        component.detail = { ...mockDetail, fullTextPrimary: 'First paragraph [1.1] Second paragraph', fullTextSecondary: 'Another passage.' };
        component.secondaryExpanded = true;
        const scrollSpy = jest.spyOn(component as any, 'scrollToActiveHighlight');
        const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
        component.toggleRead('secondary');
        const onGroup = speakSegmentsSpy.mock.calls[0][1];
        (onGroup as (i: number) => void)(0);
        expect(scrollSpy).toHaveBeenCalled();
      });

      it('should set bibleSegmentToGroup on toggleRead(\'bible\')', () => {
        component.detail = {
          ...mockDetail,
          fullTextBible: 'Acts 13:3\n\nFirst verse\n\nSecond verse\n\nActs 13:4\n\nThird verse'
        };
        component.toggleRead('bible');
        expect(component.bibleSegmentToGroup).toEqual([0, 1, 2]);
      });

      it('should update activeProseGroup via onGroup callback for bible', () => {
        const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
        component.toggleRead('bible');
        const onGroup = speakSegmentsSpy.mock.calls[0][1];
        expect(onGroup).toBeInstanceOf(Function);
        (onGroup as (i: number) => void)(0);
        expect(component.activeProseGroup).toBe(0);
      });

      it('should reset bibleSegmentToGroup when toggling off Bible audio', () => {
        component.toggleRead('bible');
        expect(component.bibleSegmentToGroup).not.toBeNull();
        component.toggleRead('bible');
        expect(component.bibleSegmentToGroup).toBeNull();
      });

      it('should reset bibleSegmentToGroup when collapsing Bible section while reading', () => {
        component.toggleRead('bible');
        expect(component.bibleSegmentToGroup).not.toBeNull();
        component.toggleSection('bible');
        expect(component.bibleSegmentToGroup).toBeNull();
      });

      it('should reset bibleSegmentToGroup on ionViewWillLeave', () => {
        component.toggleRead('bible');
        expect(component.bibleSegmentToGroup).not.toBeNull();
        component.ionViewWillLeave();
        expect(component.bibleSegmentToGroup).toBeNull();
      });

      it('should reset bibleSegmentToGroup on TTS idle state', () => {
        component.toggleRead('bible');
        expect(component.bibleSegmentToGroup).not.toBeNull();
        (component['ttsService'] as any).stateSubject.next('idle');
        expect(component.bibleSegmentToGroup).toBeNull();
      });
    });

    describe('buildBibleGroups', () => {
      it('should group verses into one group per verse block when sections exist', () => {
        component.detail = {
          ...mockDetail,
          fullTextBible: 'Acts 13:3\n\nFirst verse\n\nSecond verse\n\nActs 13:4\n\nThird verse'
        };
        const { groups, segmentToGroup } = component.buildBibleGroups();
        expect(groups).toEqual(['First verse', 'Second verse', 'Third verse']);
        expect(segmentToGroup).toEqual([0, 1, 2]);
      });

      it('should produce a single group for plain text without section titles', () => {
        component.detail = { ...mockDetail, fullTextBible: 'And when they had fasted and prayed...' };
        const { groups, segmentToGroup } = component.buildBibleGroups();
        expect(groups).toEqual(['And when they had fasted and prayed...']);
        expect(segmentToGroup).toEqual([0]);
      });

      it('should return empty groups when no Bible text exists', () => {
        component.detail = { ...mockDetail, fullTextBible: '' };
        const { groups, segmentToGroup } = component.buildBibleGroups();
        expect(groups).toEqual([]);
        expect(segmentToGroup).toEqual([]);
      });
    });

    describe('getBibleVerseIndex', () => {
      beforeEach(() => {
        component.detail = {
          ...mockDetail,
          fullTextBible: 'Acts 13:3\n\nFirst verse\n\nSecond verse\n\nActs 13:4\n\nThird verse'
        };
      });

      it('should return flat index within a section', () => {
        expect(component.getBibleVerseIndex('Acts 13:3', 1)).toBe(1);
        expect(component.getBibleVerseIndex('Acts 13:4', 0)).toBe(2);
      });

      it('should return -1 for unknown section title', () => {
        expect(component.getBibleVerseIndex('Unknown 1:1', 0)).toBe(-1);
      });
    });

    describe('bible active-highlight template rendering', () => {
      beforeEach(() => {
        component.detail = mockDetail;
        component.readingSection = null;
      });

      it('should not highlight any verse span when not reading bible', () => {
        fixture.detectChanges();
        const highlighted = fixture.nativeElement.querySelectorAll('.bible-text .active-highlight');
        expect(highlighted.length).toBe(0);
      });

      it('should render .active-highlight on Bible verse spans when reading bible', () => {
        component.toggleRead('bible');
        fixture.detectChanges();
        const highlighted = fixture.nativeElement.querySelectorAll('.bible-text .active-highlight');
        expect(highlighted.length).toBeGreaterThanOrEqual(1);
      });

      it('should highlight correct verse when onGroup fires for specific index', () => {
        const speakSegmentsSpy = jest.spyOn(component['ttsService'], 'speakSegments');
        component.detail = { ...mockDetail, fullTextBible: 'First verse\nSecond verse' };
        component.toggleRead('bible');
        const onGroup = speakSegmentsSpy.mock.calls[0][1];
        (onGroup as (i: number) => void)(1);
        fixture.detectChanges();
        const bibleTextDiv = fixture.nativeElement.querySelector('.bible-text');
        const spans = bibleTextDiv.querySelectorAll('span');
        expect(spans[1].classList.contains('active-highlight')).toBe(true);
        expect(spans[0].classList.contains('active-highlight')).toBe(false);
      });

      it('should remove .active-highlight when toggling bible audio off', () => {
        component.detail = { ...mockDetail, fullTextBible: 'First verse\nSecond verse' };
        fixture.detectChanges();
        component.toggleRead('bible');
        component.activeProseGroup = 0;
        fixture.detectChanges();
        component.toggleRead('bible');
        fixture.detectChanges();
        const highlighted = fixture.nativeElement.querySelectorAll('.bible-text .active-highlight');
        expect(highlighted.length).toBe(0);
      });
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

      it('should stop TTS for secondary section when collapsing companion panel', () => {
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
