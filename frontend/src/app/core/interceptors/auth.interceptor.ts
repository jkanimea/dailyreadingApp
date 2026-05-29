import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, from, of } from 'rxjs';
import { catchError, filter, take, switchMap, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { SecureStorageService } from '../services/secure-storage.service';
import { LoggingService } from '../services/logging.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private secureStorage: SecureStorageService,
    private logging: LoggingService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.url.includes('/auth/')) {
      return next.handle(req);
    }

    return from(this.addToken(req)).pipe(
      switchMap(authReq => next.handle(authReq)),
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          this.logging.error('AuthInterceptor',
            `HTTP ${error.status} ${req.method} ${req.urlWithParams}`,
            error.message);
          if (error.status === 401) {
            return this.handle401Error(req, next);
          }
        }
        return throwError(() => error);
      })
    );
  }

  private async addToken(req: HttpRequest<unknown>): Promise<HttpRequest<unknown>> {
    const token = await this.secureStorage.getToken();
    if (token) {
      return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    return req;
  }

  private handle401Error(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return from(this.doRefresh()).pipe(
        switchMap(newToken => {
          this.isRefreshing = false;
          if (newToken) {
            this.refreshTokenSubject.next(newToken);
            const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
            return next.handle(cloned);
          }
          return throwError(() => new Error('Authentication failed'));
        }),
        catchError(err => {
          this.isRefreshing = false;
          return throwError(() => err);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        return next.handle(cloned);
      })
    );
  }

  private async doRefresh(): Promise<string | null> {
    try {
      const refreshToken = await this.secureStorage.getRefreshToken();
      if (!refreshToken) {
        await this.secureStorage.clearTokens();
        window.location.href = '/login';
        return null;
      }

      const response = await this.authService.refreshAccessToken(refreshToken).toPromise();
      if (response?.accessToken && response?.refreshToken) {
        await this.secureStorage.setTokens(response.accessToken, response.refreshToken);
        return response.accessToken;
      }
      return null;
    } catch {
      await this.secureStorage.clearTokens();
      window.location.href = '/login';
      return null;
    }
  }
}
