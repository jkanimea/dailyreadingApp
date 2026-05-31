import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);


  async canActivate(): Promise<boolean> {
    if (environment.bypassAuth) return true;

    const authenticated = await this.authService.isAuthenticated();
    if (!authenticated) {
      this.router.navigate(['/login']);
      return false;
    }

    const admin = await this.authService.isAdmin();
    if (!admin) {
      this.router.navigate(['/today']);
      return false;
    }

    return true;
  }
}
