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
    url: 'https://tickfeed.in',
    cleartext: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Android uses its own Web OAuth client from the tickfeed-7aa84 project (matches google-services.json).
      // Falls back to the PWA's client ID for non-native builds where this config is still loaded.
      clientId:
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        '79172195978-19damdcsb99g879tab8glrdm6jk61go0.apps.googleusercontent.com',
      serverClientId:
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        '79172195978-19damdcsb99g879tab8glrdm6jk61go0.apps.googleusercontent.com',
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
