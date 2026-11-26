# Shared Core and Platform Bridges

`core/synapse-core/` is the canonical Rust domain and persistence layer. Client code owns presentation and platform lifecycle; the Core owns shared domain entities, calculations, SQLite schema/migrations and repository operations when a domain has been migrated.

## Call paths

| Client | UI/orchestration | Boundary into shared domain |
| --- | --- | --- |
| React in browser | React components, hooks and service adapters | Browser services and IndexedDB; Core/WASM only where implemented |
| React in Tauri | React components and typed app API | Tauri IPC commands delegate to Core where migrated |
| Qt desktop | QML and thin C++ controllers | `bridge-qt` typed native API into Core |
| Native Android | Compose and feature ViewModels/stores | `bridge-uniffi` bindings into Core |
| Android WebView shell | React client hosted by Expo | Same web client boundary; shell messages expose only native capabilities |

## Core ownership rules

- Keep domain models, calculations, query behavior and persistence APIs in Core when they are shared by clients.
- Keep platform-specific rendering, permissions, paths, media surfaces, windowing and lifecycle handling in the owning app.
- Keep bridge contracts typed, narrow and organized by domain. Bridge code converts representations and errors; it must not become a second domain implementation.
- Do not claim a client uses Core for a capability until its actual call path reaches a Core API. Audited direct SQL and web-only algorithms remain explicit gaps.
- Keep cryptographic ownership and data coverage entity-specific. A shared primitive does not mean every client or stored field is encrypted.

## Change workflow

Before changing a shared behavior, trace the React service/IPC path, Qt bridge path, UniFFI path and browser fallback for that capability. Add or update Core tests for shared behavior, then verify each adapter's contract. For presentation-only changes, test the owning client without duplicating canonical business logic.

The current file ownership, build prerequisites and test commands are described in [Repository layout](../architecture/repository-layout.md), [Setup and build](../guides/setup-and-build.md), and [Testing and quality](../guides/testing-and-quality.md).
