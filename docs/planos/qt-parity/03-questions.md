# 03 — Questions (Quiz System)

> **Status**: ✅ Complete | **Complexity**: 🟠 High | **Priority**: P1
>
> Full battery/question CRUD, sequential quiz focus mode (`QuizSequentialFocusModal`), AI quiz generator (`QuizAIGenerationModal`), text/document question parser & importer (`QuizImportModal`), open-answer/discursiva questions with self-grading and expected criteria, attempt tracking with SQLite persistence, and error notebook review.

---

## React Reference
- **Components**: `apps/web-react/src/components/questions/` 
- **Editor quiz blocks**: `apps/web-react/src/components/editor-extensions/quiz/` (25+ files)
- **Services**: `apps/web-react/src/services/quiz/`, `apps/web-react/src/services/gemini/quiz-*.ts`

## Qt Existing & Implemented
- **QML**: `apps/desktop-qt/qml/questions/`
  - Core Views: `ZenQuizView.qml`, `QuizExplorerView.qml`, `QuizBatteriesGrid.qml`, `QuizKpiCards.qml`, `QuizHelpDialog.qml`, `QuizSessionNotice.qml`, `QuizActionBanners.qml`
  - Sequential Mode: `QuizSequentialFocusModal.qml`, `QuizSequentialHeader.qml`, `QuizSequentialCard.qml`, `QuizSummaryView.qml`
  - Battery & Question Modals: `CreateBatteryModal.qml`, `CreateQuestionModal.qml` (Multiple-choice + Discursiva/Open-answer), `BatteryQuestionsModal.qml`
  - AI & Import: `QuizAIGenerationModal.qml`, `QuizImportModal.qml`
  - Session & Simulations: `QuizCustomSimulationDialog.qml`, `QuizZenSession.qml`, `QuizResultsModal.qml`, `QuizExplorerOverlays.qml`
- **Controller**: `apps/desktop-qt/src/controllers/questions/quiz_controller.cpp`

---

## Feature Parity Table

| Feature | React Reference | Qt Status |
|---------|----------------|-----------|
| Battery list with card counts | `QuizView.tsx` | ✅ Done |
| Create battery modal | `QuizCreateBatteryModal.tsx` | ✅ Done |
| Create/edit question modal | `QuizCreateQuestionModal.tsx` | ✅ Done |
| Battery questions preview & management | `BatteryQuestionsPreview.tsx` | ✅ Done |
| Help dialog | `QuizHelpDialog.qml` | ✅ Done |
| **Sequential quiz focus modal** | `editor-extensions/quiz/components/sequential/` | ✅ Done (`QuizSequentialFocusModal.qml`) |
| **Quiz attempt tracking** | `editor-extensions/quiz/hooks/useQuestionBlockAttempt.ts` | ✅ Done (`recordQuizAttempt`) |
| **Quiz AI generation** | `editor-extensions/quiz/hooks/useQuizAiChat.ts` | ✅ Done (`QuizAIGenerationModal.qml`) |
| **Quiz import from documents / text** | `editor-extensions/quiz/hooks/useQuizImportModal.ts` | ✅ Done (`QuizImportModal.qml`) |
| **Open-answer / Discursiva questions** | per parity tracker | ✅ Done (`CreateQuestionModal.qml` & `QuizSequentialCard.qml`) |
| **Quiz summary view** | `QuizSummaryView.tsx` | ✅ Done (`QuizSummaryView.qml`) |
| **Custom simulation builder** | `QuizCustomSimulationDialog.tsx` | ✅ Done (`QuizCustomSimulationDialog.qml`) |
| **Error notebook** | `useErrorNotebook.ts` | ✅ Done (`getErrorNotebookQuestions`) |

---

## Implementation Details

1. **Sequential Quiz Focus Mode**:
   - `QuizSequentialFocusModal.qml`: Fullscreen Zen modal overlay with timer, question counter, progress bar, and instant feedback.
   - `QuizSequentialHeader.qml`: Header bar with elapsed time, question navigation indicator, and exit escape.
   - `QuizSequentialCard.qml`: Supports both standard 4-option multiple-choice and open-answer (discursiva) prompts, keyboard shortcuts (1/2/3/4/Space/Enter), and real-time feedback with green/red indication.
   - `QuizSummaryView.qml`: Result dashboard displaying score, accuracy percentage, time elapsed, and per-question correctness review list.

2. **AI Question Generator**:
   - `QuizAIGenerationModal.qml`: Topic input, count selector (5/10/15), type selector (Multiple Choice, Discursiva, Mixed), review list, individual removal, and batch import.

3. **Document / Text Parser & Importer**:
   - `QuizImportModal.qml`: Parses raw or Markdown numbered questions with options (`A) ... D) ...`) and Gabarito lines, previews detected items, and imports directly to the selected battery.

4. **Open-Answer / Discursiva Support**:
   - `CreateQuestionModal.qml`: Extended with a question type selector (Múltipla Escolha vs Discursiva/Aberta). For discursiva, options are optional and tags automatically include `discursiva`.
