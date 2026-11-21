# 🧪 Testing & Quality Assurance Guide

**Status:** Active Reference  
**Last Reviewed:** 2026-11-21

This guide documents the testing architecture, verification commands, mocking boundaries, and quality gates across all four **Synapse** application targets and the unified Rust core (`core/synapse-core/`).

---

## 1. Testing Philosophy & Sub-Second Feedback

1. **Targeted Execution First**:
   - During iterative development and bug fixes, **never run the full global test suite (`npm test`) on every turn**. Run targeted unit or integration tests for the modified module to get feedback in 1–3 seconds.
2. **Behavior Over Implementation Details**:
   - Tests validate business logic, cryptographic round-trips, database migrations, state transitions, error recovery, and user interactions rather than shallow DOM structure assertions.
3. **Clean Platform Boundary Mocks**:
   - Mock external platform boundaries (Tauri IPC `invoke`, IndexedDB, Firebase Auth/Firestore, Google Drive, FFmpeg) at the adapter interface level (`window.api` or service adapters).

---

## 2. Frontend & Hybrid Desktop Tests (`apps/web-react/`)

The React client uses **Vitest**, **React Testing Library**, **jsdom**, and **fake-indexeddb**.

### 2.1. Targeted Test Commands (Run from Repository Root)

```bash
# Run a single test file (~1-2s)
npm run test -- src/services/crypto.test.ts

# Run all tests in a feature directory (~1-3s)
npm run test -- src/components/notes/

# Run tests related to modified files
npm run test:related -- src/store/useStore.tsx

# Run the core services, hooks, and domain unit test suite
npm run test:unit

# Generate v8 code coverage report
npm run test:coverage
```

### 2.2. Static Analysis, Type Checking & Bundle Gates

```bash
# Strict TypeScript contract verification across frontend and IPC types
npm run typecheck

# ESLint static analysis (zero warnings enforcement on touched files)
npx --prefix apps/web-react eslint --max-warnings 0 apps/web-react/src/<path>

# Production build and bundle size budget verification
npm run build && npm run check:budgets
```

---

## 3. Unified Rust Core & Tauri Backend Tests (`core/` & `src-tauri/`)

The Rust workspace houses canonical domain models, FSRS scheduling, AES-256-GCM / PBKDF2 cryptography, ENC1 media streaming, SQLite WAL migrations, and platform bridges.

```bash
# Run all tests in the unified Rust domain core
cargo test -p synapse-core --lib

# Run targeted database migration and notes domain tests
cargo test --manifest-path core/synapse-core/Cargo.toml -- db:: domain::notes::

# Run ENC1 encrypted media streaming tests
cargo test -p synapse-core crypto::stream::tests --lib

# Run Tauri backend unit tests (WAL pool, sync query planner, encrypted:// protocol, stream CORS)
cargo test --manifest-path apps/web-react/src-tauri/Cargo.toml

# Run Qt C-ABI bridge and UniFFI bridge tests
cargo test -p synapse-bridge-qt --lib
cargo test -p synapse-bridge-uniffi --lib
```

---

## 4. Native Qt 6 Desktop Tests (`apps/desktop-qt/`)

The native Qt 6 client includes C++ controller unit tests (backed by isolated temporary SQLite databases) and headless QML integration tests (`qmltestrunner` / CTest).

```bash
# Configure and build the native Qt test targets
cmake -S apps/desktop-qt -B apps/desktop-qt/build -DCMAKE_BUILD_TYPE=Release
cmake --build apps/desktop-qt/build --target synapse-desktop-tests synapse-notes-rich-qml-tests -j4

# Execute CTest suites headlessly
QT_QPA_PLATFORM=offscreen ctest --test-dir apps/desktop-qt/build \
  -R '^(native-priority-modules|native-notes-rich-qml|native-notes-table-qml)$' \
  --output-on-failure

# Validate QML syntax with qmllint
/usr/lib/qt6/bin/qmllint apps/desktop-qt/qml/<module>/*.qml
```

> [!IMPORTANT]
> When running manual UI smoke tests on `synapse-desktop`, always set `SYNAPSE_DATABASE_PATH` to a disposable temporary SQLite path so test runs never mutate the user's canonical database.

---

## 5. Native Android Tests (`apps/mobile-android/`)

The Kotlin/Jetpack Compose client validates generated UniFFI Rust bindings and local SQLite persistence via Gradle and Android Emulator instrumentation tests:

```bash
# Compile Kotlin sources and generated UniFFI bindings
apps/mobile-android/gradlew -p apps/mobile-android :app:compileDebugKotlin

# Build debug APK (compiles Rust bridge for arm64-v8a, x86_64, armeabi-v7a)
apps/mobile-android/gradlew -p apps/mobile-android :app:assembleDebug

# Run instrumented tests on a connected device or emulator
apps/mobile-android/gradlew -p apps/mobile-android :app:connectedDebugAndroidTest
```

---

## 6. Pre-Release & Commit Verification Checklist

Before concluding any multi-layer feature or bug fix:
1. `npm run typecheck` exits with `0`.
2. Targeted Vitest suites for all touched modules pass.
3. Targeted Cargo tests (`synapse-core`, `src-tauri`, or affected bridge) pass.
4. `npm run check:budgets` passes when frontend dependencies or chunks change.
5. `git diff --check` reports no whitespace or conflict marker errors.
