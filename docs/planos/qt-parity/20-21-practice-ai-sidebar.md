# 20 — Practice (AI Voice Conversations) & 21 — AI Sidebar

> **Status**: ✅ Complete | **Complexity**: 🟠 High | **Priority**: P3
>
> Full AI voice conversation system, interview simulation with audio streaming and dynamic visualizer, structured evaluation and feedback, microphone test widget, and global context-aware AI Sidebar drawer with markdown rendering and page mentions.

---

## React Reference
- **Components**: `apps/web-react/src/components/practice/` (28 files)
- **Chat subsystem**: `practice/chat/` (16 files + hooks + services)
- **AI Sidebar**: `apps/web-react/src/components/ai-sidebar/` (6 files)

## Qt Existing & Implemented
- **QML Practice**: `apps/desktop-qt/qml/practice/`
  - Core Views: `PracticeView.qml`, `NewPracticeSessionModal.qml`, `PracticeHelpDialog.qml`
  - Voice Call & Audio: `PracticeCallBar.qml`, `PracticeAudioVisualizer.qml`, `PracticeInterviewAvatar.qml`, `PracticeMicTest.qml`
  - Interview Simulation & Feedback: `PracticeInterviewSetupModal.qml`, `PracticeInterviewFeedbackModal.qml`
- **QML AI Sidebar**: `apps/desktop-qt/qml/ai-sidebar/`
  - `AiSidebarPanel.qml`: Resizable right drawer with chat transcript, quick suggestion actions, and streaming response
  - `AiChatMessageItem.qml`: Styled chat bubble with markdown/rich text rendering and role indicators
  - `AiPageMentionMenu.qml`: Autocomplete popup for `@` page mentions
  - `AiChatSessionList.qml`: Chat session selector, creation, and deletion
- **Controller**: `apps/desktop-qt/src/controllers/practice/practice_controller.cpp`

---

## Feature Parity Table

| Feature | React Reference | Qt Status |
|---------|----------------|-----------|
| Practice view (session list & chat) | `PracticeView.tsx` | ✅ Done |
| Help dialog | `PracticeHelpDialog.tsx` | ✅ Done |
| **Practice chat conversation UI** | `PracticeChat.tsx` | ✅ Done (`PracticeView.qml`) |
| **Call bar (active call controls)** | `chat/PracticeCallBar.tsx` | ✅ Done (`PracticeCallBar.qml`) |
| **Audio visualizer** | `chat/hooks/useAudioVisualizer.ts` | ✅ Done (`PracticeAudioVisualizer.qml`) |
| **Interview avatar** | `chat/avatar/InterviewAvatar.tsx` | ✅ Done (`PracticeInterviewAvatar.qml`) |
| **Interview setup modal** | `modals/InterviewSetupModal.tsx` | ✅ Done (`PracticeInterviewSetupModal.qml`) |
| **Interview feedback modal** | `chat/InterviewFeedbackModal.tsx` | ✅ Done (`PracticeInterviewFeedbackModal.qml`) |
| **Mic test widget** | `chat/MicTestWidget.tsx` | ✅ Done (`PracticeMicTest.qml`) |
| **Memory drawer** | `chat/MemoryDrawer.tsx` | ✅ Done (`PracticeView.qml`) |
| **New practice session modal** | `modals/NewPracticeSessionModal.tsx` | ✅ Done (`NewPracticeSessionModal.qml`) |
| **AI chat sidebar panel** | `ai-sidebar/AiSidebar.tsx` | ✅ Done (`AiSidebarPanel.qml`) |
| **Chat markdown rendering** | `ai-sidebar/AiChatMarkdown.tsx` | ✅ Done (`AiChatMessageItem.qml`) |
| **Chat session list** | `ai-sidebar/AiChatSessionList.tsx` | ✅ Done (`AiChatSessionList.qml`) |
| **Page mentions (@)** | `ai-sidebar/usePageMentions.ts` | ✅ Done (`AiPageMentionMenu.qml`) |
| **Sidebar resize** | `ai-sidebar/useAiSidebarResize.ts` | ✅ Done (`AiSidebarPanel.qml`) |

---

## Implementation Details

1. **Voice Conversation & Call System**:
   - `PracticeCallBar.qml`: Displays live call status, elapsed duration, animated `PracticeAudioVisualizer`, mute microphone toggle, speaker mute, and end call action.
   - `PracticeInterviewAvatar.qml`: Animated pulsing avatar that visualizes the AI speaking/listening states with role badge.
   - `PracticeMicTest.qml`: Dialog with real-time level meter bar to test microphone input sensitivity.

2. **Interview Simulation & Structured Evaluation**:
   - `PracticeInterviewSetupModal.qml`: Configures role (Technical, Behavioral, Language, Free), difficulty, language, and context notes.
   - `PracticeInterviewFeedbackModal.qml`: Post-call evaluation modal calculating performance score, listing demonstrated strengths, and providing actionable improvement points.

3. **Context-Aware AI Sidebar**:
   - `AiSidebarPanel.qml`: Resizable right drawer with drag handle, session header, message list, typing indicators, quick prompt suggestions, and send input.
   - `AiPageMentionMenu.qml`: Filtered popup when typing `@` to inject note pages into the prompt context.
   - `AiChatSessionList.qml`: Manages multiple AI conversation threads with creation and deletion.
