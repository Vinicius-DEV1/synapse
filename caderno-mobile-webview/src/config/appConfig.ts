import { Platform } from 'react-native';

export const AppConfig = {
  // In development, you can point to your local machine IP (e.g., http://192.168.1.X:5173) or web production URL
  // Default to localhost for Android emulator / iOS simulator, or live web build
  DEV_SERVER_URL: Platform.OS === 'android' ? 'http://10.0.2.2:5173' : 'http://localhost:5173',
  PROD_WEB_URL: 'https://fourth-cirrus-468923-h7.web.app',
  
  // Choose whether to use dev server in __DEV__ mode
  getWebUrl(): string {
    if (__DEV__) {
      return this.DEV_SERVER_URL;
    }
    return this.PROD_WEB_URL;
  }
};
