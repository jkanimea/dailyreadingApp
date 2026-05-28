import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';

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
});
