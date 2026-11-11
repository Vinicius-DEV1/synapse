import { EdgeInsets } from 'react-native-safe-area-context';

export function getInjectedJavaScript(insets: EdgeInsets): string {
  return `
    (function() {
      window.__CADERNO_MOBILE_WEBVIEW__ = true;
      window.__CADERNO_PLATFORM__ = 'mobile-webview';

      // Set safe area CSS variables for notches and home indicators
      document.documentElement.style.setProperty('--safe-area-top', '${insets.top}px');
      document.documentElement.style.setProperty('--safe-area-bottom', '${insets.bottom}px');
      document.documentElement.style.setProperty('--safe-area-left', '${insets.left}px');
      document.documentElement.style.setProperty('--safe-area-right', '${insets.right}px');

      // Native app touch and select CSS resets
      var style = document.createElement('style');
      style.id = 'caderno-mobile-injected-styles';
      style.innerHTML = \`
        * {
          -webkit-tap-highlight-color: transparent !important;
        }
        button, a, [role="button"], input[type="button"], input[type="submit"] {
          touch-action: manipulation;
        }
        body, html {
          -webkit-touch-callout: none;
          overscroll-behavior-y: none;
          -webkit-user-select: none;
          user-select: none;
        }
        input, textarea, [contenteditable="true"], .selectable, .select-text, .select-text *, [data-selectable="true"], .ProseMirror, .ProseMirror * {
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
    })();
    true;
  `;
}
