import { TestBed } from '@angular/core/testing';
import { ReadingService } from './reading.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('ReadingService', () => {
  let service: ReadingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReadingService]
    });
    service = TestBed.inject(ReadingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getToday should call correct endpoint without date params', () => {
    service.getToday(1).subscribe(r => expect(r.bibleReading).toBe('John 3:16'));
    const req = httpMock.expectOne('/api/v1/reading/series/1/today');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ id: 1, seriesId: 1, bibleReading: 'John 3:16' });
  });

  it('getToday should pass month and day query params when provided', () => {
    service.getToday(2, 5, 21).subscribe();
    const req = httpMock.expectOne(r =>
      r.url.includes('/reading/series/2/today') &&
      r.params.get('month') === '5' &&
      r.params.get('day') === '21'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ id: 10, seriesId: 2 });
  });

  it('getByDate should call correct endpoint', () => {
    service.getByDate(2, 12, 25).subscribe();
    const req = httpMock.expectOne('/api/v1/reading/series/2/date/12/25');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getByMonth should call correct endpoint', () => {
    service.getByMonth(3, 6).subscribe();
    const req = httpMock.expectOne('/api/v1/reading/series/3/month/6');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getFullReading should call correct endpoint', () => {
    service.getFullReading(42).subscribe(r => expect(r.fullTextPrimary).toBe('text'));
    const req = httpMock.expectOne('/api/v1/reading/42/full');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 42, fullTextPrimary: 'text' });
  });

  it('getSummary should call correct endpoint', () => {
    service.getSummary(7).subscribe(r => expect(r.summaryPoints).toBe('summary'));
    const req = httpMock.expectOne('/api/v1/reading/7/summary');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 7, summaryPoints: 'summary' });
  });
});
