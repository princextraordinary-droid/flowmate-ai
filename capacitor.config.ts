import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flowmate.ai',
  appName: 'flowmate',
  webDir: 'dist'
  server: {
    androidScheme: 'https'
  }
};

export default config;
