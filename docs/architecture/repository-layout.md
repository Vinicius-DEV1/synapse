# Repository Layout

Synapse keeps each distributable app in `apps/`, shared Rust logic in `core/`, and platform bindings in `bridges/`. The root contains shared documentation, automation, the Cargo workspace, and the npm command facade.

## Application ownership

| Path | Product and responsibility | Build/dependency owner |
| --- | --- | --- |
| `apps/web-react/` | React web app and Tauri v2 hybrid desktop app; Core delegation is still being completed, and some legacy commands contain direct SQL or duplicated operations (see the [React Web and Tauri guide](../platforms/react-web-tauri.md)) | Root npm workspace and `apps/web-react/src-tauri/` Cargo package |
| `apps/desktop-qt/` | Fully native Qt 6 desktop app with thin C++ controllers | CMake/Qt, linked to high-level domain APIs in `bridges/bridge-qt/` |
| `apps/mobile-android/` | Fully native Kotlin/Compose Android app | Gradle, linked to UniFFI output from `bridges/bridge-uniffi/` |
| `apps/mobile-webview/` | Expo shell that embeds the React web app in Android WebView | Independent npm lockfile and Expo CLI |
| `core/synapse-core/` | Unified Rust core: domain entities, business calculations, SQLite schema/migrations, and repository persistence (Single Source of Truth) | Root Cargo workspace |
| `bridges/` | Qt C ABI / typed domain adapters, UniFFI, and WebAssembly adapters | Root Cargo workspace |

Do not move product code into the repository root. Keep cross-product domain logic and persistence platform-neutral in `core/` and expose platform APIs through the appropriate bridge. The React app owns its web and Tauri source trees together because the Tauri shell bundles that frontend.

## Root commands

The root npm scripts delegate to the `@synapse/web-react` workspace. Run these from the repository root:

```bash
npm install
npm run dev
npm run typecheck
npm run test -- src/services/crypto.test.ts
npm run test:related -- src/services/crypto.ts
npm run build
npm run build:web
npm run tauri -- dev
npm run tauri -- build
```

`npm run build:web` writes to `apps/web-react/dist-web/`. Tauri bundle output is managed by Cargo under the root `target/` directory. Web environment variables belong in `apps/web-react/.env`; start from `apps/web-react/.env.example`.

## Native app commands

```bash
cmake -S apps/desktop-qt -B apps/desktop-qt/build
cmake --build apps/desktop-qt/build --config Release

cd apps/mobile-android
./gradlew assembleDebug

cd ..
npm --prefix apps/mobile-webview install
npm --prefix apps/mobile-webview run start

cargo test --workspace
```

Cross-product helper scripts remain in `tools/scripts/`. They resolve paths from the repository root and target the same app directories listed above.

See [the cross-application module structure guide](./module-structure.md) for canonical module IDs, source locations by layer, and rules for keeping module organization aligned across clients.

## Repository-level services

`firebase.json`, Firestore rules, `Dockerfile`, `docker-compose.yml`, and `nginx.conf` remain at the root because they configure deployment for the React web build. Firebase Hosting serves `apps/web-react/dist-web/`; Docker copies that same output into Nginx.
