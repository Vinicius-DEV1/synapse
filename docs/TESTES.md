# Testing and Verification Guide

**Status:** Current command guide. Test counts and pass totals are intentionally omitted because they change with the checkout and package configuration.

## Test Ownership

| Target | Test runner | Command owner |
| --- | --- | --- |
| React Web and Tauri frontend | Vitest | Root npm workspace delegates to `apps/web-react/` |
| Shared Rust core and bridges | Cargo tests | Root Cargo workspace |
| Native Qt desktop | Qt Test through CTest | `apps/desktop-qt/CMakeLists.txt` |
| Native Android | Gradle/JUnit and instrumentation tests | `apps/mobile-android/` |
| Expo WebView shell | Expo/React Native test setup where present | `apps/mobile-webview/` |

A test suite existing in one target does not validate a different target. Keep results scoped to the command and app that produced them.

## React Web and Tauri Frontend

Run from the repository root:

```bash
# One focused test file or module directory
npm run test -- src/services/crypto.test.ts
npm run test -- src/components/library/

# Tests related to changed React files
npm run test:related -- src/services/crypto.ts

# Configured service, utility, hook, and API suite
npm run test:unit

# TypeScript and lint checks
npm run typecheck
npm run lint
```

The root npm scripts delegate to the `@synapse/web-react` workspace. See the root and app package manifests for the current command definitions. Run the full `npm test` suite only when requested or when the release gate requires it.

## Shared Rust Core and Bridges

Run focused Rust tests when changing a crate:

```bash
cargo test -p synapse-core crypto::tests --lib
cargo test -p synapse-core crypto::stream::tests --lib
cargo test -p synapse-bridge-qt test_crypto_ffi_roundtrips --lib
cargo check --manifest-path apps/web-react/src-tauri/Cargo.toml --lib
```

Use `cargo test --workspace` only for a workspace-wide regression gate. Build commands and platform prerequisites are documented in the [setup and build guide](./guides/setup-and-build.md).

## Native Qt Desktop

Configure the optional controller test target, build it, and run the registered priority-module suite:

```bash
cmake -S apps/desktop-qt -B apps/desktop-qt/build \
  -DSYNAPSE_BUILD_NATIVE_TESTS=ON -DCMAKE_BUILD_TYPE=Release
cmake --build apps/desktop-qt/build --config Release --target synapse-desktop-tests
ctest --test-dir apps/desktop-qt/build -R native-priority-modules --output-on-failure
```

Use a disposable SQLite database for application smoke checks. See [the desktop app guidance](../apps/desktop-qt/AGENTS.md) for database path isolation.

The native vault test covers selected field protection, managed file/book/video/subtitle migration, recovery from a pending asset journal, fail-closed rejection of unmanaged external assets, lock behavior, password change, and vault removal. These tests do not prove full SQLite encryption, cross-client journal recovery, or physical media erasure.

## Native Android and WebView Shell

From the native Android app:

```bash
cd apps/mobile-android
./gradlew testDebugUnitTest
./gradlew assembleDebug
```

Run instrumentation tests only on a configured emulator/device. For the Expo shell, use its own package scripts and verify URL handling, hardware-back behavior, safe areas, and native bridge messages separately from React module tests.

## Security and Performance Gates

- Read [the native encryption audit](./security/native-encryption-audit.md) before interpreting crypto tests as application-wide E2EE proof.
- Run `npm run check:budgets` for the configured web production budget.
- Run `npm run benchmark` for the configured web benchmark. These measurements do not establish Qt or Android performance.
- Do not publish a test count, coverage percentage, or performance number without recording the command, target, environment, and run date.
