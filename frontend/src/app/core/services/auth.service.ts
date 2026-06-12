import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, BehaviorSubject } from 'rxjs';
import { TokenResponse, UserDto } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { SecureStorageService } from './secure-storage.service';
import { LoggingService } from './logging.service';

const GUEST_ID_KEY = 'encounter_guest_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private secureStorage = inject(SecureStorageService);
  private loggingService = inject(LoggingService);

  private readonly apiUrl = environment.apiUrl;
  private cachedRole: string | null = null;

  private _user$ = new BehaviorSubject<UserDto | null>(null);
  readonly user$ = this._user$.asObservable();
  get currentUser(): UserDto | null { return this._user$.value; }

  constructor() {
    this.initUserFromToken();
  }

  private async initUserFromToken(): Promise<void> {
    const user = await this.getUserFromToken();
    this._user$.next(user);
  }

  login(provider: 'google' | 'facebook', idToken: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/${provider}`, { idToken });
  }

  refreshAccessToken(refreshToken: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/refresh`, { refreshToken });
  }

  getCurrentUser(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/auth/me`);
  }

  isAuthenticated(): Promise<boolean> {
    return this.secureStorage.getToken().then(
      t => !!t,
      () => false
    );
  }

  async getRole(): Promise<string | null> {
    if (this.cachedRole) return this.cachedRole;
    const token = await this.secureStorage.getToken().catch(() => null);
    if (!token || token.startsWith('guest-')) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      this.cachedRole = payload['role'] ?? null;
      return this.cachedRole;
    } catch (e: unknown) {
      this.loggingService.error('AuthService', 'getRole', String(e));
      return null;
    }
  }

  async isAdmin(): Promise<boolean> {
    const role = await this.getRole();
    return role === 'Admin';
  }

  clearRoleCache(): void {
    this.cachedRole = null;
  }

  /** Reads user info directly from the stored JWT claims — no network call needed. */
  async getUserFromToken(): Promise<UserDto | null> {
    const token = await this.secureStorage.getToken().catch(() => null);
    if (!token || token.startsWith('guest-')) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return {
        id: parseInt(payload['nameid'] ?? '0', 10),
        email: payload['email'] ?? '',
        displayName: payload['unique_name'] ?? payload['name'] ?? '',
        provider: payload['provider'] ?? '',
        selectedSeriesId: 1,
        role: payload['role'] ?? 'User'
      };
    } catch (e: unknown) {
      this.loggingService.error('AuthService', 'getUserFromToken', String(e));
      return null;
    }
  }

  async isGuest(): Promise<boolean> {
    const token = await this.secureStorage.getToken().catch(() => null);
    return !token || token.startsWith('guest-');
  }

  async storeTokens(response: TokenResponse): Promise<void> {
    this.clearRoleCache();
    await this.secureStorage.setTokens(response.accessToken, response.refreshToken);
    this._user$.next(response.user ?? null);
  }

  async guestLogin(): Promise<void> {
    this.cachedRole = null;
    const guestId = localStorage.getItem(GUEST_ID_KEY) || String(Date.now());
    localStorage.setItem(GUEST_ID_KEY, guestId);
    await this.secureStorage.setTokens('guest-token-' + guestId, 'guest-refresh-' + guestId);
    this._user$.next(null);
  }

  async logout(): Promise<void> {
    this.cachedRole = null;
    const refreshToken = await this.secureStorage.getRefreshToken().catch(() => null);
    await this.secureStorage.clearTokens();
    this._user$.next(null);
    if (refreshToken && !refreshToken.startsWith('guest-')) {
      try {
        await firstValueFrom(this.http.post<void>(`${this.apiUrl}/auth/logout`, { refreshToken }));
      } catch (e: unknown) {
        this.loggingService.error('AuthService', 'logout', String(e));
      }
    }
  }
}
