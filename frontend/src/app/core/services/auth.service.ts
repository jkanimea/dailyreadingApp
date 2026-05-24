import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TokenResponse, UserDto } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { SecureStorageService } from './secure-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private secureStorage: SecureStorageService
  ) {}

  login(provider: 'google' | 'facebook', token: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/${provider}`, { token });
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

  logout(): Observable<void> {
    this.secureStorage.clearTokens();
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {});
  }
}
