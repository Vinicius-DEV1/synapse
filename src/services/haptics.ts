/**
 * Haptic Feedback Service
 * Triggers native haptic vibrations via Mobile WebView RPC or browser navigator.vibrate
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export function triggerHaptic(style: HapticStyle = 'light'): void {
  try {
    if (typeof window === 'undefined') return;

    if ((window as any).ReactNativeWebView?.postMessage) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'HAPTIC',
          payload: { style },
        })
      );
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Web vibration fallback on Android browsers
      const duration = style === 'selection' || style === 'light' ? 10 : style === 'medium' ? 25 : 40;
      navigator.vibrate(duration);
    }
  } catch {
    // Fail silently on unsupported environments
  }
}
