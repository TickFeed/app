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
    // Allow cleartext in dev so the app can hit localhost backend
    cleartext: true,
    androidScheme: 'https',
  },
};

export default config;
