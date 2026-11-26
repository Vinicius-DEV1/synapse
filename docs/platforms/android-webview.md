# Android WebView Shell

`apps/mobile-webview/` is an Expo/React Native host for the React web application. It embeds the configured web origin in Android WebView and provides the native shell behavior needed by that page. It is not a second implementation of product modules and should not own duplicate domain models or business rules.

## Source boundaries

| Layer | Location | Responsibility |
| --- | --- | --- |
| Expo application | `apps/mobile-webview/App.tsx` | WebView lifecycle, navigation policy, safe area, back and native messages |
| URL configuration | `apps/mobile-webview/src/config/appConfig.ts` | Development/production app origins |
| Product UI and browser logic | `apps/web-react/` | React routes, views, state and web adapters |
| Native shell integrations | Expo packages in `apps/mobile-webview/` | Status/system UI, haptics, safe-area insets and external links |

The shell has its own package manifest and lockfile. It should validate WebView navigation against the configured app origins, open external links in the system browser, and expose only bounded native message handlers.

## Platform behavior

- Match the application canvas `#0f0e17` across the WebView, splash, status/navigation bars and native background.
- Apply safe-area insets once. The shell injects CSS custom properties for the web application; avoid duplicating the same padding in both native layout and web CSS.
- Route Android hardware-back events to the React handler first. Close the most specific web overlay before allowing the shell or operating system to navigate away.
- Keep haptics and other shell capabilities behind validated messages with explicit lifecycle cleanup.
- Use responsive CSS and capability detection in the web client; do not add scattered user-agent layout checks in the shell.

## Persistence and security boundary

The shell hosts React and may configure native system integrations, but product records and module flows remain owned by the React client and its platform adapters. Do not expose unrestricted JavaScript interfaces, sensitive keys or filesystem access to arbitrary origins. Verify origin changes in the app configuration and the actual navigation checks together.

## Build and verification

Install and start this independent Expo package using [Setup and build](../guides/setup-and-build.md). Validate Android WebView behavior on a device for back navigation, safe areas, external URLs, keyboard resizing, app resume and shell messages; Expo Web preview is not equivalent to Android WebView.
