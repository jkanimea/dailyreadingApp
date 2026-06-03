import { TestBed } from '@angular/core/testing';
import { ProgressService } from './progress.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProgressDto } from '../models/progress.model';
import { JournalEntryDto } from '../models/journal-entry.model';

describe('ProgressService', () => {
  let service: ProgressService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProgressService]
    });
    service = TestBed.inject(ProgressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getSeriesProgress should call correct endpoint', () => {
    service.getSeriesProgress(1).subscribe();
    const req = httpMock.expectOne('/api/v1/progress/series/1');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getReadingProgress should GET correct endpoint', () => {
    const mock: ProgressDto = {
      readingId: 5, seriesId: 2, isCompleted: true,
      month: 3, day: 15, bibleReading: 'Mark 1', notes: 'Good chapter'
    };
    service.getReadingProgress(5).subscribe(result => {
      expect(result.notes).toBe('Good chapter');
    });
    const req = httpMock.expectOne('/api/v1/progress/5');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('getStreak should call correct endpoint', () => {
    service.getStreak(2).subscribe(n => expect(n).toBe(5));
    const req = httpMock.expectOne('/api/v1/progress/series/2/streak');
    req.flush(5);
  });

  it('getCompletionPercentage should call correct endpoint', () => {
    service.getCompletionPercentage(3).subscribe(p => expect(p).toBe(75));
    const req = httpMock.expectOne('/api/v1/progress/series/3/percentage');
    req.flush(75);
  });

  it('markComplete should POST', () => {
    service.markComplete(10).subscribe();
    const req = httpMock.expectOne('/api/v1/progress/10/complete');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('unmarkComplete should DELETE', () => {
    service.unmarkComplete(10).subscribe();
    const req = httpMock.expectOne('/api/v1/progress/10/complete');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('saveNotes should PUT to correct endpoint with notes body', () => {
    const mockResponse: ProgressDto | null = {
      readingId: 1, seriesId: 2, isCompleted: true,
      month: 3, day: 15, bibleReading: 'Mark 1:1', notes: 'Great reading'
    };

    service.saveNotes(1, 'Great reading').subscribe(result => {
      expect(result!.notes).toBe('Great reading');
    });

    const req = httpMock.expectOne('/api/v1/progress/1/notes');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ notes: 'Great reading' });
    req.flush(mockResponse);
  });

  it('getJournal should GET correct endpoint', () => {
    const entries: JournalEntryDto[] = [
      { readingId: 1, seriesId: 2, seriesName: 'Christ The Way',
        month: 1, day: 5, bibleReading: 'Mark 1:1', primaryBookPageRange: 'DA 1-5',
        isCompleted: true, notes: 'Great insight' }
    ];

    service.getJournal(2).subscribe(result => {
      expect(result.length).toBe(1);
      expect(result[0].notes).toBe('Great insight');
    });

    const req = httpMock.expectOne('/api/v1/progress/series/2/journal');
    expect(req.request.method).toBe('GET');
    req.flush(entries);
  });

  it('summarizeNotes should POST to correct endpoint with notes body', () => {
    service.summarizeNotes(1, 'My notes to summarize').subscribe(result => {
      expect(result.summary).toBe('Condensed summary');
    });

    const req = httpMock.expectOne('/api/v1/progress/1/summarize');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ notes: 'My notes to summarize' });
    req.flush({ summary: 'Condensed summary' });
  });
});
