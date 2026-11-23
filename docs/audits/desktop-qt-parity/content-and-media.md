# Content, Media, Provider, and Diagram Checklist

This checklist expands DESK-PAR-026 through DESK-PAR-029 and related existing findings. It separates real native functionality from visible placeholder flows so work can preserve the parts already implemented.

## Files audio playback — DESK-PAR-026

Current evidence: `FilesAudioPlayerModal.qml` advances a fixed 180-second QML timer and does not bind to media source or decoder.

- [ ] Identify the canonical source path/URI and encryption/decryption boundary for an audio file.
- [ ] Use a native media backend with actual duration, playback state, seek, volume, mute, end-of-file, and error events.
- [ ] Keep decryption keys out of QML and remove decrypted temporary assets on close/failure.
- [ ] Support unsupported MIME, corrupt media, missing file, vault lock, and concurrent preview handling.
- [ ] Test real short/long audio, seek, device loss, close during playback, and restart cleanup.
- [ ] Replace unsupported “native decoding / E2EE” claims until implementation proves them.

## Files upload and Drive state — DESK-PAR-011 follow-up

- [x] Replace timer-only folder import progress with per-file results from the import pipeline.
- [x] Decide desktop Drive support and expose connection state honestly; list metadata alone is not Drive synchronization.
- [x] Preserve local-only fallback and report partial Drive failures separately from local import success.
- [x] Verify nested folders, duplicate names, unsupported files, cancellation, and partial success.
- [x] Connect document AI only after content extraction, consent, size limits, and provider error behavior are defined.

## Culture search — DESK-PAR-027

Current evidence: `CultureMediaSearchModal.qml` was connected to real provider queries with debounced search, rate limiting, and normalizer.

- [x] Select supported metadata provider(s) and document provider-specific attribution/licensing.
- [x] Create a Qt-safe provider adapter with cancellation, timeout, rate limiting, and normalized results.
- [x] Validate URLs, image sizes/types, title/year/episode fields, and user edits before persistence.
- [x] Prevent duplicate catalog entries and make merge/keep-both behavior explicit.
- [x] Test empty results, ambiguous names, provider outage, rate limit, offline mode, and malicious/malformed responses.

## Diagram interoperability and export — DESK-PAR-014 and DESK-PAR-028

Current evidence: `DiagramImportModal.qml` parses and normalizes Excalidraw and Tldraw shapes into Qt diagram format, and export provides JSON and native PNG capture via `grabToImage`.

- [x] Inventory real persisted diagram data and create versioned fixtures before changing serialization.
- [x] Declare supported input/output formats accurately; remove labels for unsupported formats until conversion exists.
- [ ] Define canonical model or lossless adapter for React Tldraw and supported external formats.
- [x] Validate parsed structures before storing, preserve raw source for unsupported inputs, and never silently blank imported data.
- [x] Implement real PNG encoding and test file bytes, extension, transparency, bounds, and rendering.
- [x] Escape SVG text/attributes and cover every supported shape/tool in exported SVG.
- [ ] Round-trip React, Qt, Excalidraw, and Tldraw fixtures as applicable, including unknown shapes.

## Anki AI generation — DESK-PAR-029

Current evidence: `AnkiAIAssistantModal.qml` is connected to `AiClient.promptStructured` for real high-yield flashcard pair generation via Google Gemini.

- [x] Keep local template generation clearly labelled as offline helper or replace it with a provider-backed flow.
- [x] Reuse a secure provider boundary; API keys must not be held in QML properties.
- [x] Validate card schema, deck target, cloze/type/media constraints, duplicates, and transaction failure.
- [x] Provide preview, edit, select, import, cancellation, retry, rate-limit, and malformed-response behavior.
- [x] Test a large input, empty/invalid result, partial import failure, and user cancellation.

## Acceptance record

- [ ] Use real media and diagram fixtures, not placeholder data.
- [ ] Add Core/bridge/controller tests for persistence and error paths.
- [ ] Complete file-format and cross-client round trips where records are shared.
- [ ] Verify accessible labels, keyboard behavior, progress truthfulness, and cleanup.
- [ ] Update the corresponding DESK-PAR finding and feature matrix with reproducible evidence.
