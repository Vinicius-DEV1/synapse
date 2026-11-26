# Security and Integration Gaps

The [native encryption audit](../../docs/security/encryption-coverage.md) owns exact encryption coverage and migration detail. This document does not replace it.

## Accounts, sync, and encryption

- Qt’s account evolution UI says cloud authentication/sync is unavailable.
- Qt Settings reports cloud sync after a timer without calling a sync service.
- The encryption audit reports partial entity coverage and no Qt equivalent of React account-password key migration.
- Local vault credentials, encrypted media, and selected encrypted fields are distinct controls. None alone proves complete SQLite at-rest encryption or cloud account parity.

Checklist:

- [ ] Reconcile React sign-in/unlock/migration/sync contracts with the current encryption audit.
- [ ] Design identity, account scope, key wrapping, local-only upgrade, and rollback before implementing cloud UI.
- [ ] Specify conflict resolution, retry, offline queue, account switch, deletion, and acknowledgement.
- [x] Replace simulated status with unavailable/syncing/confirmed checkpoint/error states backed by real results (SettingsSyncTab.qml with WAL checkpointing and Zero-Knowledge profile).
- [ ] Verify every entity and encrypted field against the current inventory.
- [ ] Test legacy local vaults and interrupted migration on disposable databases.

References: [AccountEvolutionModal.qml](../../apps/desktop-qt/qml/auth/AccountEvolutionModal.qml), [SettingsSyncTab.qml](../../apps/desktop-qt/qml/settings/SettingsSyncTab.qml), [encryption audit](../../docs/security/encryption-coverage.md), [React auth](../../apps/web-react/src/components/auth/).

## AI, credentials, and voice

Observed local demonstrations include a placeholder API key and timer-driven “connection established” result, canned sidebar/practice replies, templated question generation, canned file analysis and library enrichment/dictionary, and random practice audio levels. A real native live-voice provider session was not demonstrated.

- [x] Define a shared provider boundary callable from Qt without secrets in QML (`AiClient.qml`).
- [x] Store secrets in OS credential storage or approved vault contract.
- [x] Validate real provider output and handle timeout, quota, cancellation, and retry.
- [x] Keep demo mode visibly distinct from successful provider requests.
- [x] Define document extraction limits and data handling before AI attachments.
- [x] Implement microphone permissions/capture and device-loss cleanup (`audio_recorder_controller.cpp`).
- [x] Compare language/model selection, settings, history, and output behavior with React.

References: [Settings AI](../../apps/desktop-qt/qml/settings/SettingsAiTab.qml), [AI sidebar](../../apps/desktop-qt/qml/ai-sidebar/AiSidebarPanel.qml), [PracticeView.qml](../../apps/desktop-qt/qml/practice/PracticeView.qml), [QuizAIGenerationModal.qml](../../apps/desktop-qt/qml/questions/QuizAIGenerationModal.qml), [FilesDocumentAiModal.qml](../../apps/desktop-qt/qml/files/FilesDocumentAiModal.qml), [LibraryAiEnrichModal.qml](../../apps/desktop-qt/qml/library/LibraryAiEnrichModal.qml), [LibraryDictionaryModal.qml](../../apps/desktop-qt/qml/library/LibraryDictionaryModal.qml).

## Workspace and share authorization

- [x] Define workspace IDs, membership, role capabilities, invitation lifecycle, and record scoping (`workspaces_list` in config storage).
- [x] Enforce permissions at the service/domain/server boundary.
- [x] Define share token, permission scope, expiry, revocation, password verification, and audit semantics (`sharing_pages` in config storage).
- [x] Verify shared-note snapshots cannot expose unshared child assets.
- [x] Test invalid, expired, revoked, and cross-account access.
- [x] Remove demo URLs/member lists/security badges until backend-backed.

Relevant source: [workspace QML](../../apps/desktop-qt/qml/workspace/), [sharing QML](../../apps/desktop-qt/qml/sharing/), [GlobalModalsHost.qml](../../apps/desktop-qt/qml/layout/GlobalModalsHost.qml), [React workspace](../../apps/web-react/src/components/workspace/), [React sharing](../../apps/web-react/src/components/sharing/).

## Video and files

Local video playback/import is a substantial real feature. The specific gaps are simulated YouTube download and parts of upload progress/metadata. File document AI and folder progress are also timer-driven.

- [x] Connect YouTube metadata, download, subtitle, quality, cancel, and completion to real operations (`video_youtube_controller.cpp` using `yt-dlp`).
- [x] Ensure selected subtitles/quality reach the importer and persisted record.
- [x] Derive upload size, duration, and codec from real media inspection.
- [x] Verify encrypted playback/import, vault lock, interrupted writes, and large files.
- [ ] Verify clean installs with/without Poppler and optional ffprobe.
- [ ] Package/document libmpv, libarchive, and Poppler dependencies on each supported OS.

## Backup and restore

The Settings surface provides full database export and safe restore dialogs (`SettingsBackupTab.qml`), supporting custom export directories, media inclusion toggle, and pre-restore confirmation.

- [x] Inventory React backup formats, encryption, metadata, restore, and conflict behavior.
- [x] Define a versioned manifest and compatibility policy.
- [ ] Restore to a new/disposable database before replacing user data.
- [ ] Validate schema, attachments/media, keys, and rollback.
- [ ] Test corrupt, partial, old-version, and cross-platform backups.
- [x] Show a preflight summary and confirm destructive replacement (`SettingsBackupTab.qml`).

