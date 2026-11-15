# 13 — Culture (Media Tracking)

> **Status**: ✅ Complete | **Complexity**: 🟠 High | **Priority**: P2
>
> Full tracking for animes, series, and movies with SQLite persistence: media grid with category and status filters, full details modal (`CultureDetailsModal.qml`), episode checklist & steppers (`CultureEpisodesModal.qml`), safe deletion confirmation modal (`CultureDeleteModal.qml`), annual watching/reading goal modal (`CultureGoalModal.qml`), external media lookup (`CultureMediaSearchModal.qml`), and categorized guide (`CultureHelpDialog.qml`).

---

## React Reference
- **Components**: `apps/web-react/src/components/culture/` (25 files)
- **Hooks**: `useCulture.ts`, `useCultureEpisodes.ts`, `useCultureMediaSearch.ts`, `useCultureMetadataRefresh.ts`
- **Services**: `apps/web-react/src/services/culture/` (16 files)

## Qt Existing & Implemented
- **QML**: `apps/desktop-qt/qml/culture/`
  - Core Views: `CultureView.qml`, `CultureHeader.qml`, `CultureMediaGrid.qml`, `CreateCultureModal.qml`, `CultureDetailsModal.qml`, `CultureEpisodesModal.qml`, `CultureHelpDialog.qml`
  - Modals & Integrations: `CultureDeleteModal.qml`, `CultureGoalModal.qml`, `CultureMediaSearchModal.qml`
- **Controller**: `apps/desktop-qt/src/controllers/culture/culture_controller.cpp`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Culture media grid | `CultureView.tsx` | ✅ Done |
| Create/add media modal | `CultureAddModal.tsx` | ✅ Done |
| Media details modal | `CultureViewModal.tsx` | ✅ Done |
| Episodes modal (for series) | `CultureEpisodeModal.tsx` | ✅ Done |
| Help dialog | `CultureHelpModal.tsx` | ✅ Done |
| **Delete media confirmation modal** | `CultureDeleteModal.tsx` | ✅ Done (`CultureDeleteModal.qml`) |
| **Annual goal modal** | `CultureGoalModal.tsx` | ✅ Done (`CultureGoalModal.qml`) |
| **Media search via external APIs** | `hooks/useCultureMediaSearch.ts` | ✅ Done (`CultureMediaSearchModal.qml`) |
| **Type and status filter pills** | `ui/CultureStatusFilter.tsx` | ✅ Done (`CultureMediaGrid.qml`) |
| **Episode bulk creation & watched toggle** | `episodes/` | ✅ Done (`CultureEpisodesModal.qml`) |

---

## Implementation Details

1. **Delete Confirmation**:
   - `CultureDeleteModal.qml`: Complies with AGENTS.md rules prohibiting unconfirmed deletions, displaying media title, type, and status warning.

2. **Annual Culture Goals**:
   - `CultureGoalModal.qml`: Configures target count of completed media per year, tracks progress %, and displays visual completion bar.

3. **External Media Search & Import**:
   - `CultureMediaSearchModal.qml`: Allows searching for animes, movies, and series with auto-filling of title, synopsis, year, and episode counts directly into `CreateCultureModal`.
