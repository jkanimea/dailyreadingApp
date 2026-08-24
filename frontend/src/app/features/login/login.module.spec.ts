import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LoginPage } from './login.module';
import { TokenResponse } from '../../core/models/user.model';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from '../../core/oauth.config';

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn() }
}));
jest.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    initialize: jest.fn().mockResolvedValue(undefined),
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockTokenResponse: TokenResponse = {
  accessToken: 'jwt-123',
  refreshToken: 'rt-123',
  expiresIn: 3600,
  user: {
    id: 1,
    email: 'test@example.com',
    displayName: 'Test User',
    provider: 'google',
    selectedSeriesId: 1,
    role: 'User'
  }
};

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authService: any;
  let router: any;
  let googleIdMock: any;
  // Captured from google.accounts.id.initialize({ callback }) — called when a credential arrives
  let googleCredentialCallback: (response: any) => void;

  beforeEach(async () => {
    googleCredentialCallback = jest.fn() as any;

    googleIdMock = {
      initialize: jest.fn().mockImplementation((config: any) => {
        googleCredentialCallback = config.callback;
      }),
      // renderButton populates the hidden host with a clickable div so loginWithGoogle
      // can find [role="button"] and click it within the user-gesture context.
      renderButton: jest.fn().mockImplementation((container: HTMLElement) => {
        container.innerHTML = '<div role="button" tabindex="0"></div>';
      })
    };
    (window as any).google = { accounts: { id: googleIdMock } };
    delete (window as any).FB;

    authService = {
      login: jest.fn().mockReturnValue(of(mockTokenResponse)),
      storeTokens: jest.fn().mockResolvedValue(undefined)
    };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      declarations: [LoginPage],
      imports: [CommonModule, IonicModule.forRoot(), HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    // detectChanges resolves @ViewChild(gBtnHost) before initGoogle runs renderButton.
    fixture.detectChanges();

    // Call initGoogle so initialize() + renderButton() both run.
    // window.google is already set, so no script loading happens.
    await (component as any).initGoogle();
  });

  afterEach(() => {
    delete (window as any).google;
    delete (window as any).FB;
  });

  // ─── Version ──────────────────────────────────────────────────────────────

  it('should render the current app version on the login page', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('.version-text');
    expect(el).not.toBeNull();
    expect(el.textContent?.trim()).toMatch(/^v\d+$/);
  });

  // ─── Google ───────────────────────────────────────────────────────────────

  describe('loginWithGoogle', () => {
    it('should show error when Google SDK is not available', async () => {
      // googleInitialized = true so initGoogle won't re-run; removing google simulates
      // the SDK being absent at call time.
      delete (window as any).google;

      await component.loginWithGoogle();

      expect(component.error).toBe('Google Sign-In unavailable. Please refresh and try again.');
      expect(component.loading).toBe(false);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should re-init Google SDK when the button is missing (fallback in loginWithGoogle)', async () => {
      (component as any).gBtnHost.nativeElement.innerHTML = '';
      googleIdMock.initialize.mockClear();
      // Prevent the fallback from re-rendering so it hits the error path
      googleIdMock.renderButton = jest.fn().mockImplementation(() => {});

      await component.loginWithGoogle();

      // The fallback should have called initGoogle again (second initialize call)
      expect(googleIdMock.initialize).toHaveBeenCalledTimes(1);
      expect(component.error).toBe('Google Sign-In is still loading — please try again in a moment.');
    });

    it('should navigate to /series after successful Google login', async () => {
      // loginWithGoogle() sets googleCredResolve synchronously (inside the Promise
      // constructor) before hitting the first await, so we can fire the credential
      // callback immediately after starting the call.
      const p = component.loginWithGoogle();
      googleCredentialCallback({ credential: 'google-id-token' });

      await p;

      expect(authService.login).toHaveBeenCalledWith('google', 'google-id-token');
      expect(authService.storeTokens).toHaveBeenCalledWith(mockTokenResponse);
      expect(router.navigate).toHaveBeenCalledWith(['/series']);
      expect(component.loading).toBe(false);
      expect(component.error).toBeUndefined();
    });

    it('should show error when user closes the Google popup (window focus returns)', async () => {
      jest.useFakeTimers();
      try {
        const p = component.loginWithGoogle();
        // Simulate the browser refocusing our window when the popup is closed
        window.dispatchEvent(new Event('focus'));
        // Advance past the 600 ms grace period that lets the credential arrive first
        jest.advanceTimersByTime(700);
        await p;

        expect(component.error).toBe('Google sign-in was cancelled.');
        expect(authService.login).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should show error when backend rejects the Google credential', async () => {
      authService.login.mockReturnValue(throwError(() => new Error('401 Unauthorized')));

      const p = component.loginWithGoogle();
      googleCredentialCallback({ credential: 'google-id-token' });
      await p;

      expect(component.error).toBe('401 Unauthorized');
      expect(component.loading).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should set loading to true while signing in and false when done', async () => {
      expect(component.loading).toBe(false);
      const p = component.loginWithGoogle();
      expect(component.loading).toBe(true);
      googleCredentialCallback({ credential: 'google-id-token' });
      await p;
      expect(component.loading).toBe(false);
    });

    it('should call renderButton during initGoogle to pre-render the sign-in button', () => {
      expect(googleIdMock.renderButton).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ type: 'standard', size: 'large' })
      );
    });

    // ─── Regression: null/undefined backend response must still redirect ───
    // Bug: a falsy response from authService.login silently skipped the redirect,
    // stranding the user on /login. The fix is to navigate unconditionally on 2xx
    // and let storeTokens be a no-op on a null body.

    it('should still navigate to /series when backend returns null', async () => {
      authService.login.mockReturnValue(of(null as any));

      const p = component.loginWithGoogle();
      googleCredentialCallback({ credential: 'google-id-token' });
      await p;

      expect(authService.login).toHaveBeenCalledWith('google', 'google-id-token');
      expect(authService.storeTokens).toHaveBeenCalledWith(null);
      expect(router.navigate).toHaveBeenCalledWith(['/series']);
      expect(component.loading).toBe(false);
      expect(component.error).toBeUndefined();
    });

    it('should still navigate to /series when backend returns undefined', async () => {
      authService.login.mockReturnValue(of(undefined as any));

      const p = component.loginWithGoogle();
      googleCredentialCallback({ credential: 'google-id-token' });
      await p;

      expect(authService.storeTokens).toHaveBeenCalledWith(undefined);
      expect(router.navigate).toHaveBeenCalledWith(['/series']);
      expect(component.error).toBeUndefined();
    });
  });

  // ─── Facebook ─────────────────────────────────────────────────────────────

  describe('loginWithFacebook', () => {
    beforeEach(() => {
      // Skip initFacebook so no script loading is attempted
      (component as any).facebookInitialized = true;
    });

    it('should show error when Facebook SDK is not available', async () => {
      delete (window as any).FB;

      await component.loginWithFacebook();

      expect(component.error).toBe('Facebook Sign-In unavailable. Please refresh and try again.');
      expect(component.loading).toBe(false);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should show error when user cancels Facebook login', async () => {
      (window as any).FB = {
        login: jest.fn().mockImplementation((cb: any) => {
          cb({ authResponse: null });
        })
      };

      await component.loginWithFacebook();

      expect(component.error).toBe('Facebook login was cancelled.');
      expect(component.loading).toBe(false);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should call backend with accessToken on successful Facebook login', async () => {
      (window as any).FB = {
        login: jest.fn().mockImplementation((cb: any) => {
          cb({ authResponse: { accessToken: 'fb-access-token' } });
        })
      };

      await component.loginWithFacebook();

      expect(authService.login).toHaveBeenCalledWith('facebook', 'fb-access-token');
      expect(authService.storeTokens).toHaveBeenCalledWith(mockTokenResponse);
      expect(router.navigate).toHaveBeenCalledWith(['/series']);
      expect(component.loading).toBe(false);
      expect(component.error).toBeUndefined();
    });

    it('should request public_profile scope', async () => {
      (window as any).FB = {
        login: jest.fn().mockImplementation((cb: any) => {
          cb({ authResponse: null }); // cancelled — just checking scope arg
        })
      };

      await component.loginWithFacebook();

      expect((window as any).FB.login).toHaveBeenCalledWith(
        expect.any(Function),
        { scope: 'public_profile' }
      );
    });

    it('should show error when backend rejects Facebook token', async () => {
      (window as any).FB = {
        login: jest.fn().mockImplementation((cb: any) => {
          cb({ authResponse: { accessToken: 'fb-access-token' } });
        })
      };
      authService.login.mockReturnValue(throwError(() => new Error('Invalid token')));

      await component.loginWithFacebook();

      expect(component.error).toBe('Invalid token');
      expect(component.loading).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should clear loading state regardless of outcome', async () => {
      (window as any).FB = {
        login: jest.fn().mockImplementation((cb: any) => {
          cb({ authResponse: null }); // cancelled
        })
      };

      expect(component.loading).toBe(false);
      const p = component.loginWithFacebook();
      expect(component.loading).toBe(true);
      await p;
      expect(component.loading).toBe(false);
    });

    // ─── Regression: null/undefined backend response must still redirect ───
    // Same bug as loginWithGoogle — the `if (res)` guard skipped navigation when
    // the backend returned an empty body, stranding the user on /login.

    it('should still navigate to /series when backend returns null', async () => {
      (window as any).FB = {
        login: jest.fn().mockImplementation((cb: any) => {
          cb({ authResponse: { accessToken: 'fb-access-token' } });
        })
      };
      authService.login.mockReturnValue(of(null as any));

      await component.loginWithFacebook();

      expect(authService.login).toHaveBeenCalledWith('facebook', 'fb-access-token');
      expect(authService.storeTokens).toHaveBeenCalledWith(null);
      expect(router.navigate).toHaveBeenCalledWith(['/series']);
      expect(component.loading).toBe(false);
      expect(component.error).toBeUndefined();
    });

    it('should still navigate to /series when backend returns undefined', async () => {
      (window as any).FB = {
        login: jest.fn().mockImplementation((cb: any) => {
          cb({ authResponse: { accessToken: 'fb-access-token' } });
        })
      };
      authService.login.mockReturnValue(of(undefined as any));

      await component.loginWithFacebook();

      expect(authService.storeTokens).toHaveBeenCalledWith(undefined);
      expect(router.navigate).toHaveBeenCalledWith(['/series']);
      expect(component.error).toBeUndefined();
    });
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    it('should reset loading, error and credential promise handlers', () => {
      component.loading = true;
      component.error = 'some error';
      (component as any).googleCredResolve = jest.fn();
      (component as any).googleCredReject = jest.fn();

      component.ngOnDestroy();

      expect(component.loading).toBe(false);
      expect(component.error).toBeUndefined();
      expect((component as any).googleCredResolve).toBeUndefined();
      expect((component as any).googleCredReject).toBeUndefined();
    });
  });

  describe('ionViewWillEnter', () => {
    it('should reset googleInitialized and re-initialize Google SDK on each entry', async () => {
      (component as any).googleInitialized = true;
      googleIdMock.initialize.mockClear();

      component.ionViewWillEnter();
      await new Promise(r => setTimeout(r, 0)); // flush microtasks

      // Should have been reset by ionViewWillEnter and re-set by initGoogle
      expect((component as any).googleInitialized).toBe(true);
      expect(googleIdMock.initialize).toHaveBeenCalled();
    });

    it('should recover from Ionic page cache: logout → re-login succeeds', async () => {
      // --- First visit: normal login ---
      (component as any).googleInitialized = true;

      // --- Simulate Ionic page cache: the Google button DOM is stripped ---
      (component as any).gBtnHost.nativeElement.innerHTML = '';

      // --- Logout and revisit login page ---
      component.ionViewWillEnter();
      await new Promise(r => setTimeout(r, 0)); // flush initGoogle

      // googleInitialized should have been reset to false, then re-set by initGoogle
      expect((component as any).googleInitialized).toBe(true);

      // renderButton should have been called again to re-render the button
      expect(googleIdMock.renderButton).toHaveBeenCalledTimes(2);

      // loginWithGoogle should find the re-rendered button and succeed
      const p = component.loginWithGoogle();
      googleCredentialCallback({ credential: 'google-id-token' });
      await p;

      expect(component.error).toBeUndefined();
      expect(authService.login).toHaveBeenCalledWith('google', 'google-id-token');
      expect(router.navigate).toHaveBeenCalledWith(['/series']);
    });

    it('should show error when Google button is missing AND re-init also fails', async () => {
      // Make renderButton a no-op on the second call (simulates persistent failure)
      googleIdMock.renderButton
        .mockImplementationOnce(() => { /* first call in beforeEach already consumed */ })
        .mockImplementationOnce(() => { /* don't render anything */ })
        .mockImplementation(() => {});

      // Clear the container so [role="button"] cannot be found
      (component as any).gBtnHost.nativeElement.innerHTML = '';

      await component.loginWithGoogle();

      expect(component.error).toBe('Google Sign-In is still loading — please try again in a moment.');
      expect(component.loading).toBe(false);
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  // ─── Native (Android/iOS) login paths ─────────────────────────────────────

  describe('native (Android/iOS) login', () => {
    beforeEach(async () => {
(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        (SocialLogin.login as jest.Mock).mockReset();
        (SocialLogin.initialize as jest.Mock).mockResolvedValue(undefined);
        (SocialLogin.logout as jest.Mock).mockReset();
        (SocialLogin.logout as jest.Mock).mockResolvedValue(undefined);
        (component as any).socialLoginInitialized = false;
    });

    describe('loginWithGoogle', () => {
      it('should sign in with Google via SocialLogin on native', async () => {
        (SocialLogin.login as jest.Mock).mockResolvedValue({
          result: { responseType: 'online', idToken: 'google-id-token-native' }
        });

        await component.loginWithGoogle();

        expect(SocialLogin.login).toHaveBeenCalledWith({
          provider: 'google',
          options: { style: 'bottom' }
        });
        expect(authService.login).toHaveBeenCalledWith('google', 'google-id-token-native');
        expect(authService.storeTokens).toHaveBeenCalledWith(mockTokenResponse);
        expect(router.navigate).toHaveBeenCalledWith(['/series']);
        expect(component.loading).toBe(false);
        expect(component.error).toBeUndefined();
      });

      it('should fail when SocialLogin returns offline response', async () => {
        (SocialLogin.login as jest.Mock).mockResolvedValue({
          result: { responseType: 'offline', idToken: 'token', serverAuthCode: 'auth-code' }
        });

        await component.loginWithGoogle();

        expect(component.error).toBe('Google sign-in failed — unexpected offline response.');
        expect(authService.login).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
      });

      it('should fail when SocialLogin returns no idToken', async () => {
        (SocialLogin.login as jest.Mock).mockResolvedValue({
          result: { responseType: 'online', idToken: undefined }
        });

        await component.loginWithGoogle();

        expect(component.error).toBe('Google sign-in failed — no ID token returned.');
        expect(authService.login).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
      });

      it('should handle SocialLogin.login rejection', async () => {
        (SocialLogin.login as jest.Mock).mockRejectedValue(
          new Error('Google Sign-In cancelled by user')
        );

        await component.loginWithGoogle();

        // Cancellation triggers stale-credential clearing + a single retry.
        expect(SocialLogin.logout).toHaveBeenCalledWith({ provider: 'google' });
        expect(SocialLogin.login).toHaveBeenCalledTimes(2);
        expect(component.error).toBe('Google Sign-In cancelled by user');
        expect(authService.login).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
      });

      it('should clear stale credentials and succeed on retry after USER_CANCELLED', async () => {
        (SocialLogin.login as jest.Mock)
          .mockRejectedValueOnce(
            Object.assign(new Error('Google Sign-In cancelled by user'), { code: 'USER_CANCELLED' })
          )
          .mockResolvedValueOnce({
            result: { responseType: 'online', idToken: 'google-id-token-retry' }
          });

        await component.loginWithGoogle();

        expect(SocialLogin.logout).toHaveBeenCalledWith({ provider: 'google' });
        expect(SocialLogin.login).toHaveBeenCalledTimes(2);
        expect(authService.login).toHaveBeenCalledWith('google', 'google-id-token-retry');
        expect(authService.storeTokens).toHaveBeenCalledWith(mockTokenResponse);
        expect(router.navigate).toHaveBeenCalledWith(['/series']);
        expect(component.loading).toBe(false);
        expect(component.error).toBeUndefined();
      });

      it('should not retry on non-cancellation errors', async () => {
        (SocialLogin.login as jest.Mock).mockRejectedValue(
          new Error('Something else went wrong')
        );

        await component.loginWithGoogle();

        expect(SocialLogin.logout).not.toHaveBeenCalled();
        expect(SocialLogin.login).toHaveBeenCalledTimes(1);
        expect(component.error).toBe('Something else went wrong');
        expect(authService.login).not.toHaveBeenCalled();
      });

      it('should handle backend rejection on native', async () => {
        (SocialLogin.login as jest.Mock).mockResolvedValue({
          result: { responseType: 'online', idToken: 'google-id-token-native' }
        });
        authService.login.mockReturnValue(throwError(() => new Error('401 Unauthorized')));

        await component.loginWithGoogle();

        expect(component.error).toBe('401 Unauthorized');
        expect(component.loading).toBe(false);
        expect(router.navigate).not.toHaveBeenCalled();
      });
    });

    describe('loginWithFacebook', () => {
      it('should sign in with Facebook via SocialLogin on native', async () => {
        (SocialLogin.login as jest.Mock).mockResolvedValue({
          result: { accessToken: { token: 'fb-access-token-native' } }
        });

        await component.loginWithFacebook();

        expect(SocialLogin.login).toHaveBeenCalledWith({
          provider: 'facebook',
          options: { permissions: ['public_profile', 'email'] }
        });
        expect(authService.login).toHaveBeenCalledWith('facebook', 'fb-access-token-native');
        expect(authService.storeTokens).toHaveBeenCalledWith(mockTokenResponse);
        expect(router.navigate).toHaveBeenCalledWith(['/series']);
        expect(component.loading).toBe(false);
        expect(component.error).toBeUndefined();
      });

      it('should fail when SocialLogin returns no access token', async () => {
        (SocialLogin.login as jest.Mock).mockResolvedValue({
          result: { accessToken: { token: undefined } }
        });

        await component.loginWithFacebook();

        expect(component.error).toBe('Facebook sign-in failed — no access token.');
        expect(authService.login).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
      });

      it('should handle SocialLogin.facebook rejection', async () => {
        (SocialLogin.login as jest.Mock).mockRejectedValue(
          new Error('Facebook login cancelled')
        );

        await component.loginWithFacebook();

        expect(component.error).toBe('Facebook login cancelled');
        expect(authService.login).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
      });

      it('should initialize SocialLogin before first use on native', async () => {
        (SocialLogin.login as jest.Mock).mockResolvedValue({
          result: { accessToken: { token: 'fb-token' } }
        });
        (SocialLogin.initialize as jest.Mock).mockClear();
        (component as any).socialLoginInitialized = false;

        await component.loginWithFacebook();

        expect(SocialLogin.initialize).toHaveBeenCalled();
        const callArgs = (SocialLogin.initialize as jest.Mock).mock.calls[0][0];
        expect(callArgs.google?.webClientId).toBe(GOOGLE_WEB_CLIENT_ID);
        expect(callArgs.google?.mode).toBe('online');
        expect(callArgs.facebook?.appId).toBe(FACEBOOK_APP_ID);
        expect(callArgs.facebook?.clientToken).toBe(FACEBOOK_CLIENT_TOKEN);
        expect((component as any).socialLoginInitialized).toBe(true);
      });
    });

    describe('initSocialLogin', () => {
      it('should initialize Google and Facebook providers with all required fields', async () => {
        (SocialLogin.initialize as jest.Mock).mockClear();
        await (component as any).initSocialLogin();

        expect(SocialLogin.initialize).toHaveBeenCalled();
        const callArgs = (SocialLogin.initialize as jest.Mock).mock.calls[0][0];

        // Google provider: must have webClientId and mode
        expect(callArgs.google).toBeDefined();
        expect(callArgs.google.webClientId).toBe(GOOGLE_WEB_CLIENT_ID);
        expect(callArgs.google.mode).toBe('online');

        // Facebook provider: must have appId AND clientToken (both required by native plugin)
        expect(callArgs.facebook).toBeDefined();
        expect(callArgs.facebook.appId).toBe(FACEBOOK_APP_ID);
        expect(callArgs.facebook.clientToken).toBe(FACEBOOK_CLIENT_TOKEN);

        expect((component as any).socialLoginInitialized).toBe(true);
      });

      it('should not re-initialize if already initialized', async () => {
        (component as any).socialLoginInitialized = true;
        (SocialLogin.initialize as jest.Mock).mockClear();

        await (component as any).initSocialLogin();

        expect(SocialLogin.initialize).not.toHaveBeenCalled();
      });
    });
  });
});
