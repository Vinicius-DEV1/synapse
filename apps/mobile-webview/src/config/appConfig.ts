import { Platform } from 'react-native';

export const AppConfig = {
  // Alterar para true apenas se estiver rodando 'npm run dev' no computador
  USE_LOCAL_DEV: false,

  // Endereço local de desenvolvimento (Android Emulator: 10.0.2.2 | Celular Físico: IP do seu PC, ex: http://192.168.1.X:5173)
  DEV_SERVER_URL: Platform.OS === 'android' ? 'http://10.0.2.2:5173' : 'http://localhost:5173',

  // URL de produção na nuvem (Firebase Hosting)
  PROD_WEB_URL: 'https://fourth-cirrus-468923-h7.web.app',
  
  getWebUrl(): string {
    if (this.USE_LOCAL_DEV) {
      return this.DEV_SERVER_URL;
    }
    return this.PROD_WEB_URL;
  }
};
