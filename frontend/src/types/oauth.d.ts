declare global {
  interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    use_fedcm_for_prompt?: boolean;
    cancel_on_tap_outside?: boolean;
    auto_select?: boolean;
  }

  interface GoogleCredentialResponse {
    credential?: string;
    select_by?: string;
  }

  interface GoogleButtonConfig {
    type?: string;
    size?: string;
    theme?: string;
    text?: string;
    shape?: string;
  }

  interface GoogleAccountsId {
    initialize(config: GoogleIdConfiguration): void;
    prompt(): void;
    renderButton(element: HTMLElement, config: GoogleButtonConfig): void;
    disableAutoSelect(): void;
  }

  interface Google {
    accounts: {
      id: GoogleAccountsId;
    };
  }

  interface FacebookAuthResponse {
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
    signedRequest?: string;
  }

  interface FacebookLoginResponse {
    authResponse?: FacebookAuthResponse;
    status?: string;
  }

  interface FacebookLoginOptions {
    scope?: string;
  }

  interface Facebook {
    init(params: { appId: string; version: string }): void;
    login(callback: (response: FacebookLoginResponse) => void, options?: FacebookLoginOptions): void;
    api(path: string, callback: (response: unknown) => void): void;
  }

  interface Window {
    google?: Google;
    FB?: Facebook;
    fbAsyncInit?: () => void;
  }
}

export {};
