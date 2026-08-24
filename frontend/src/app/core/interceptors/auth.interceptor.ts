import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, from } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { SecureStorageService } from '../services/secure-storage.service';
import { LoggingService } from '../services/logging.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private secureStorage = inject(SecureStorageService);
  private logging = inject(LoggingService);

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isExempt(req)) {
      return next.handle(req);
    }

    return from(this.addToken(req)).pipe(
      switchMap(authReq => next.handle(authReq)),
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            // Recoverable: an expired access token triggers a silent refresh+retry.
            // Don't log it as an error — only session-expiry (failed refresh) is worth reporting.
            return this.handle401Error(req, next);
          }
          this.logging.error('AuthInterceptor',
            `HTTP ${error.status} ${req.method} ${req.urlWithParams}`,
            error.message);
        }
        return throwError(() => error);
      })
    );
  }

  private isExempt(req: HttpRequest<unknown>): boolean {
    if (req.url.includes('/auth/')) return true;
    // Client log submission is anonymous on the backend — attaching an (often expired)
    // token only triggers a pointless 401/refresh cycle on the logging endpoint. The
    // admin GET/DELETE on /logs still requires auth and is NOT exempted.
    return req.method === 'POST' && req.url.includes('/logs');
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
          this.refreshTokenSubject.next(null);
          this.logging.warn('AuthInterceptor',
            `Session expired — token refresh failed (${req.method} ${req.urlWithParams})`);
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