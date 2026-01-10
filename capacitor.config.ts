import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bnapier.clarity',
  appName: 'Clarity',
  webDir: 'dist/client',
  ios: {
    scheme: 'Clarity',
  },
  server: {
    // Uncomment for live reload (use your local IP)
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
  },
  plugins: {
    App: {
      // Deep link handling configured via Info.plist URL schemes
    },
  },
};

export default config;
