# Native Ecosystem Migration Status

**Status:** The native migration is in progress. This page is an index, not proof that any app or module is complete.

## Application Targets

| Target | Current role | Current status source |
| --- | --- | --- |
| React Web and Tauri | Original web client and hybrid desktop shell | Root and §apps/web-react/package.json§; Tauri Rust package |
| Qt Desktop | Fully native desktop client | [Native desktop parity matrix](../native-desktop-parity.md) |
| Kotlin/Compose Android | Fully native Android client | Android source and Gradle build; module parity still requires independent review |
| Expo/WebView Android | Shell for the React web app | §apps/mobile-webview/§ and its app-level guidance |

Shared Rust code is located in §core/synapse-core/§; platform bindings live in §bridges/§. The Rust core currently contains shared database, crypto, FSRS, and video capabilities. It does not yet contain every product module's business logic.

## Verified Status and Open Work

- Qt module coverage remains partial; use the parity matrix for individual gaps and acceptance criteria.
- Qt vault setup now migrates referenced media from the managed §files/§, §library/§, and §videos/§ directories with a persistent recovery journal.
- Local at-rest encryption remains partial. Sensitive business records and some metadata remain plaintext, and external assets are not migrated automatically. See the [native encryption audit](../security/native-encryption-audit.md).
- Android-native module parity and cross-client migration behavior are not certified by the Qt matrix.
- No blanket guarantee of identical visuals, zero bugs, full feature parity, or repository-wide E2EE is supported by the current evidence.

## Build and Review

Use the [setup and build guide](../guides/setup-and-build.md) for current commands. Use the parity matrix and security audit as the current completion gates. Historical test counts, personal database sizes, and old module checkboxes have been removed from this status page.
