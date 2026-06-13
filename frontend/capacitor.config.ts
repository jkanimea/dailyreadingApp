import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dailyreading.app',
  appName: 'Daily Reading',
  webDir: 'www',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '126956037492-0v2i92mj4q0ulko5u5io1bd5do619liu.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
