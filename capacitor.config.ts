import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clarity.app',
  appName: 'Clarity',
  webDir: 'dist/client',
  ios: {
    scheme: 'Clarity',
  },
  plugins: {
    App: {
      // Deep link handling configured via Info.plist URL schemes
    },
  },
};

export default config;
