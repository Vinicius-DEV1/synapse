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
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { getInjectedJavaScript } from './src/utils/injectedScripts';
import { AppConfig } from './src/config/appConfig';

SplashScreen.preventAutoHideAsync().catch(() => {});

function MainWebView() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const lastBackPressRef = useRef<number>(0);

  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Fallback: hide splash after 4 seconds
  useEffect(() => {
    const timer = setTimeout(hideSplash, 4000);
    return () => clearTimeout(timer);
  }, [hideSplash]);

  // Handle Android hardware back button with SPA in-app navigation
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (webViewRef.current) {
        // Send back request to web app in SPA
        const script = `
          (function() {
            var handled = false;
            if (typeof window.__cadernoHandleBack === 'function') {
              handled = window.__cadernoHandleBack();
            }
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'BACK_PRESS_RESULT',
                handled: !!handled
              }));
            }
          })();
          true;
        `;
        webViewRef.current.injectJavaScript(script);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const handleMessage = async (event: WebViewMessageEvent) => {
    const rawData = event.nativeEvent.data;
    if (!rawData) return;

    try {
      const msg = JSON.parse(rawData);
      if (msg.type === 'APP_READY') {
        hideSplash();
      } else if (msg.type === 'OPEN_URL' && msg.payload?.url) {
        Linking.openURL(msg.payload.url).catch(() => {});
      } else if (msg.type === 'HAPTIC') {
        const style = msg.payload?.style || 'light';
        if (style === 'selection') Haptics.selectionAsync().catch(() => {});
        else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        else if (style === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        else if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        else if (style === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        else if (style === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else if (msg.type === 'BACK_PRESS_RESULT' || msg.type === 'BACK_PRESS_HANDLED') {
        if (!msg.handled) {
          if (canGoBack && webViewRef.current) {
            webViewRef.current.goBack();
          } else {
            const now = Date.now();
            if (now - lastBackPressRef.current < 2000) {
              BackHandler.exitApp();
            } else {
              lastBackPressRef.current = now;
              ToastAndroid.show('Pressione novamente para sair', ToastAndroid.SHORT);
            }
          }
        }
      }
    } catch {
      // Non-JSON message, ignore
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
    hideSplash();
  };

  const handleReload = () => {
    setHasError(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const targetUri = AppConfig.getWebUrl();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={true} />

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
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url;
            // Allow internal app navigation, blob URLs, data URLs, and Google Auth
            if (
              url.startsWith('http://localhost') ||
              url.startsWith('http://10.0.2.2') ||
              url.startsWith('http://192.168.') ||
              url.startsWith('https://fourth-cirrus-468923-h7') ||
              url.startsWith('https://accounts.google.com') ||
              url.startsWith('https://apis.google.com') ||
              url.startsWith('blob:') ||
              url.startsWith('data:') ||
              url.startsWith('about:blank')
            ) {
              return true;
            }
            // Open external URLs (e.g. YouTube, external research links) in native device browser
            Linking.openURL(url).catch(() => {});
            return false;
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
          textZoom={100}
          cacheEnabled={true}
          androidLayerType="hardware"
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
