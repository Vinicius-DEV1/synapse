import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  BackHandler,
  ToastAndroid,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { BridgeRouter } from './src/bridge/BridgeRouter';
import { getInjectedJavaScript } from './src/utils/injectedScripts';
import { AppConfig } from './src/config/appConfig';

// Prevent splash screen from auto hiding until WebView is primed
SplashScreen.preventAutoHideAsync().catch(() => {});

function MainWebView() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const lastBackPressRef = useRef<number>(0);

  const onAppReady = useCallback(async () => {
    setIsLoaded(true);
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  const bridgeRouter = useRef(new BridgeRouter(insets, onAppReady)).current;

  // Keep router insets updated
  useEffect(() => {
    bridgeRouter.updateInsets(insets);
  }, [insets]);

  // Safety fallback for splash screen: hide after 6s even if web app didn't send APP_READY
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressRef.current = now;
      ToastAndroid.show('Pressione novamente para sair', ToastAndroid.SHORT);
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const handleMessage = async (event: WebViewMessageEvent) => {
    const rawData = event.nativeEvent.data;
    if (!rawData) return;

    const response = await bridgeRouter.handleMessage(rawData);

    // Send response back to WebView JS promise registry
    if (webViewRef.current) {
      const responseStr = JSON.stringify(response);
      webViewRef.current.injectJavaScript(
        `window.__cadernoBridgeReceive && window.__cadernoBridgeReceive(${responseStr}); true;`
      );
    }
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('[WebView Error]', nativeEvent);
    setHasError(true);
    setErrorMessage(nativeEvent.description || 'Não foi possível carregar a aplicação.');
    SplashScreen.hideAsync().catch(() => {});
  };

  const handleReload = () => {
    setHasError(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const targetUri = AppConfig.getWebUrl();

  return (
    <View style={[styles.container, { backgroundColor: '#0f172a' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={false} />

      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Caderno</Text>
          <Text style={styles.errorText}>
            Não foi possível conectar ao servidor da aplicação:
          </Text>
          <Text style={styles.errorDetails}>{errorMessage}</Text>
          <Text style={styles.errorHint}>URL: {targetUri}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: targetUri }}
          style={styles.webView}
          injectedJavaScriptBeforeContentLoaded={getInjectedJavaScript(insets)}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 400) {
              console.warn('[WebView HTTP Error]', nativeEvent.statusCode);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          bounces={false}
          overScrollMode="never"
          allowsBackForwardNavigationGestures={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          originWhitelist={['*']}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          )}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainWebView />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
