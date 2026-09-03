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
import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from '../../core/oauth.config';

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
      color: #ffffff;
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
      margin-top: 24px;
      font-size: 12px;
      color: var(--ion-color-step-400, #bbb);
      text-align: center;
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

  /** Pre-load the correct SDK(s) as soon as the page is visible so they are ready
   *  before the user taps a button (preserves the user-gesture chain). */
  ionViewWillEnter(): void {
    this.googleInitialized = false;
    this.facebookInitialized = false;
    if (Capacitor.isNativePlatform()) {
      // Native uses @capgo/capacitor-social-login (Credential Manager). Do NOT
      // load the web Google/Facebook SDKs here — the Google Identity Services
      // script would initialize against the Capacitor WebView origin and throw
      // an `origin_mismatch` error even though native sign-in works fine.
      this.initSocialLogin().catch(() => {});
    } else {
      // Browser: pre-load the Google GIS + Facebook JS SDKs.
      this.initGoogle().catch(() => {});
      this.initFacebook().catch(() => {});
    }
  }

  private async initGoogle(): Promise<void> {
    if (this.googleInitialized) return;
    try {
      if (!window.google?.accounts?.id) {
        await this.loadScript('https://accounts.google.com/gsi/client');
      }
      window.google!.accounts.id.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
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
    } catch (e: unknown) { this.loggingService.error('LoginPage', 'initGoogle', this.describeError(e)); /* will show error on button click */ }
  }

  private async initFacebook(): Promise<void> {
    if (this.facebookInitialized) return;
    try {
      if (!window.FB) {
        await new Promise<void>((resolve, reject) => {
          window.fbAsyncInit = () => {
            window.FB!.init({ appId: FACEBOOK_APP_ID, version: 'v18.0' });
            resolve();
          };
          this.loadScript('https://connect.facebook.net/en_US/sdk.js').catch(reject);
        });
      }
      this.facebookInitialized = true;
    } catch (e: unknown) { this.loggingService.error('LoginPage', 'initFacebook', this.describeError(e)); /* will show error on button click */ }
  }

  private async initSocialLogin(): Promise<void> {
    if (this.socialLoginInitialized) return;
    try {
      await SocialLogin.initialize({
        google: {
          webClientId: GOOGLE_WEB_CLIENT_ID,
          mode: 'online'
        },
        facebook: {
          appId: FACEBOOK_APP_ID,
          clientToken: FACEBOOK_CLIENT_TOKEN
        }
      });
      this.socialLoginInitialized = true;
    } catch (e: unknown) { this.loggingService.error('LoginPage', 'initSocialLogin', this.describeError(e)); }
  }

  async loginWithGoogle(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      let credential: string;

      if (Capacitor.isNativePlatform()) {
        // Native Android/iOS — use @capgo/capacitor-social-login
        const res = await this.googleNativeLogin();
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
      // Navigate unconditionally on a 2xx response — the backend only returns 200 when
      // the credential was valid. storeTokens is null-safe and a no-op on an empty body,
      // so the user lands on /series either way (auth guard will bounce back to login
      // if no token was actually stored).
      await this.authService.storeTokens(res);
      this.router.navigate(['/series']);
    } catch (e) {
      this.loggingService.error('LoginPage', 'loginWithGoogle', this.describeError(e));
      console.error('loginWithGoogle failed:', e);
      this.error = e instanceof Error ? e.message : 'Google sign-in failed.';
    } finally {
      this.loading = false;
    }
  }

  /** Native (Android/iOS) Google Sign-In entry point.
   *
   *  Google Credential Manager reports `GetCredentialCancellationException` as
   *  "Google Sign-In cancelled by user" (code `USER_CANCELLED`), but Android
   *  throws that same exception for stale cached credentials / re-auth failures
   *  (error 16) — NOT just a genuine user cancel. When a user taps an
   *  already-authenticated account, the cached credential can fail to re-auth.
   *  We clear the stale credential state and retry once so that tap succeeds
   *  instead of surfacing a misleading "cancelled by user" error.
   */
  private async googleNativeLogin() {
    try {
      return await SocialLogin.login({ provider: 'google', options: { style: 'bottom' } });
    } catch (e) {
      if (this.isUserCancelled(e)) {
        await this.clearGoogleCredentials();
        return SocialLogin.login({ provider: 'google', options: { style: 'bottom' } });
      }
      throw e;
    }
  }

  private isUserCancelled(e: unknown): boolean {
    const err = e as { code?: string; message?: string };
    return err?.code === 'USER_CANCELLED' || /cancelled by user/i.test(err?.message ?? '');
  }

  /** Best-effort clearing of stale Credential Manager state so a
   *  previously-authenticated account can re-auth cleanly. */
  private async clearGoogleCredentials(): Promise<void> {
    try {
      await SocialLogin.logout({ provider: 'google' });
    } catch {
      // Non-fatal: stale state may already be gone or unsupported.
    }
  }

  /** Formats any thrown value into a log-friendly string that preserves the
   *  plugin's error `code` (e.g. `USER_CANCELLED`) alongside the message, so
   *  native SDK failures — like Facebook's "no key hashes configured" — are not
   *  flattened into a bare "Login cancelled" string. */
  private describeError(e: unknown): string {
    if (e instanceof Error) {
      const code = (e as { code?: string }).code;
      return code ? `[code=${code}] ${e.message}` : e.message;
    }
    return String(e);
  }

  /** Rejects if a native login dialog never settles (e.g. Facebook SDK shows a
   *  blocking native dialog and the plugin promise neither resolves nor rejects).
   *  Without this, a hung dialog produces no backend log at all. */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      promise.then(
        (value) => { clearTimeout(timer); resolve(value); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  }

  async loginWithFacebook(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      let credential: string;

      if (Capacitor.isNativePlatform()) {
        // Native Android/iOS — use @capgo/capacitor-social-login
        if (!this.socialLoginInitialized) await this.initSocialLogin();
        const res = await this.withTimeout(
          SocialLogin.login({ provider: 'facebook', options: { permissions: ['public_profile', 'email'] } }),
          120000,
          'Facebook login'
        );
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
      // See loginWithGoogle — navigate unconditionally so the user isn't stranded on
      // the login screen if the backend returns an empty body.
      await this.authService.storeTokens(res);
      this.router.navigate(['/series']);
    } catch (e) {
      this.loggingService.error('LoginPage', 'loginWithFacebook', this.describeError(e));
      console.error('loginWithFacebook failed:', e);
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
