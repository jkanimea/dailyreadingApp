import { TestBed } from '@angular/core/testing';
import { ProgressService } from './progress.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

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
    const req = httpMock.expectOne('http://localhost:5000/api/v1/progress/series/1');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getStreak should call correct endpoint', () => {
    service.getStreak(2).subscribe(n => expect(n).toBe(5));
    const req = httpMock.expectOne('http://localhost:5000/api/v1/progress/series/2/streak');
    req.flush(5);
  });

  it('getCompletionPercentage should call correct endpoint', () => {
    service.getCompletionPercentage(3).subscribe(p => expect(p).toBe(75));
    const req = httpMock.expectOne('http://localhost:5000/api/v1/progress/series/3/percentage');
    req.flush(75);
  });

  it('markComplete should POST', () => {
    service.markComplete(10).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/api/v1/progress/10/complete');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('unmarkComplete should DELETE', () => {
    service.unmarkComplete(10).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/api/v1/progress/10/complete');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
