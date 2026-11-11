# React and Tauri App Guidance

This app owns the original React 19 web client, Vite configuration, static assets, and its Tauri v2 Rust shell. Follow the root [engineering rules](../../AGENTS.md) and [application workspace boundaries](../AGENTS.md).

- Frontend source: `src/`; static assets: `public/`.
- Tauri commands and backend: `src-tauri/`; shared Rust logic: `../../core/synapse-core/`.
- Run frontend scripts from the repository root so npm uses the root lockfile: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run test -- src/...`, and `npm run lint`.
- Do not add an app-local npm lockfile. The root workspace owns dependencies for this app.
- The separate Expo/WebView client is `../mobile-webview/` and has its own package manifest and lockfile.
- Native Qt and native Compose clients are sibling apps and use their own build systems.

Keep the React architecture's layer roots (`components/`, `hooks/`, `store/`, `services/`, and `api/`) intact. Group module UI under the canonical module ID; module service directories should use the same ID when the service is feature-owned. The `notes`, `library`, `video`, and `questions` UI roots are named consistently with the native clients. See [the cross-app module structure guide](../../docs/architecture/module-structure.md) before changing a module path.

See [the repository layout guide](../../docs/architecture/repository-layout.md) for cross-app ownership and build commands.

The React client is the functional and visual reference for native parity work. Keep the [native desktop parity matrix](../../docs/native-desktop-parity.md) synchronized when a shared behavior changes, and consult [documentation status](../../docs/documentation-status.md) before making cross-platform security or completion claims.
