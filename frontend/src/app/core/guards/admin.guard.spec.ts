import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

jest.mock('../../../environments/environment', () => ({
  environment: { bypassAuth: false, apiUrl: 'http://localhost:5000/api/v1' }
}));

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let authService: any;
  let router: any;

  beforeEach(() => {
    authService = {
      isAuthenticated: jest.fn(),
      isAdmin: jest.fn()
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
    guard = TestBed.inject(AdminGuard);
  });

  it('should allow activation when user is Admin', async () => {
    authService.isAuthenticated.mockResolvedValue(true);
    authService.isAdmin.mockResolvedValue(true);

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

  it('should redirect to today when authenticated but not Admin', async () => {
    authService.isAuthenticated.mockResolvedValue(true);
    authService.isAdmin.mockResolvedValue(false);

    const result = await guard.canActivate();

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/today']);
  });

  it('should not call isAdmin when not authenticated', async () => {
    authService.isAuthenticated.mockResolvedValue(false);

    await guard.canActivate();

    expect(authService.isAdmin).not.toHaveBeenCalled();
  });
});
