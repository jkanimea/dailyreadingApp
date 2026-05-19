import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SecureStorageService } from './secure-storage.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let secureStorage: any;

  beforeEach(() => {
    secureStorage = {
      getToken: jest.fn().mockResolvedValue('mock-token'),
      getRefreshToken: jest.fn().mockResolvedValue('mock-refresh'),
      setTokens: jest.fn().mockResolvedValue(undefined),
      clearTokens: jest.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: SecureStorageService, useValue: secureStorage }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should login with provider and return tokens', () => {
    service.login('google', 'google-token').subscribe(res => {
      expect(res.accessToken).toBe('jwt-123');
    });

    const req = httpMock.expectOne('https://localhost:5001/api/v1/auth/google');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'google-token' });
    req.flush({ accessToken: 'jwt-123', refreshToken: 'rt-123' });
  });

  it('should refresh access token', () => {
    service.refreshAccessToken('rt-old').subscribe(res => {
      expect(res.accessToken).toBe('jwt-new');
    });

    const req = httpMock.expectOne('https://localhost:5001/api/v1/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'rt-old' });
    req.flush({ accessToken: 'jwt-new', refreshToken: 'rt-new' });
  });

  it('should get current user', () => {
    service.getCurrentUser().subscribe(user => expect(user.displayName).toBe('Test User'));

    const req = httpMock.expectOne('https://localhost:5001/api/v1/auth/me');
    expect(req.request.method).toBe('GET');
    req.flush({ id: '1', displayName: 'Test User', email: 'test@example.com' });
  });

  it('isAuthenticated should return true when token exists', async () => {
    const result = await service.isAuthenticated();
    expect(result).toBe(true);
    expect(secureStorage.getToken).toHaveBeenCalled();
  });

  it('isAuthenticated should return false when no token', async () => {
    secureStorage.getToken.mockResolvedValue(null);
    const result = await service.isAuthenticated();
    expect(result).toBe(false);
  });

  it('logout should clear tokens and POST', () => {
    service.logout().subscribe();

    const req = httpMock.expectOne('https://localhost:5001/api/v1/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(secureStorage.clearTokens).toHaveBeenCalled();
  });
});
