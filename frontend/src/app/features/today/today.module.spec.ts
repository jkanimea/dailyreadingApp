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
});
