import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tickfeed.app',
  appName: 'TickFeed',
  // Next.js static export goes to 'out/' when CAPACITOR_BUILD=1
  webDir: 'out',
  android: {
    buildOptions: {
      keystorePath: 'tickfeed-release.keystore',
    },
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '505546758075-0comisfdccekcevt8b59qba5l01ku0qg.apps.googleusercontent.com',
      serverClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '505546758075-0comisfdccekcevt8b59qba5l01ku0qg.apps.googleusercontent.com',
    },
    Keyboard: {
      // Resize body only so bottom nav stays fixed while content shrinks above keyboard
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#09090b',
      showSpinner: false,
    },
  },
};

export default config;
