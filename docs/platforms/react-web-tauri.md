# React Web and Tauri Desktop

`apps/web-react/` is the source for the React product UI used in browsers and inside the Tauri desktop shell. The same React feature components run in both environments; platform adapters select browser services or native Tauri APIs. The web client is the reference for Desktop Qt parity and must remain unchanged during Qt-only parity work.

## Source boundaries

| Layer | Location | Responsibility |
| --- | --- | --- |
| React presentation | `apps/web-react/src/components/` | Routes, feature views, reusable controls and dialogs |
| React orchestration | `apps/web-react/src/hooks/`, `src/store/` | Component lifecycle, state selection and feature coordination |
| Platform-neutral web services | `apps/web-react/src/services/`, `src/api/` | Browser/Tauri adapters, persistence clients and external services |
| Tauri application shell | `apps/web-react/src-tauri/` | Native windowing, plugins, IPC commands and desktop packaging |
| Shared domain | `core/synapse-core/` | Canonical Rust domain and persistence capabilities where integrated |

The browser build stores local data in IndexedDB and uses browser APIs. The Tauri build exposes native functionality through IPC and uses the desktop database path. Components should depend on typed app APIs, not call Tauri plugins or `invoke()` directly.

## Tauri execution model

Tauri command handlers form an infrastructure boundary between React and native services. Database work uses SQLite WAL through the Tauri database layer; the current architecture uses a writer connection and a read-only pool. Commands should validate inputs, delegate domain work to Core, and return typed results. Some legacy commands still contain direct SQL or duplicated operations; their removal is an ongoing architecture task, so do not claim complete Core delegation.

## Browser execution model

Browser capability checks select web-compatible adapters. Local persistence uses IndexedDB; network synchronization uses the configured Firebase/Firestore client. Platform-only capabilities must have a defined browser fallback or a visible unavailable state. Core/WASM coverage is partial; algorithms without a shared compiled implementation remain in web-only services.

## Parity and dialogs

React defines the expected user-visible flow for Qt parity, including dialogs and overlays. When comparing a modal, record its entry point, size and placement, backdrop, scroll bounds, sections, field defaults, validation and loading/error/empty states, action labels/order, confirm/cancel effects, keyboard dismissal, initial focus and focus restoration. Compare the same viewport and scale. Qt should reproduce these behaviors with native Qt Quick controls and the shared design tokens; platform conventions can change only when the user-visible intent and accessibility remain equivalent.

## Build and verification

Use the commands in [Setup and build](../guides/setup-and-build.md) and [Testing and quality](../guides/testing-and-quality.md). Root npm scripts target the `@synapse/web-react` workspace. Do not use a Web build as proof of Tauri plugin or native database behavior.
