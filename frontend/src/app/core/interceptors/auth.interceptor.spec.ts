import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { SecureStorageService } from '../services/secure-storage.service';
import { LoggingService } from '../services/logging.service';
import { TokenResponse } from '../models/user.model';

/** Flush all pending microtasks (awaited promises) so the async interceptor chain settles. */
const drainMicrotasks = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let secureStorage: {
    getToken: jest.Mock;
    getRefreshToken: jest.Mock;
    setTokens: jest.Mock;
    clearTokens: jest.Mock;
  };
  let authService: { refreshAccessToken: jest.Mock };
  let logging: { error: jest.Mock; warn: jest.Mock; info: jest.Mock; debug: jest.Mock; log: jest.Mock };

  beforeEach(() => {
    secureStorage = {
      getToken: jest.fn().mockResolvedValue('access-token'),
      getRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
      setTokens: jest.fn().mockResolvedValue(undefined),
      clearTokens: jest.fn().mockResolvedValue(undefined)
    };
    authService = { refreshAccessToken: jest.fn() };
    logging = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), log: jest.fn() };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: AuthService, useValue: authService },
        { provide: SecureStorageService, useValue: secureStorage },
        { provide: LoggingService, useValue: logging }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass /auth/ requests through without a token or refresh', () => {
    http.get('/api/v1/auth/me').subscribe();

    const req = httpMock.expectOne('/api/v1/auth/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});

    expect(secureStorage.getToken).not.toHaveBeenCalled();
    expect(authService.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('should pass POST /logs through without a token (anonymous log submission)', () => {
    http.post('/api/v1/logs', []).subscribe();

    const req = httpMock.expectOne('/api/v1/logs');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ received: 0 });

    expect(secureStorage.getToken).not.toHaveBeenCalled();
  });

  it('should still attach a token to admin GET /logs', async () => {
    http.get('/api/v1/logs').subscribe();
    await drainMicrotasks();

    const req = httpMock.expectOne('/api/v1/logs');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-token');
    req.flush({});
  });

  it('should attach a bearer token to normal requests', async () => {
    http.get('/api/v1/reading/1').subscribe();
    await drainMicrotasks();

    const req = httpMock.expectOne('/api/v1/reading/1');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-token');
    req.flush({});
  });

  it('should refresh and retry on 401 without logging an error', async () => {
    authService.refreshAccessToken.mockReturnValue(
      of({ accessToken: 'new-token', refreshToken: 'new-rt' } as TokenResponse)
    );

    let received: unknown;
    http.get('/api/v1/reading/1').subscribe(r => (received = r));
    await drainMicrotasks();

    const req1 = httpMock.expectOne('/api/v1/reading/1');
    expect(req1.request.headers.get('Authorization')).toBe('Bearer access-token');
    req1.flush({}, { status: 401, statusText: 'Unauthorized' });
    await drainMicrotasks();

    const req2 = httpMock.expectOne('/api/v1/reading/1');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer new-token');
    req2.flush({ ok: true });
    await drainMicrotasks();

    expect(received).toEqual({ ok: true });
    expect(secureStorage.setTokens).toHaveBeenCalledWith('new-token', 'new-rt');
    expect(logging.error).not.toHaveBeenCalled();
    expect(logging.warn).not.toHaveBeenCalled();
  });

  it('should log a warning and not retry when refresh returns no tokens', async () => {
    authService.refreshAccessToken.mockReturnValue(of({} as TokenResponse));

    let err: unknown;
    http.get('/api/v1/reading/1').subscribe({ error: e => (err = e) });
    await drainMicrotasks();

    const req1 = httpMock.expectOne('/api/v1/reading/1');
    req1.flush({}, { status: 401, statusText: 'Unauthorized' });
    await drainMicrotasks();

    expect(err).toBeDefined();
    expect(logging.warn).toHaveBeenCalled();
    expect(logging.error).not.toHaveBeenCalled();
  });

  it('should log non-401 errors as error', async () => {
    http.get('/api/v1/reading/1').subscribe({ error: () => {} });
    await drainMicrotasks();

    const req = httpMock.expectOne('/api/v1/reading/1');
    req.flush({}, { status: 500, statusText: 'Server Error' });
    await drainMicrotasks();

    expect(logging.error).toHaveBeenCalled();
    expect(logging.warn).not.toHaveBeenCalled();
  });
});