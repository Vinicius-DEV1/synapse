# Android WebView Shell Guidance

This app is the Expo host for the React web client. Keep Android lifecycle, safe-area, hardware-back, external-link, and native capability integration here. Product modules belong in `../web-react/` or the fully native Compose app at `../mobile-android/`; the WebView renders the React structure and must not create mirrored copies. Follow the shared feature/action vocabulary in [the cross-app module structure guide](../../docs/architecture/module-structure.md).

## Package and app configuration

- The shell has its own `package.json`, lockfile, and Expo scripts; install and run it with the commands in [the repository layout guide](../../docs/architecture/repository-layout.md).
- Verify dependency compatibility with the Expo SDK pinned by `apps/mobile-webview/package.json` before changing package versions.
- `src/config/appConfig.ts` is the source of truth for development and production app URLs. Keep navigation validation in `App.tsx` synchronized with that configuration; do not copy a production host into additional docs or scripts.

## Native shell behavior

- Match the web canvas color `#0f0e17` in the native window, status bar, splash screen, and navigation bar.
- Measure Android safe areas with `useSafeAreaInsets()` and expose CSS custom properties to the WebView. Avoid applying the same inset in both the native container and web page.
- Route hardware back through `window.__cadernoHandleBack()` and allow the web app to consume the event before the shell exits.
- Handle `HAPTIC` messages with `expo-haptics` and retain the shell's app lifecycle cleanup.

## Navigation and security

- Treat `apps/mobile-webview/App.tsx` as the source for the current in-WebView URL allowlist and external-link behavior. Update and review the actual allowlist whenever `AppConfig` origins change; `originWhitelist` alone is not a navigation security boundary.
- External links should open in the system browser. Report or surface failures rather than silently swallowing URL-opening errors.
- Keep file access and IPC behavior bounded to the app's intended origins and capabilities. Do not add product persistence or duplicate module screens to this shell.

Follow the repository [engineering rules](../../AGENTS.md), [application boundaries](../AGENTS.md), and [cross-app module structure](../../docs/architecture/module-structure.md).
