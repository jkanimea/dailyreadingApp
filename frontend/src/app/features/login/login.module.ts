import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnDestroy } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  template: `
    <ion-content class="ion-padding login-content">
      <div class="login-container">
        <div class="logo-section animate-fade-in">
          <div class="app-icon">
            <ion-icon name="book-outline"></ion-icon>
          </div>
          <h1 class="app-title">Encounter Daily</h1>
          <p class="app-subtitle">Daily devotional readings<br>to nourish your faith</p>
        </div>

        <div class="button-section animate-stagger">
          <ion-button *ngIf="bypassAuth" expand="block" class="guest-btn premium-button" (click)="continueAsGuest()">
            <ion-icon slot="start" name="person-outline"></ion-icon>
            Continue as Guest
          </ion-button>

          <ion-button expand="block" class="google-btn premium-button" (click)="loginWithGoogle()" [disabled]="loading">
            <ion-icon slot="start" name="logo-google"></ion-icon>
            Sign in with Google
          </ion-button>

          <ion-button expand="block" class="facebook-btn premium-button" (click)="loginWithFacebook()" [disabled]="loading">
            <ion-icon slot="start" name="logo-facebook"></ion-icon>
            Sign in with Facebook
          </ion-button>
        </div>

        <div *ngIf="loading" class="loading-section">
          <ion-spinner></ion-spinner>
          <p>Signing in...</p>
        </div>

        <div *ngIf="error" class="error-section animate-fade-in">
          <p class="error-message">{{ error }}</p>
        </div>

        <p class="version-text">v0.1.0</p>
      </div>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .login-content {
      --background: var(--ion-background-color);
    }
    .login-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: 32px 24px;
      max-width: 400px;
      margin: 0 auto;
    }
    .logo-section {
      text-align: center;
      margin-bottom: 48px;
    }
    .app-icon {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: var(--ion-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 8px 32px rgba(var(--ion-color-primary-rgb), 0.3);
    }
    .app-icon ion-icon {
      font-size: 40px;
      color: var(--ion-color-primary-contrast);
    }
    .app-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
      color: var(--ion-text-color);
    }
    .app-subtitle {
      font-size: 15px;
      color: var(--ion-color-medium);
      margin: 0;
      line-height: 1.5;
    }
    .button-section {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    ion-button {
      --border-radius: 12px;
      height: 52px;
      font-size: 16px;
      font-weight: 600;
    }
    .guest-btn {
      --background: var(--ion-color-step-100, #e0e0e0);
      --color: var(--ion-text-color);
      --box-shadow: none;
      margin-bottom: 8px;
    }
    .google-btn {
      --background: #ffffff;
      --color: #444444;
      --border-color: #dadce0;
      --border-style: solid;
      --border-width: 1px;
      --box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .facebook-btn {
      --background: #1877f2;
      --color: #ffffff;
      --box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    .loading-section {
      margin-top: 24px;
      text-align: center;
      color: var(--ion-color-medium);
    }
    .loading-section p {
      margin-top: 8px;
      font-size: 14px;
    }
    .error-section {
      margin-top: 16px;
      text-align: center;
    }
    .error-message {
      color: var(--ion-color-danger);
      font-size: 14px;
      margin: 0;
    }
    .version-text {
      position: fixed;
      bottom: 16px;
      font-size: 12px;
      color: var(--ion-color-step-300, #ccc);
    }
  `]
})
class LoginPage implements OnDestroy {
  loading = false;
  error?: string;
  bypassAuth = environment.bypassAuth;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnDestroy(): void {
    this.loading = false;
    this.error = undefined;
  }

  async continueAsGuest(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      await this.authService.guestLogin();
      this.router.navigate(['/series']);
    } catch (e) {
      this.error = 'Failed to start guest session.';
    } finally {
      this.loading = false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const { google } = window as any;
      if (!google?.accounts?.id) {
        await this.loadGoogleScript();
      }
      const credential = await this.getGoogleCredential();
      const res = await this.authService.login('google', credential).toPromise();
      if (res) {
        await this.authService['secureStorage'].setTokens(res.accessToken, res.refreshToken);
        this.router.navigate(['/series']);
      }
    } catch (e: any) {
      this.error = e?.message || 'Google sign-in failed.';
    } finally {
      this.loading = false;
    }
  }

  async loginWithFacebook(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const { FB } = window as any;
      if (!FB) {
        await this.loadFacebookScript();
      }
      const accessToken = await this.getFacebookAccessToken();
      const res = await this.authService.login('facebook', accessToken).toPromise();
      if (res) {
        await this.authService['secureStorage'].setTokens(res.accessToken, res.refreshToken);
        this.router.navigate(['/series']);
      }
    } catch (e: any) {
      this.error = e?.message || 'Facebook sign-in failed.';
    } finally {
      this.loading = false;
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
      document.head.appendChild(script);
    });
  }

  private getGoogleCredential(): Promise<string> {
    return new Promise((resolve, reject) => {
      const { google } = window as any;
      const clientId = 'your-google-client-id';
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response?.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('Google sign-in cancelled'));
          }
        },
        cancel_on_tap_outside: false
      });
      google.accounts.id.prompt();
    });
  }

  private loadFacebookScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      (window as any).fbAsyncInit = () => {
        const { FB } = window as any;
        FB.init({
          appId: 'your-facebook-app-id',
          version: 'v18.0'
        });
        resolve();
      };
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
      document.head.appendChild(script);
    });
  }

  private getFacebookAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      const { FB } = window as any;
      FB.login((response: any) => {
        if (response?.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new Error('Facebook login cancelled'));
        }
      }, { scope: 'public_profile,email' });
    });
  }
}

const routes: Routes = [{ path: '', component: LoginPage }];

@NgModule({
  declarations: [LoginPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class LoginModule {}
