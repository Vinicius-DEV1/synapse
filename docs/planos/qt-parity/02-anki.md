# 02 — Anki (Flashcards & Spaced Repetition)

> **Status**: ✅ Complete | **Complexity**: 🟠 High | **Priority**: P1
>
> Core deck management, basic study session, specialized card types (listening/speaking/cloze/typing), stats charts (activity heatmap, maturity breakdown, 7-day forecast), audio recording/playback, deck browser alternate views (List, Grid, Table), card batch selection & actions, card hover tooltips, card preview modal, help tabs, and AI assistant card generator.

---

## React Reference
- **Components**: `apps/web-react/src/components/anki/` (70 files)
- **Hooks**: `apps/web-react/src/components/anki/hooks/` (11 hooks)
- **Services**: `apps/web-react/src/services/fsrs.ts`, `apps/web-react/src/services/gemini/anki.ts`

## Qt Existing & Implemented
- **QML**: `apps/desktop-qt/qml/anki/`
  - Core Views: `AnkiView.qml`, `AnkiStudySession.qml`, `AnkiStudyCardCanvas.qml`, `AnkiCreateDeckModal.qml`, `AnkiCreateCardModal.qml`, `AnkiDeckBrowserModal.qml`, `AnkiDeckListSection.qml`, `AnkiDeckSettingsModal.qml`, `AnkiHeaderBar.qml`, `AnkiHelpDialog.qml`, `AnkiRatingDock.qml`, `AnkiStatsDashboard.qml`, `AnkiStatsDistributionCards.qml`, `AnkiStatsOverviewCards.qml`, `AnkiCompletionCard.qml`, `AnkiStudyShortcuts.qml`
  - Specialized Cards: `AnkiClozeCard.qml`, `AnkiTypingCard.qml`, `AnkiListeningCard.qml`, `AnkiSpeakingCard.qml`
  - Audio Components: `AnkiAudioPlayer.qml`, `AnkiAudioRecorder.qml`
  - Browser Alternate Views & Modals: `AnkiCardGridView.qml`, `AnkiCardTableView.qml`, `AnkiBatchActions.qml`, `AnkiCardPreviewModal.qml`, `AnkiCardTooltip.qml`
  - Analytics & Visualizations: `AnkiActivityHeatmap.qml`, `AnkiMaturityChart.qml`, `AnkiForecastChart.qml`
  - AI Assistant: `AnkiAIAssistantModal.qml`
- **Controller**: `apps/desktop-qt/src/controllers/anki/anki_controller.cpp`

---

## Feature Parity Table

