import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dailyreading.app',
  appName: 'Daily Reading',
  webDir: 'www',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '868571551367-kkm4ggn0d9cc457k6s0p9rhoipq1bkio.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
