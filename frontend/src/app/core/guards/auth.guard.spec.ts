import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

jest.mock('../../../environments/environment', () => ({
  environment: { bypassAuth: false, apiUrl: 'http://localhost:5000/api/v1' }
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: any;
  let router: any;

  beforeEach(() => {
    authService = { isAuthenticated: jest.fn() };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
    guard = TestBed.inject(AuthGuard);
  });

  it('should allow activation when authenticated', async () => {
    authService.isAuthenticated.mockResolvedValue(true);
    const result = await guard.canActivate();
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when not authenticated', async () => {
    authService.isAuthenticated.mockResolvedValue(false);
    const result = await guard.canActivate();
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
