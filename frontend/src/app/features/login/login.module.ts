import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LoggingService } from '../../core/services/logging.service';
import { environment } from '../../../environments/environment';
import { appVersion } from '../../../environments/version';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

@Component({
  template: `
    <ion-content class="login-content">
      <div class="login-container">
        <div class="logo-section animate-fade-in">
          <div class="app-icon">
            <ion-icon name="book-outline"></ion-icon>
          </div>
          <h1 class="app-title">Encounter Daily</h1>
          <p class="app-subtitle">Daily devotional readings<br>to nourish your faith</p>
        </div>

        <div class="button-section animate-stagger">
          <ion-button *ngIf="bypassAuth" expand="block" class="guest-btn" (click)="continueAsGuest()" [disabled]="loading">
            <ion-icon slot="start" name="person-outline"></ion-icon>
            Continue as Guest
          </ion-button>

          <ion-button expand="block" class="social-btn google-btn" (click)="loginWithGoogle()" [disabled]="loading">
            <ion-icon slot="start" name="logo-google"></ion-icon>
            Sign in with Google
          </ion-button>

          <ion-button expand="block" class="social-btn facebook-btn" (click)="loginWithFacebook()" [disabled]="loading">
            <ion-icon slot="start" name="logo-facebook"></ion-icon>
            Sign in with Facebook
          </ion-button>
        </div>

        @if (loading) {
          <div class="loading-section">
            <ion-spinner name="dots"></ion-spinner>
            <p>Signing in...</p>
          </div>
        }

        @if (error) {
          <div class="error-section animate-fade-in">
            <p class="error-message">{{ error }}</p>
          </div>
        }

        <p class="version-text">{{ version }}</p>
      </div>

      <div #gBtnHost class="g-btn-host" aria-hidden="true"></div>
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
      width: 88px;
      height: 88px;
      border-radius: 22px;
      background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-shade));
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 10px 40px rgba(var(--ion-color-primary-rgb), 0.35);
    }
    .app-icon ion-icon {
      font-size: 44px;
      color: var(--ion-color-primary-contrast);
    }
    .app-title {
      font-size: 30px;
      font-weight: 800;
      margin: 0 0 10px;
      color: var(--ion-text-color);
      letter-spacing: -0.5px;
    }
    .app-subtitle {
      font-size: 15px;
      color: var(--ion-color-medium);
      margin: 0;
      line-height: 1.6;
    }
    .button-section {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    ion-button {
      --border-radius: 14px;
      height: 54px;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.2px;
      margin: 0;
    }
    .guest-btn {
      --background: var(--ion-color-step-150, #e8e8e8);
      --color: var(--ion-text-color);
      --box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      margin-bottom: 4px;
      --background-hover: var(--ion-color-step-200, #ddd);
    }
    .social-btn {
      --box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .google-btn {
      --background: #ffffff;
      --color: #444444;
      --border-color: #dadce0;
      --border-style: solid;
      --border-width: 1px;
    }
    .facebook-btn {
      --background: #1877f2;
      --color: #ffffff;
    }
    .loading-section {
      margin-top: 24px;
      text-align: center;
      color: var(--ion-color-medium);
    }
    .loading-section p {
      margin-top: 10px;
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
      color: var(--ion-color-step-400, #bbb);
    }
    .g-btn-host {
      position: fixed;
      top: -9999px;
      left: -9999px;
      opacity: 0;
    }
  `]
})
export class LoginPage implements OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private loggingService = inject(LoggingService);

  version = appVersion;
  loading = false;
  error?: string;
  bypassAuth = environment.bypassAuth;

  @ViewChild('gBtnHost') gBtnHost?: ElementRef<HTMLDivElement>;

  private googleInitialized = false;
  private facebookInitialized = false;
  private socialLoginInitialized = false;

  // Bridge for the async Google credential callback → current promise
  private googleCredResolve?: (cred: string) => void;
  private googleCredReject?: (err: Error) => void;

  ngOnDestroy(): void {
    this.loading = false;
    this.error = undefined;
    this.googleCredResolve = undefined;
    this.googleCredReject = undefined;
  }

  /** Pre-load both SDKs as soon as the page is visible so they are ready
   *  before the user taps a button (preserves the user-gesture chain). */
  ionViewWillEnter(): void {
    this.googleInitialized = false;
    this.facebookInitialized = false;
    this.initGoogle().catch(() => {});
    this.initFacebook().catch(() => {});
    if (Capacitor.isNativePlatform()) {
      this.initSocialLogin().catch(() => {});
    }
  }

  private async initGoogle(): Promise<void> {
    if (this.googleInitialized) return;
    try {
      if (!window.google?.accounts?.id) {
        await this.loadScript('https://accounts.google.com/gsi/client');
      }
      window.google!.accounts.id.initialize({
        client_id: '126956037492-0v2i92mj4q0ulko5u5io1bd5do619liu.apps.googleusercontent.com',
        callback: (response: GoogleCredentialResponse) => {
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
      // Pre-render the Google button (popup flow — no FedCM) into the hidden host.
      // This must happen before the user clicks so the element exists in the DOM
      // and gBtn.click() runs synchronously within the user-gesture context.
      const container = this.gBtnHost?.nativeElement;
      if (container) {
        window.google!.accounts.id.renderButton(container, {
          type: 'standard', size: 'large', theme: 'outline',
          text: 'sign_in_with', shape: 'rectangular'
        });
      }
      this.googleInitialized = true;
    } catch (e: unknown) { this.loggingService.error('LoginPage', 'initGoogle', String(e)); /* will show error on button click */ }
  }

  private async initFacebook(): Promise<void> {
    if (this.facebookInitialized) return;
    try {
      if (!window.FB) {
        await new Promise<void>((resolve, reject) => {
          window.fbAsyncInit = () => {
            window.FB!.init({ appId: '1510105297476514', version: 'v18.0' });
            resolve();
          };
          this.loadScript('https://connect.facebook.net/en_US/sdk.js').catch(reject);
        });
      }
      this.facebookInitialized = true;
    } catch (e: unknown) { this.loggingService.error('LoginPage', 'initFacebook', String(e)); /* will show error on button click */ }
  }

  private async initSocialLogin(): Promise<void> {
    if (this.socialLoginInitialized) return;
    try {
      await SocialLogin.initialize({
        google: {
          webClientId: '868571551367-kkm4ggn0d9cc457k6s0p9rhoipq1bkio.apps.googleusercontent.com',
          mode: 'online'
        },
        facebook: {
          appId: '1510105297476514'
        }
      });
      this.socialLoginInitialized = true;
    } catch (e: unknown) { this.loggingService.error('LoginPage', 'initSocialLogin', String(e)); }
  }

  async continueAsGuest(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      await this.authService.guestLogin();
      this.router.navigate(['/series']);
    } catch (e: unknown) {
      this.loggingService.error('LoginPage', 'continueAsGuest', String(e));
      this.error = 'Failed to start guest session.';
    } finally {
      this.loading = false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      let credential: string;

      if (Capacitor.isNativePlatform()) {
        // Native Android/iOS — use @capgo/capacitor-social-login
        const res = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
        if (res.result.responseType !== 'online') throw new Error('Google sign-in failed — unexpected offline response.');
        const idToken = res.result.idToken;
        if (!idToken) throw new Error('Google sign-in failed — no ID token returned.');
        credential = idToken;
      } else {
        // Web browser — use Google Identity Services popup flow
        if (!this.googleInitialized) await this.initGoogle();
        if (!window.google?.accounts?.id) {
          throw new Error('Google Sign-In unavailable. Please refresh and try again.');
        }

        let gBtn = this.gBtnHost?.nativeElement?.querySelector<HTMLElement>('[role="button"]');
        if (!gBtn) {
          this.googleInitialized = false;
          await this.initGoogle();
          gBtn = this.gBtnHost?.nativeElement?.querySelector<HTMLElement>('[role="button"]');
        }
        if (!gBtn) {
          throw new Error('Google Sign-In is still loading — please try again in a moment.');
        }

        credential = await new Promise<string>((resolve, reject) => {
          let settled = false;
          const settle = (fn: 'resolve' | 'reject', val: any) => {
            if (settled) return;
            settled = true;
            this.googleCredResolve = undefined;
            this.googleCredReject = undefined;
            window.removeEventListener('focus', onFocus);
            if (fn === 'resolve') resolve(val); else reject(val);
          };

          this.googleCredResolve = (cred) => settle('resolve', cred);
          this.googleCredReject = (err) => settle('reject', err);

          const onFocus = () =>
            setTimeout(() => settle('reject', new Error('Google sign-in was cancelled.')), 600);
          window.addEventListener('focus', onFocus);

          gBtn.click();
        });
      }

      const res = await firstValueFrom(this.authService.login('google', credential));
      if (res) {
        await this.authService.storeTokens(res);
        this.router.navigate(['/series']);
      }
    } catch (e) {
      this.loggingService.error('LoginPage', 'loginWithGoogle', String(e));
      this.error = e instanceof Error ? e.message : 'Google sign-in failed.';
    } finally {
      this.loading = false;
    }
  }

  async loginWithFacebook(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      let credential: string;

      if (Capacitor.isNativePlatform()) {
        // Native Android/iOS — use @capgo/capacitor-social-login
        if (!this.socialLoginInitialized) await this.initSocialLogin();
        const res = await SocialLogin.login({ provider: 'facebook', options: { permissions: ['public_profile'] } });
        const token = res.result.accessToken?.token;
        if (!token) throw new Error('Facebook sign-in failed — no access token.');
        credential = token;
      } else {
        // Web browser — use Facebook JS SDK popup flow
        if (!this.facebookInitialized) await this.initFacebook();
        const { FB } = window;
        if (!FB) {
          throw new Error('Facebook Sign-In unavailable. Please refresh and try again.');
        }

        credential = await new Promise<string>((resolve, reject) => {
          FB.login((response: FacebookLoginResponse) => {
            if (response?.authResponse?.accessToken) {
              resolve(response.authResponse.accessToken);
            } else {
              reject(new Error('Facebook login was cancelled.'));
            }
          }, { scope: 'public_profile' });
        });
      }

      const res = await firstValueFrom(this.authService.login('facebook', credential));
      if (res) {
        await this.authService.storeTokens(res);
        this.router.navigate(['/series']);
      }
    } catch (e) {
      this.loggingService.error('LoginPage', 'loginWithFacebook', String(e));
      this.error = e instanceof Error ? e.message : 'Facebook sign-in failed.';
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
