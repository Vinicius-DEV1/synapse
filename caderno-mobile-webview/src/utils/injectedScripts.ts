import { EdgeInsets } from 'react-native-safe-area-context';

export function getInjectedJavaScript(insets: EdgeInsets): string {
  return `
    (function() {
      // 1. Mark runtime environment
      window.__CADERNO_MOBILE_WEBVIEW__ = true;
      window.__CADERNO_PLATFORM__ = 'mobile-webview';

      // 2. Set safe area CSS custom properties
      document.documentElement.style.setProperty('--safe-area-top', '${insets.top}px');
      document.documentElement.style.setProperty('--safe-area-bottom', '${insets.bottom}px');
      document.documentElement.style.setProperty('--safe-area-left', '${insets.left}px');
      document.documentElement.style.setProperty('--safe-area-right', '${insets.right}px');

      // 3. Inject base mobile-first CSS resets
      var style = document.createElement('style');
      style.id = 'caderno-mobile-injected-styles';
      style.innerHTML = \`
        * {
          -webkit-tap-highlight-color: transparent !important;
        }
        body, html {
          -webkit-touch-callout: none !important;
          overscroll-behavior-y: none !important;
          -webkit-user-select: none;
          user-select: none;
        }
        input, textarea, [contenteditable="true"], .selectable, .ProseMirror {
          -webkit-user-select: text !important;
          user-select: text !important;
        }
      \`;
      if (document.head) {
        document.head.appendChild(style);
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          document.head.appendChild(style);
        });
      }

      // 4. Setup RPC Promise registry
      window.__cadernoCallbacks = window.__cadernoCallbacks || {};

      window.__cadernoBridgeSend = function(type, payload) {
        return new Promise(function(resolve, reject) {
          var id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          window.__cadernoCallbacks[id] = { resolve: resolve, reject: reject };
          
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              id: id,
              type: type,
              payload: payload
            }));
          } else {
            reject(new Error('ReactNativeWebView not available'));
          }
        });
      };

      window.__cadernoBridgeReceive = function(res) {
        if (!res || !res.id) return;
        var cb = window.__cadernoCallbacks[res.id];
        if (cb) {
          delete window.__cadernoCallbacks[res.id];
          if (res.success) {
            cb.resolve(res.data);
          } else {
            cb.reject(new Error(res.error || 'Bridge call failed'));
          }
        }
      };

      // Notify webapp that native environment is primed
      window.dispatchEvent(new CustomEvent('caderno-bridge-ready'));
    })();
    true; // Required by React Native WebView
  `;
}
