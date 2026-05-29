import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { TokenResponse, UserDto } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { SecureStorageService } from './secure-storage.service';

const GUEST_ID_KEY = 'encounter_guest_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private cachedRole: string | null = null;

  constructor(
    private http: HttpClient,
    private secureStorage: SecureStorageService
  ) {}

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
    } catch {
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

  async guestLogin(): Promise<void> {
    this.cachedRole = null;
    const guestId = localStorage.getItem(GUEST_ID_KEY) || String(Date.now());
    localStorage.setItem(GUEST_ID_KEY, guestId);
    await this.secureStorage.setTokens('guest-token-' + guestId, 'guest-refresh-' + guestId);
  }

  async logout(): Promise<void> {
    this.cachedRole = null;
    await this.secureStorage.clearTokens();
    try {
      await this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).toPromise();
    } catch { }
  }
}
