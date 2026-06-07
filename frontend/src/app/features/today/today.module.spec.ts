import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
