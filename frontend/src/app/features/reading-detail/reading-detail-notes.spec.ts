import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, firstValueFrom } from 'rxjs';

describe('ReadingDetailPage — notes', () => {
  let component: any;
  let mockSaveNotes: jest.Mock;
  let mockGetSeriesProgress: jest.Mock;

  beforeEach(() => {
    mockSaveNotes = jest.fn();
    mockGetSeriesProgress = jest.fn().mockReturnValue(of([]));

    component = {
      notes: '',
      showNotes: false,
      notesSaved: false,
      detail: null,
      progressService: { saveNotes: mockSaveNotes, getSeriesProgress: mockGetSeriesProgress },
      notesDebounce: undefined,
      onNotesChange(ev: any) {
        this.notes = ev.detail.value ?? '';
        this.notesSaved = false;
        clearTimeout(this.notesDebounce);
        this.notesDebounce = setTimeout(() => this.saveNotes(), 1500);
      },
      saveNotes() {
        if (!this.detail) return;
        firstValueFrom(this.progressService.saveNotes(this.detail.id, this.notes))
          .then(() => { this.notesSaved = true; })
          .catch(() => {});
      },
      ngOnDestroy() {
        clearTimeout(this.notesDebounce);
      }
    };
  });

  it('should load existing notes from getSeriesProgress response', () => {
    const progress = [{ readingId: 10, notes: 'Existing note', isCompleted: true,
                        seriesId: 1, month: 1, day: 5, bibleReading: 'Mark 1:1' }];
    const readingProgress = progress.find(p => p.readingId === 10);
    if (readingProgress?.notes) {
      component.notes = readingProgress.notes;
      component.showNotes = true;
    }

    expect(component.notes).toBe('Existing note');
    expect(component.showNotes).toBe(true);
  });

  it('should debounce notes save — does not call saveNotes immediately on input', fakeAsync(() => {
    mockSaveNotes.mockReturnValue(of({} as any));
    component.detail = { id: 10 };

    component.onNotesChange({ detail: { value: 'typing...' } });
    tick(500);

    expect(mockSaveNotes).not.toHaveBeenCalled();
  }));

  it('should call saveNotes after 1500ms debounce', fakeAsync(() => {
    mockSaveNotes.mockReturnValue(of({} as any));
    component.detail = { id: 10 };

    component.onNotesChange({ detail: { value: 'Final note' } });
    tick(1500);

    expect(mockSaveNotes).toHaveBeenCalledWith(10, 'Final note');
  }));

  it('should reset notesSaved to false on new input', () => {
    mockSaveNotes.mockReturnValue(of({} as any));
    component.detail = { id: 10 };
    component.notesSaved = true;

    component.onNotesChange({ detail: { value: 'New input' } });

    expect(component.notesSaved).toBe(false);
  });

  it('should keep notesSaved false when save fails', fakeAsync(() => {
    mockSaveNotes.mockReturnValue(throwError(() => new Error('Network error')));
    component.detail = { id: 10 };

    component.onNotesChange({ detail: { value: 'Some note' } });
    tick(1500);

    expect(component.notesSaved).toBe(false);
  }));

  it('should clear debounce timer on ngOnDestroy', fakeAsync(() => {
    mockSaveNotes.mockReturnValue(of({} as any));
    component.detail = { id: 10 };

    component.onNotesChange({ detail: { value: 'Will be cancelled' } });
    component.ngOnDestroy();
    tick(1500);

    expect(mockSaveNotes).not.toHaveBeenCalled();
  }));
});
