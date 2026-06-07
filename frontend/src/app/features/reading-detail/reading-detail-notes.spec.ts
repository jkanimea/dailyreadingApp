import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonicModule, AlertController, NavController } from '@ionic/angular';
import { BehaviorSubject, of, throwError, firstValueFrom } from 'rxjs';
import { ReadingService } from '../../core/services/reading.service';
import { ProgressService } from '../../core/services/progress.service';
import { SeriesService } from '../../core/services/series.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { ReadingDetailPage } from './reading-detail.module';
import { SharedModule } from '../../shared/shared.module';
import { AuthService } from '../../core/services/auth.service';

describe('ReadingDetailPage — notes', () => {
  let component: ReadingDetailPage;
  let fixture: ComponentFixture<ReadingDetailPage>;
  let mockReadingService: any;
  let mockProgressService: any;
  let mockSeriesService: any;
  let mockPrefs: any;
  let mockRouter: any;
  let mockAlertCtrl: any;
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

    mockProgressService = {
      markComplete: jest.fn().mockReturnValue(of({ readingId: 5, isCompleted: true })),
      unmarkComplete: jest.fn().mockReturnValue(of(undefined)),
      getSeriesProgress: jest.fn().mockReturnValue(of([])),
      saveNotes: jest.fn(),
      summarizeNotes: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    mockAlertCtrl = {
      create: jest.fn().mockResolvedValue({
        present: jest.fn().mockResolvedValue(undefined)
      })
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
        { provide: AlertController, useValue: mockAlertCtrl },
        { provide: NavController, useValue: { navigateRoot: jest.fn(), push: jest.fn(), back: jest.fn() } },
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject } },
        { provide: AuthService, useValue: { user$: new BehaviorSubject(null) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingDetailPage);
    component = fixture.componentInstance;
    component.detail = mockDetail;
  });

  it('should load existing notes from getSeriesProgress response', async () => {
    const progress = [{ readingId: 5, notes: 'Existing note', isCompleted: true,
                        seriesId: 2, month: 5, day: 21, bibleReading: 'Acts 13:3' }];
    mockProgressService.getSeriesProgress.mockReturnValue(of(progress));

    await component['checkCompleted'](5);

    expect(component.notes).toBe('Existing note');
    expect(component.showNotes).toBe(true);
  });

  it('should debounce notes save — does not call saveNotes immediately on input', fakeAsync(() => {
    mockProgressService.saveNotes.mockReturnValue(of({} as any));

    component.onNotesChange({ detail: { value: 'typing...' } } as any);
    tick(500);

    expect(mockProgressService.saveNotes).not.toHaveBeenCalled();
  }));

  it('should call saveNotes after 1500ms debounce', fakeAsync(() => {
    mockProgressService.saveNotes.mockReturnValue(of({} as any));

    component.onNotesChange({ detail: { value: 'Final note' } } as any);
    tick(1500);

    expect(mockProgressService.saveNotes).toHaveBeenCalledWith(5, 'Final note');
  }));

  it('should reset notesSaved to false on new input', () => {
    mockProgressService.saveNotes.mockReturnValue(of({} as any));
    component.notesSaved = true;

    component.onNotesChange({ detail: { value: 'New input' } } as any);

    expect(component.notesSaved).toBe(false);
  });

  it('should keep notesSaved false when save fails', async () => {
    mockProgressService.saveNotes.mockReturnValue(throwError(() => new Error('Network error')));
    component.notesSaved = false;
    component.notes = 'Some note';

    await component['saveNotes']();

    expect(component.notesSaved).toBe(false);
  });

  it('debounce timer is cleared on component destroy', fakeAsync(() => {
    mockProgressService.saveNotes.mockReturnValue(of({} as any));

    component.onNotesChange({ detail: { value: 'Will be cancelled' } } as any);
    fixture.destroy();
    tick(1500);

    expect(mockProgressService.saveNotes).not.toHaveBeenCalled();
  }));

  describe('summarize', () => {
    it('should show summarize actions when notes exist and editor open', () => {
      component.notes = 'Some notes';
      component.showNotes = true;
      fixture.detectChanges();
      const btn: HTMLElement = fixture.nativeElement.querySelector('.notes-ai ion-button');
      expect(btn).toBeTruthy();
    });

    it('should not show summarize actions when notes empty', () => {
      component.showNotes = true;
      component.notes = '';
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.notes-ai');
      expect(el).toBeFalsy();
    });

    it('should call summarizeNotes with correct args', async () => {
      mockProgressService.summarizeNotes.mockReturnValue(of({ summary: 'Condensed summary' }));
      component.notes = 'My long notes text';

      await component.onSummarize();

      expect(mockProgressService.summarizeNotes).toHaveBeenCalledWith(5, 'My long notes text');
    });

    it('should show alert with summary on success', async () => {
      mockProgressService.summarizeNotes.mockReturnValue(of({ summary: 'Condensed summary' }));
      component.notes = 'My notes';

      await component.onSummarize();

      expect(mockAlertCtrl.create).toHaveBeenCalledWith(expect.objectContaining({
        header: 'AI Summary',
        message: 'Condensed summary'
      }));
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

    it('should set summarizing to true during API call and false after', async () => {
      mockProgressService.summarizeNotes.mockReturnValue(of({ summary: 'S' }));
      component.notes = 'Notes';

      const promise = component.onSummarize();
      expect(component.summarizing).toBe(true);
      await promise;
      expect(component.summarizing).toBe(false);
    });

    it('should do nothing if detail is null', async () => {
      component.detail = null as any;
      component.notes = 'Notes';

      await component.onSummarize();

      expect(mockProgressService.summarizeNotes).not.toHaveBeenCalled();
    });

    it('should do nothing if notes is empty', async () => {
      component.notes = '';

      await component.onSummarize();

      expect(mockProgressService.summarizeNotes).not.toHaveBeenCalled();
    });

    it('should replace notes with summary and save on "Replace Notes"', async () => {
      mockProgressService.saveNotes.mockReturnValue(of({} as any));
      component.notes = 'Original notes';
      component.detail = mockDetail;

      await component['replaceNotesWithSummary']('Replaced summary');

      expect(component.notes).toBe('Replaced summary');
      expect(mockProgressService.saveNotes).toHaveBeenCalledWith(5, 'Replaced summary');
    });
  });
});
