import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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

  private googleInitialized = false;
  private facebookInitialized = false;

  // Bridge for the async Google credential callback → current promise
  private googleCredResolve?: (cred: string) => void;
  private googleCredReject?: (err: Error) => void;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnDestroy(): void {
    this.loading = false;
    this.error = undefined;
    this.googleCredResolve = undefined;
    this.googleCredReject = undefined;
  }

  /** Pre-load both SDKs as soon as the page is visible so they are ready
   *  before the user taps a button (preserves the user-gesture chain). */
  ionViewWillEnter(): void {
    this.initGoogle().catch(() => {});
    this.initFacebook().catch(() => {});
  }

  private async initGoogle(): Promise<void> {
    if (this.googleInitialized) return;
    try {
      if (!(window as any).google?.accounts?.id) {
        await this.loadScript('https://accounts.google.com/gsi/client');
      }
      (window as any).google.accounts.id.initialize({
        client_id: '126956037492-0v2i92mj4q0ulko5u5io1bd5do619liu.apps.googleusercontent.com',
        callback: (response: any) => {
          if (response?.credential) {
            this.googleCredResolve?.(response.credential);
          } else {
            this.googleCredReject?.(new Error('Google sign-in failed'));
          }
          this.googleCredResolve = undefined;
          this.googleCredReject = undefined;
        },
        use_fedcm_for_prompt: false,
        cancel_on_tap_outside: false,
        auto_select: false
      });
      this.googleInitialized = true;
    } catch { /* will show error on button click */ }
  }

  private async initFacebook(): Promise<void> {
    if (this.facebookInitialized) return;
    try {
      if (!(window as any).FB) {
        await new Promise<void>((resolve, reject) => {
          (window as any).fbAsyncInit = () => {
            (window as any).FB.init({ appId: '1510105297476514', version: 'v18.0' });
            resolve();
          };
          this.loadScript('https://connect.facebook.net/en_US/sdk.js').catch(reject);
        });
      }
      this.facebookInitialized = true;
    } catch { /* will show error on button click */ }
  }

  async continueAsGuest(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      await this.authService.guestLogin();
      this.router.navigate(['/series']);
    } catch {
      this.error = 'Failed to start guest session.';
    } finally {
      this.loading = false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      if (!this.googleInitialized) await this.initGoogle();
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        throw new Error('Google Sign-In unavailable. Please refresh and try again.');
      }

      const credential = await new Promise<string>((resolve, reject) => {
        this.googleCredResolve = resolve;
        this.googleCredReject = reject;

        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason?.() ?? 'unknown';
            reject(new Error(
              `Google One Tap could not be shown (${reason}). ` +
              `Make sure you are signed in to Google in your browser and not in incognito mode.`
            ));
            this.googleCredResolve = undefined;
            this.googleCredReject = undefined;
          } else if (notification.isSkippedMoment()) {
            reject(new Error('Google sign-in was skipped. Please try again.'));
            this.googleCredResolve = undefined;
            this.googleCredReject = undefined;
          } else if (notification.isDismissedMoment()) {
            if (notification.getDismissedReason?.() !== 'credential_returned') {
              reject(new Error('Google sign-in was cancelled.'));
              this.googleCredResolve = undefined;
              this.googleCredReject = undefined;
            }
          }
        });
      });

      const res = await firstValueFrom(this.authService.login('google', credential));
      if (res) {
        await this.authService.storeTokens(res);
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
      if (!this.facebookInitialized) await this.initFacebook();
      const { FB } = window as any;
      if (!FB) {
        throw new Error('Facebook Sign-In unavailable. Please refresh and try again.');
      }

      // FB.login() must be called within a user-gesture handler — SDK is pre-loaded
      // so this runs synchronously within the button click event.
      const accessToken = await new Promise<string>((resolve, reject) => {
        FB.login((response: any) => {
          if (response?.authResponse?.accessToken) {
            resolve(response.authResponse.accessToken);
          } else {
            reject(new Error('Facebook login was cancelled.'));
          }
        }, { scope: 'public_profile' });
      });

      const res = await firstValueFrom(this.authService.login('facebook', accessToken));
      if (res) {
        await this.authService.storeTokens(res);
        this.router.navigate(['/series']);
      }
    } catch (e: any) {
      this.error = e?.message || 'Facebook sign-in failed.';
    } finally {
      this.loading = false;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }
}

const routes: Routes = [{ path: '', component: LoginPage }];

@NgModule({
  declarations: [LoginPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class LoginModule {}
