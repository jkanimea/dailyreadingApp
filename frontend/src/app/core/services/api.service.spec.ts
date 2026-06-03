import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';
import { ApiError } from '../errors/api-error';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should GET from the correct URL', () => {
    service.get<string>('/test').subscribe(res => expect(res).toBe('ok'));
    const req = httpMock.expectOne('/api/v1/test');
    expect(req.request.method).toBe('GET');
    req.flush('ok');
  });

  it('should POST to the correct URL with body', () => {
    service.post<{ id: number }>('/test', { name: 'foo' }).subscribe(res => expect(res.id).toBe(1));
    const req = httpMock.expectOne('/api/v1/test');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'foo' });
    req.flush({ id: 1 });
  });

  it('should PUT to the correct URL with body', () => {
    service.put<{ ok: boolean }>('/test/1', { name: 'bar' }).subscribe(res => expect(res.ok).toBe(true));
    const req = httpMock.expectOne('/api/v1/test/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ ok: true });
  });

  it('should DELETE from the correct URL', () => {
    service.delete<void>('/test/1').subscribe();
    const req = httpMock.expectOne('/api/v1/test/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should pass HttpParams as query string', () => {
    const params = new HttpParams().set('q', 'faith').set('page', '1');
    service.get('/search', params).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/search');
    expect(req.request.params.get('q')).toBe('faith');
    expect(req.request.params.get('page')).toBe('1');
    req.flush([]);
  });

  describe('error handling', () => {
    it('should map 404 HttpErrorResponse to ApiError', (done) => {
      service.get('/not-found').subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(ApiError);
          expect((err as ApiError).statusCode).toBe(404);
          done();
        }
      });
      const req = httpMock.expectOne('/api/v1/not-found');
      req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should map 500 HttpErrorResponse to ApiError with server message', (done) => {
      service.post('/fail', {}).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(ApiError);
          expect((err as ApiError).statusCode).toBe(500);
          expect((err as ApiError).message).toBe('Internal server error');
          done();
        }
      });
      const req = httpMock.expectOne('/api/v1/fail');
      req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Server Error' });
    });

    it('should map DELETE 403 to ApiError', (done) => {
      service.delete('/protected').subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(ApiError);
          expect((err as ApiError).statusCode).toBe(403);
          done();
        }
      });
      const req = httpMock.expectOne('/api/v1/protected');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });
});
