# Caderno Mobile WebView — Agent Guidelines & Architecture

> This repository houses the native Android shell (`caderno-mobile-webview`) built with **Expo SDK 54** (`expo ~54.0.37`), React Native 0.81.5, and `react-native-webview` 13.15.0.

## 1. Expo & React Native Versioning Standard
- **Active Version**: Expo SDK 54 (`https://docs.expo.dev/versions/v54.0.0/`).
- **React Native**: 0.81.5 / React 19.1.0.
- Do not introduce dependencies incompatible with Expo SDK 54. Verify all package additions against `npx expo install`.

## 2. Visual & Architectural Integrity
- **Color Consistency**: The application theme must strictly match Caderno's primary midnight canvas (`#0f0e17`, `bg-dark-bg`). Status bar, splash screen, and navigation backgrounds must never use arbitrary slates or grays.
- **Edge-to-Edge & Safe Areas**:
  - The native shell mounts the WebView edge-to-edge.
  - Safe area metrics (notches, camera cutouts, gesture bars) are measured via `useSafeAreaInsets()` from `react-native-safe-area-context` and communicated directly to the web application via CSS custom properties (`--safe-area-top`, `--safe-area-bottom`, etc.).
  - Avoid redundant native container padding that letterboxes the WebView.
- **Haptic Feedback**:
  - Respond to IPC messages of type `HAPTIC` using `expo-haptics` (`impactAsync`, `notificationAsync`, `selectionAsync`).

## 3. Navigation & Hardware Back Button Lifecycle
- On Android, `hardwareBackPress` must delegate to the web SPA via `window.__cadernoHandleBack()`.
- If the web SPA handled the action (e.g., closing drawers, dismissable modals, navigating subpages), prevent app exit.
- If unhandled, require a double-tap within 2000ms to exit (`ToastAndroid.show('Pressione novamente para sair', ToastAndroid.SHORT)`).

## 4. WebView Security & External URL Policy
- External links (YouTube, external documentation, third-party sites) must never replace the WebView instance; they must be launched via `Linking.openURL(url)` in the system browser.
- Only internal web application routes (`localhost`, `10.0.2.2`, `192.168.*`, `fourth-cirrus-468923-h7.web.app`), OAuth redirect endpoints, `blob:`, and `data:` URLs are allowed inside the WebView.