| Feature | React Reference | Qt Status |
|---------|----------------|-----------|
| Deck list with card counts | `AnkiView.tsx`, `DeckListItem.tsx` | ✅ Done |
| Create deck modal | `CreateDeckModal.tsx` | ✅ Done |
| Create/edit card modal | `CardEditor.tsx` | ✅ Done |
| Deck settings panel | `DeckSettingsPanel.tsx` | ✅ Done |
| Deck browser (card list) | `DeckBrowser.tsx` | ✅ Done |
| Basic study session (reading cards) | `StudySession.tsx`, `study/ReadingCard.tsx` | ✅ Done |
| Study rating dock | `study/StudyRatingDock.tsx` | ✅ Done |
| Study top bar | `study/StudyTopBar.tsx` | ✅ Done |
| Session summary | `study/SessionSummary.tsx` | ✅ Done |
| Stats overview grid | `stats/StatsOverviewGrid.tsx` | ✅ Done |
| Stats distribution cards | `stats/RatingDistributionChart.tsx` | ✅ Done |
| Keyboard shortcuts | `StudySession.tsx` shortcuts | ✅ Done |
| Help dialog | `AnkiHelpModal.tsx` | ✅ Done |
| Completion card (end of session) | `study/SessionSummary.tsx` | ✅ Done |
| **Cloze card type** | `study/ClozeCard.tsx` | ✅ Done (`AnkiClozeCard.qml`) |
| **Listening card type** | `study/ListeningCard.tsx` | ✅ Done (`AnkiListeningCard.qml`) |
| **Speaking card type** | `study/SpeakingCard.tsx` | ✅ Done (`AnkiSpeakingCard.qml`) |
| **Typing card type** | `study/TypingCard.tsx` | ✅ Done (`AnkiTypingCard.qml`) |
| **Audio recorder** | `hooks/useAudioRecorder.ts`, `editor/AudioPreview.tsx` | ✅ Done (`AnkiAudioRecorder.qml`) |
| **Audio player** | `hooks/useAudioPlayer.ts` | ✅ Done (`AnkiAudioPlayer.qml`) |
| **Card grid view** | `browser/CardGridView.tsx` | ✅ Done (`AnkiCardGridView.qml`) |
| **Card list view** | `browser/CardListView.tsx` | ✅ Done (`AnkiDeckBrowserModal.qml`) |
| **Card table view** | `browser/CardTableView.tsx` | ✅ Done (`AnkiCardTableView.qml`) |
| **Card preview modal** | `browser/CardPreviewModal.tsx` | ✅ Done (`AnkiCardPreviewModal.qml`) |
| **Card hover tooltip** | `browser/CardHoverTooltip.tsx` | ✅ Done (`AnkiCardTooltip.qml`) |
| **Card batch selection & actions** | `hooks/useCardSelection.ts` | ✅ Done (`AnkiBatchActions.qml`) |
| **Activity heatmap** | `stats/ActivityHeatmap.tsx` | ✅ Done (`AnkiActivityHeatmap.qml`) |
| **Forecast bar chart** | `stats/ForecastBarChart.tsx` | ✅ Done (`AnkiForecastChart.qml`) |
| **Maturity breakdown chart** | `stats/MaturityPieChart.tsx` | ✅ Done (`AnkiMaturityChart.qml`) |
| **AI Assistant modal** | `AIAssistantModal.tsx` | ✅ Done (`AnkiAIAssistantModal.qml`) |
| **Help tabs (AI, FSRS, Shortcuts, etc.)** | `help/` (8 tab files) | ✅ Done (`AnkiHelpDialog.qml`) |

---

## Implementation Details

1. **Specialized Card Types**:
   - `AnkiClozeCard.qml`: parses `{{c1::answer}}` deletions, reveals answers upon click or typing, evaluates accuracy.
   - `AnkiTypingCard.qml`: provides real-time typing input and character diff comparing actual typed vs expected answer with green/red syntax highlighting.
   - `AnkiListeningCard.qml`: provides audio prompt playback with transcription input and validation.
   - `AnkiSpeakingCard.qml`: audio recording interface with timer, visualization, and playback for speech comparison.

2. **Deck Browser Alternates & Batch Actions**:
   - Integrated tab/switcher between List (0), Grid (1), and Table (2) views in `AnkiDeckBrowserModal.qml`.
   - `AnkiCardGridView.qml`: responsive grid cards with hover actions and batch selection.
   - `AnkiCardTableView.qml`: data table with sortable columns (Front, Back, Type, Reps, Actions).
   - `AnkiBatchActions.qml`: batch delete, batch reset schedule, and selection toggling.
   - `AnkiCardPreviewModal.qml`: preview modal with FSRS card stats (stability, difficulty, reps, interval).

3. **Analytics Dashboard Extensions**:
   - `AnkiActivityHeatmap.qml`: 52-week activity calendar heatmap with color-coded intensity cells.
   - `AnkiMaturityChart.qml`: stacked breakdown of New, Learning, Young, and Mature cards.
   - `AnkiForecastChart.qml`: 7-day review forecast with workload indicators.

4. **AI Flashcard Generator**:
   - `AnkiAIAssistantModal.qml`: interactive prompt generator creating structured flashcards with batch review, selective removal, and one-click import into current deck.
