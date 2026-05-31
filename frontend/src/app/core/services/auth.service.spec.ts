import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SecureStorageService } from './secure-storage.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TokenResponse, UserDto } from '../models/user.model';

const mockUser: UserDto = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  provider: 'google',
  selectedSeriesId: 1,
  role: 'User'
};

const mockTokenResponse: TokenResponse = {
  accessToken: 'jwt-123',
  refreshToken: 'rt-123',
  expiresIn: 3600,
  user: mockUser
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let secureStorage: any;

  beforeEach(() => {
    secureStorage = {
      getToken: jest.fn().mockResolvedValue('mock-token'),
      getRefreshToken: jest.fn().mockResolvedValue('mock-refresh'),
      setTokens: jest.fn().mockResolvedValue(undefined),
      clearTokens: jest.fn().mockReturnValue(Promise.resolve(undefined))
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

    const req = httpMock.expectOne('/api/v1/auth/google');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idToken: 'google-token' });
    req.flush({ accessToken: 'jwt-123', refreshToken: 'rt-123' });
  });

  it('should refresh access token', () => {
    service.refreshAccessToken('rt-old').subscribe(res => {
      expect(res.accessToken).toBe('jwt-new');
    });

    const req = httpMock.expectOne('/api/v1/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'rt-old' });
    req.flush({ accessToken: 'jwt-new', refreshToken: 'rt-new' });
  });

  it('should get current user', () => {
    service.getCurrentUser().subscribe(user => expect(user.displayName).toBe('Test User'));

    const req = httpMock.expectOne('/api/v1/auth/me');
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

  it('logout should clear tokens and POST', async () => {
    secureStorage.clearTokens = jest.fn().mockReturnValue(Promise.resolve(undefined));
    const promise = service.logout();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const req = httpMock.expectOne('/api/v1/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush(null);

    await promise;
    expect(secureStorage.clearTokens).toHaveBeenCalled();
  });

  describe('user$ reactive state', () => {
    it('should emit user from TokenResponse after storeTokens', async () => {
      const emitted: (UserDto | null)[] = [];
      service.user$.subscribe(u => emitted.push(u));

      await service.storeTokens(mockTokenResponse);

      const last = emitted[emitted.length - 1];
      expect(last).toEqual(mockUser);
      expect(service.currentUser).toEqual(mockUser);
    });

    it('should emit null after guestLogin', async () => {
      // First set a real user
      await service.storeTokens(mockTokenResponse);
      expect(service.currentUser).toEqual(mockUser);

      // Guest login should clear it
      await service.guestLogin();
      expect(service.currentUser).toBeNull();
    });

    it('should emit null immediately after logout before network call', async () => {
      await service.storeTokens(mockTokenResponse);

      const nullEmitted = new Promise<boolean>(resolve => {
        service.user$.subscribe(u => { if (u === null) resolve(true); });
      });

      const logoutPromise = service.logout();
      const wasNull = await nullEmitted;
      expect(wasNull).toBe(true);

      // Flush the logout HTTP request
      const req = httpMock.expectOne('/api/v1/auth/logout');
      req.flush(null);
      await logoutPromise;
    });

    it('currentUser should return the latest emitted value synchronously', async () => {
      await service.storeTokens(mockTokenResponse);
      expect(service.currentUser?.displayName).toBe('Test User');

      await service.guestLogin();
      expect(service.currentUser).toBeNull();
    });

    it('storeTokens should handle missing user field gracefully', async () => {
      const responseWithoutUser = { ...mockTokenResponse, user: undefined as any };
      await service.storeTokens(responseWithoutUser);
      expect(service.currentUser).toBeNull();
    });
  });

  describe('isGuest', () => {
    it('should return false when token is a real JWT', async () => {
      secureStorage.getToken.mockResolvedValue('real.jwt.token');
      expect(await service.isGuest()).toBe(false);
    });

    it('should return true when token starts with guest-', async () => {
      secureStorage.getToken.mockResolvedValue('guest-token-12345');
      expect(await service.isGuest()).toBe(true);
    });

    it('should return true when no token', async () => {
      secureStorage.getToken.mockResolvedValue(null);
      expect(await service.isGuest()).toBe(true);
    });
  });

  describe('getUserFromToken', () => {
    it('should return null for guest token', async () => {
      secureStorage.getToken.mockResolvedValue('guest-token-abc');
      expect(await service.getUserFromToken()).toBeNull();
    });

    it('should return null for invalid JWT format', async () => {
      secureStorage.getToken.mockResolvedValue('not.a.valid.jwt.format.extra');
      expect(await service.getUserFromToken()).toBeNull();
    });

    it('should decode claims from a valid JWT', async () => {
      const payload = {
        nameid: '42',
        email: 'decoded@example.com',
        unique_name: 'Decoded User',
        provider: 'facebook',
        role: 'Admin'
      };
      const encoded = btoa(JSON.stringify(payload));
      secureStorage.getToken.mockResolvedValue(`header.${encoded}.signature`);

      const user = await service.getUserFromToken();
      expect(user?.id).toBe(42);
      expect(user?.email).toBe('decoded@example.com');
      expect(user?.displayName).toBe('Decoded User');
      expect(user?.provider).toBe('facebook');
      expect(user?.role).toBe('Admin');
    });
  });
});
